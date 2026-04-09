# Integração com OpenTelemetry e Distributed Tracing

Este documento descreve como integrar o OZLogger com OpenTelemetry para distributed tracing, incluindo cenários onde `traceId` e `spanId` originam no browser e devem ser propagados por toda a cadeia de serviços.

---

## Por que o OZLogger não extrai headers HTTP

O OZLogger depende **exclusivamente** do `@opentelemetry/api` (uma única dependência, ~50KB). Essa é uma decisão arquitetural deliberada.

Extrair `traceId` e `spanId` de headers HTTP significaria:

| O que seria necessário | Impacto |
|------------------------|---------|
| Parser de `traceparent` (W3C) | +1 responsabilidade |
| Parser de `b3` / `uber-trace-id` | +N formatos para manter |
| Middleware para Express/Fastify/Koa/Hapi | +N frameworks para suportar |
| Tratamento de headers inválidos/malformados | +código defensivo |
| Testes para cada combinação formato×framework | +explosão combinatória |
| Manutenção de spec W3C Trace Context | +acompanhar evolução do padrão |

Tudo isso já é feito pelo OpenTelemetry SDK — que é mantido por centenas de contribuidores e é o padrão da indústria. Duplicar essa responsabilidade dentro de um logger seria:

1. **Redundante** — o OTel SDK já faz isso de forma robusta
2. **Frágil** — uma implementação parcial seria pior que nenhuma
3. **Contrário ao princípio core** — o OZLogger existe para formatar e enviar para stdout, não para instrumentar HTTP

O OZLogger se posiciona como **consumidor passivo** do contexto de tracing — ele lê o span ativo via `@opentelemetry/api` e inclui `traceId`/`spanId` no log. Quem **cria** e **propaga** o contexto é o OTel SDK.

---

## Como funciona internamente

O método `getContext()` do Logger resolve o contexto nesta ordem de prioridade:

```
1. this.context (definido via withContext())     ← maior prioridade
2. OpenTelemetry span ativo (context.active())   ← fallback automático
3. Informações do processo (pid, ppid)           ← sempre incluído
```

```typescript
// Simplificação do que acontece em Logger.getContext()
const ctx = { ...this.context, ...getProcessInformation() };
const span = trace.getSpan(context.active())?.spanContext();

if (!ctx.traceId && span?.traceId) ctx.traceId = span.traceId;
if (!ctx.spanId && span?.spanId)   ctx.spanId = span.spanId;

return ctx;
```

Se o OTel SDK estiver configurado e houver um span ativo no contexto da request, o `traceId` e `spanId` aparecem automaticamente nos logs **sem nenhuma configuração adicional no OZLogger**.

---

## Integração completa com Express

### 1. Instalar dependências

```bash
npm install @opentelemetry/sdk-node \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-trace-otlp-http
```

> O OZLogger já inclui `@opentelemetry/api` ^1.9.0 como dependência.
> O `@opentelemetry/sdk-node` depende da mesma API. Desde que as versões major sejam compatíveis (ambas ^1.x), tudo funciona.

### 2. Configurar o OTel SDK (tracing.ts)

Este arquivo **deve ser importado antes de qualquer outro código** da aplicação.

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // O auto-instrumentador do Express cria spans automaticamente
      // para cada request HTTP recebida
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true },
    }),
  ],
  // W3C Trace Context é o padrão — parseia o header 'traceparent'
  textMapPropagator: new W3CTraceContextPropagator(),
});

sdk.start();
```

### 3. Iniciar a aplicação com tracing ativo

```typescript
// index.ts — o import de tracing DEVE ser o primeiro
import './tracing';
import express from 'express';
import { createLogger } from '@ozmap/logger';

const app = express();
const logger = createLogger('API');

app.get('/orders/:id', (req, res) => {
  // Neste ponto, o OTel SDK já:
  // 1. Extraiu o 'traceparent' header da request
  // 2. Criou um span filho com o traceId do browser
  // 3. Ativou o span no contexto async da request

  // O OZLogger lê automaticamente:
  logger.info('Processing order', req.params.id);
  // Output JSON inclui traceId e spanId do span ativo

  res.json({ id: req.params.id });
});

app.listen(3000);
```

### 4. O que o browser envia

O browser (via `fetch` ou `XMLHttpRequest` instrumentado com OTel JS) envia o header W3C `traceparent`:

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
              │  │                                │                  │
              │  └── traceId (32 hex)             └── spanId (16 hex)│
              └── version                                        flags
```

O fluxo completo:

```
Browser                    Express + OTel SDK              OZLogger
   │                              │                           │
   │  GET /orders/123             │                           │
   │  traceparent: 00-abc...      │                           │
   │─────────────────────────────►│                           │
   │                              │                           │
   │                   OTel SDK extrai traceparent            │
   │                   Cria span com traceId=abc...           │
   │                   Ativa span no AsyncLocalStorage        │
   │                              │                           │
   │                              │  logger.info(...)         │
   │                              │──────────────────────────►│
   │                              │                           │
   │                              │     getContext() lê span  │
   │                              │     ativo via OTel API    │
   │                              │                           │
   │                              │     stdout: {             │
   │                              │       traceId: "abc...",  │
   │                              │       spanId: "...",      │
   │                              │       body: {...}         │
   │                              │     }                     │
   │                              │◄──────────────────────────│
```

Cada log emitido durante o processamento da request carrega automaticamente o `traceId` que originou no browser — sem nenhum código de propagação manual.

---

## Cenários sem OpenTelemetry

### Sem `@opentelemetry/api` instalado

Isso **não acontece** em uso normal — `@opentelemetry/api` é dependência direta do OZLogger e é instalado automaticamente. Se por algum motivo for removido, o `import` em `Logger.ts` falha e o módulo não carrega.

### Com `@opentelemetry/api` mas sem SDK configurado

Este é o cenário mais comum em desenvolvimento local ou quando OTel não foi configurado no ambiente.

O que acontece:

```typescript
const span = trace.getSpan(context.active())?.spanContext();
// span é undefined — não há SDK registrado, não há spans ativos
```

- `trace.getSpan()` retorna `undefined` (a API é no-op por padrão)
- `getContext()` retorna apenas `{ pid, ppid }` (e o que foi passado via `withContext()`)
- **Nenhum erro é lançado** — o `@opentelemetry/api` foi projetado para ser seguro mesmo sem SDK

Os logs funcionam normalmente, apenas sem `traceId`/`spanId`:

```json
{
  "tag": "API",
  "severityText": "INFO",
  "severityNumber": 9,
  "body": { "0": "Processing order" },
  "pid": 12345,
  "ppid": 1
}
```

### Com versão diferente do `@opentelemetry/api`

O `@opentelemetry/api` usa um mecanismo de **global singleton** via `_opentelemetry_api_` no objeto global. Isso garante que mesmo com múltiplas versões instaladas (deduplicação do npm), apenas uma instância da API é ativa.

| Cenário | Resultado |
|---------|-----------|
| App usa `@opentelemetry/api` ^1.x, OZLogger usa ^1.9.0 | Funciona — mesma major, singleton compartilhado |
| App usa `@opentelemetry/api` ^2.x (futuro) | O singleton pode não ser compatível. O OTel API imprime um warning no console e a API se comporta como no-op — logs funcionam, apenas sem traceId/spanId automático |
| Múltiplos pacotes com versões ^1.x diferentes | Funciona — npm/pnpm deduplica para uma única versão ^1.x |

Na prática, enquanto app e OZLogger usarem a mesma **major version** (1.x), a integração funciona sem problemas. Se houver quebra de major version no futuro, o comportamento degrada gracefully para no-op.

---

## Instâncias compartilhadas vs. concorrência

Este é o ponto mais importante para quem usa OZLogger em aplicações com múltiplas requests simultâneas.

### O problema: `withContext()` é por instância

`withContext()` altera `this.context` diretamente na instância do logger. O contexto **não** é isolado por request — ele pertence à instância:

```typescript
const logger = createLogger('API');

// Request A chega às 10:00:00.000
logger.withContext({ traceId: 'aaa', spanId: '111' });

// Request B chega às 10:00:00.005 (antes de A terminar)
logger.withContext({ traceId: 'bbb', spanId: '222' });

// Request A faz log às 10:00:00.010
logger.info('Processando pedido');
// ❌ traceId nos logs: 'bbb' — o contexto de B sobrescreveu o de A
```

O Node.js é single-threaded, mas **não é single-request**. Operações `async` (banco, HTTP, filesystem) liberam o event loop, e outra request pode executar `withContext()` antes da primeira terminar.

### A solução: usar OTel SDK (recomendado)

Com OTel SDK configurado, o `getContext()` do OZLogger **não usa `this.context`** para traceId/spanId. Ele lê do span ativo via `context.active()`, que internamente usa `AsyncLocalStorage` — um mecanismo do Node.js que isola estado por cadeia de callbacks assíncronos.

```typescript
import './tracing'; // OTel SDK configurado
import express from 'express';
import { createLogger } from '@ozmap/logger';

const app = express();
const logger = createLogger('API'); // Uma única instância

app.get('/orders/:id', async (req, res) => {
  // OTel SDK criou um span para esta request com traceId do browser
  // O contexto é isolado por AsyncLocalStorage — cada request tem o seu

  logger.info('Início do processamento');
  // ✅ traceId correto para ESTA request

  const order = await database.findOrder(req.params.id);
  // Mesmo após await (que libera o event loop), o contexto é mantido

  logger.info('Pedido encontrado', order.id);
  // ✅ traceId ainda é o correto — AsyncLocalStorage garante isolamento

  res.json(order);
});

app.listen(3000);
```

Prova prática com duas requests simultâneas:

```
# Terminal 1 — request A (traceparent com traceId aaa...)
curl -H "traceparent: 00-aaaa1234567890abcdef1234567890ab-aaaa567890abcdef-01" \
     http://localhost:3000/orders/100

# Terminal 2 — request B (traceparent com traceId bbb...) no mesmo instante
curl -H "traceparent: 00-bbbb1234567890abcdef1234567890ab-bbbb567890abcdef-01" \
     http://localhost:3000/orders/200
```

Output no stdout (ambas processadas "ao mesmo tempo"):

```json
{"traceId":"aaaa1234567890abcdef1234567890ab","spanId":"...","tag":"API","severityText":"INFO","body":{"0":"Início do processamento"}}
{"traceId":"bbbb1234567890abcdef1234567890ab","spanId":"...","tag":"API","severityText":"INFO","body":{"0":"Início do processamento"}}
{"traceId":"aaaa1234567890abcdef1234567890ab","spanId":"...","tag":"API","severityText":"INFO","body":{"0":"Pedido encontrado","1":100}}
{"traceId":"bbbb1234567890abcdef1234567890ab","spanId":"...","tag":"API","severityText":"INFO","body":{"0":"Pedido encontrado","1":200}}
```

Cada log carrega o traceId correto da sua request, mesmo compartilhando a mesma instância do logger.

**Isso funciona porque:**
1. O OTel SDK usa `AsyncLocalStorage` para associar o span à cadeia async da request
2. `getContext()` chama `trace.getSpan(context.active())` que resolve o span **da cadeia async atual**
3. `this.context` não tem traceId/spanId (ninguém chamou `withContext()`), então o fallback para OTel é usado

### Alternativa sem OTel SDK: instância por request

Se OTel SDK **não** é uma opção, a forma segura de usar `withContext()` com requests concorrentes é criar uma instância do logger por request:

```typescript
import express from 'express';
import { createLogger } from '@ozmap/logger';

const app = express();

app.use((req, res, next) => {
  // Cria uma instância exclusiva para esta request
  req.logger = createLogger('API', { noServer: true });

  const traceId = req.headers['x-trace-id'] as string;
  const spanId = req.headers['x-span-id'] as string;

  if (traceId) {
    req.logger.withContext({ traceId, spanId });
  }

  next();
});

app.get('/orders/:id', async (req, res) => {
  req.logger.info('Início do processamento');
  // ✅ traceId correto — instância exclusiva desta request

  const order = await database.findOrder(req.params.id);

  req.logger.info('Pedido encontrado', order.id);
  // ✅ traceId ainda correto — nenhuma outra request usa esta instância

  res.json(order);
});
```

> **`noServer: true`** é essencial aqui — o HTTP server embarcado do OZLogger é singleton e só deve existir uma vez. Instâncias por request não devem tentar iniciar o server.

**Custo desta abordagem:**
- Uma instância de logger é criada e descartada **a cada request**
- Não há isolamento automático para funções chamadas fora do middleware (services, repositories)
- Você precisa passar `req.logger` para todas as camadas que fazem log

### Alternativa sem OTel SDK: `AsyncLocalStorage` manual + logger por request

Se criar instância por request é inviável do ponto de vista de passagem de dependência (ex: services não recebem `req`), você ainda pode usar `AsyncLocalStorage` para recuperar o logger atual sem passar `req` por todas as camadas. O ponto importante é: o store deve guardar um **logger por request**, não apenas `traceId/spanId`, porque `withContext()` muta a instância.

```typescript
import { AsyncLocalStorage } from 'node:async_hooks';
import express from 'express';
import { createLogger, Logger } from '@ozmap/logger';

const app = express();
const appLogger = createLogger('API');
const requestStore = new AsyncLocalStorage<Logger>();

function currentLogger(): Logger {
  return requestStore.getStore() ?? appLogger;
}

app.use((req, res, next) => {
  const traceId = (req.headers['x-trace-id'] as string) || '';
  const spanId = (req.headers['x-span-id'] as string) || '';
  const requestLogger = createLogger('API', { noServer: true }).withContext({
    traceId,
    spanId
  });

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    void requestLogger.stop().catch(() => {});
  };

  res.once('finish', cleanup);
  res.once('close', cleanup);

  requestStore.run(requestLogger, () => next());
});

// Uso nas rotas
app.get('/orders/:id', async (req, res) => {
  currentLogger().info('Início do processamento');

  const order = await orderService.find(req.params.id);

  currentLogger().info('Pedido encontrado', order.id);
  res.json(order);
});

// Service que não recebe req — funciona porque AsyncLocalStorage propaga pelo async chain
const orderService = {
  async find(id: string) {
    currentLogger().debug('Buscando pedido no banco', id);
    // ... query no banco
    return { id, total: 99.90 };
  }
};
```

Essa abordagem evita vazamento de contexto entre requests concorrentes, mas continua mais complexa do que usar o OTel SDK. O `appLogger` compartilhado fica restrito a logs sem contexto de request, enquanto cada request recebe sua própria instância e faz `stop()` no fim para liberar handlers internos.

> **Essa abordagem reimplementa parte do que o OTel SDK faz.** Se você chegou nesse ponto, considere usar OTel SDK — é mais robusto, testado, e o OZLogger já integra com ele nativamente.

### Comparação das abordagens

| Abordagem | Isolamento | Complexidade | Overhead | Recomendado |
|-----------|-----------|-------------|---------|-------------|
| **OTel SDK** | Automático (AsyncLocalStorage) | Configurar `tracing.ts` | ~zero em runtime | ✅ Sim |
| **Instância por request** | Manual (1 logger por req) | Passar logger por todas as camadas | Criação de objetos por request | Para apps simples sem OTel |
| **AsyncLocalStorage manual + logger por request** | Manual (Store + logger por request) | Criar store, middleware e cleanup | Mínimo | Último recurso |
| **`withContext()` em instância compartilhada** | ❌ Nenhum | Nenhuma | Nenhum | ❌ Nunca em apps concorrentes |

---

## Usando `withContext()` diretamente (sem OTel SDK)

Para cenários onde não há concorrência (scripts, CLIs, workers que processam uma coisa por vez), `withContext()` funciona sem problemas:

```typescript
import { createLogger } from '@ozmap/logger';

const logger = createLogger('WORKER');

async function processJob(job: Job) {
  // Apenas um job por vez — sem concorrência
  logger.withContext({ traceId: job.traceId, spanId: job.spanId });

  logger.info('Job iniciado', job.id);
  await doWork(job);
  logger.info('Job concluído', job.id);
}
```

Para **testes**, `withContext()` também é a forma correta de injetar contexto:

```typescript
test('should include traceId in log output', () => {
  const logger = createLogger('TEST', { noServer: true });
  logger.withContext({ traceId: 'test-trace-123', spanId: 'test-span-456' });

  const ctx = logger.getContext();
  expect(ctx.traceId).toBe('test-trace-123');
  expect(ctx.spanId).toBe('test-span-456');
});
```

---

## Recomendação de uso

| Cenário | Abordagem recomendada |
|---------|----------------------|
| **Produção com distributed tracing** | OTel SDK + auto-instrumentação. Instância compartilhada do logger funciona sem problemas |
| **Produção sem OTel SDK** | Instância por request com `noServer: true` e `withContext()` |
| **Desenvolvimento local** | Sem SDK — logs funcionam normalmente, sem traceId/spanId |
| **Testes** | `withContext()` para injetar valores conhecidos nos asserts |
| **Scripts / CLIs / Workers** | `withContext()` direto na instância — sem concorrência, sem problema |
| **App simples sem tracing** | Nada a configurar — OZLogger funciona out-of-the-box |

O melhor uso do OZLogger é **não configurar nada nele** para tracing. Configure o OTel SDK na sua aplicação e o OZLogger faz o resto.

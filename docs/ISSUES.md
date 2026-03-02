# Problemas Conhecidos - OZLogger

Este documento lista os problemas conhecidos do módulo OZLogger, suas causas, impactos e workarounds disponíveis.

---

## Sumário

- [Problemas Críticos](#problemas-críticos)
- [Problemas Moderados](#problemas-moderados)
- [Limitações Conhecidas](#limitações-conhecidas)
- [Problemas Resolvidos](#problemas-resolvidos)

---

## Problemas Críticos

### 1. Conflito de Porta HTTP em Testes

**Severidade:** 🔴 Alta

**Descrição:** Quando múltiplos testes criam instâncias do logger, o servidor HTTP tenta usar a mesma porta (9898), causando erro `EADDRINUSE`.

**Sintoma:**
```
Error: listen EADDRINUSE: address already in use :::9898
```

**Causa:**
O servidor HTTP é iniciado automaticamente no construtor do Logger, e o Jest pode executar testes em paralelo.

**Workaround:**
```typescript
// Opção 1: Desabilitar servidor via variável de ambiente
process.env.OZLOGGER_HTTP = 'false';

// Opção 2: Usar opção noServer
const logger = createLogger('test', { noServer: true });

// Opção 3: Usar beforeAll/afterAll para gerenciar lifecycle
beforeAll(async () => {
    logger = createLogger('test');
    await new Promise(r => setTimeout(r, 1500)); // Aguardar servidor
});

afterAll(async () => {
    await logger.stop();
});
```

**Status:** 🟡 Workaround disponível

**Issue relacionada:** N/A

---

### 2. Timer ID Duplicado Lança Exceção

**Severidade:** 🔴 Alta

**Descrição:** Chamar `logger.time(id)` com um ID já em uso lança uma exceção não tratada.

**Sintoma:**
```
Error: Identifier test-timer is in use
```

**Causa:**
O método `time()` verifica se o ID já existe no Map de timers e lança erro se existir.

**Código problemático:**
```typescript
// lib/Logger.ts
public time(id: string): Logger {
    if (this.timers.has(id)) throw new Error(`Identifier ${id} is in use`);
    // ...
}
```

**Workaround:**
```typescript
// Opção 1: Usar IDs únicos
logger.time(`operation-${Date.now()}`);

// Opção 2: Verificar antes de usar
try {
    logger.time('my-timer');
} catch (e) {
    // Timer já existe, ignorar ou tratar
}

// Opção 3: Gerar UUID
import { randomUUID } from 'crypto';
logger.time(randomUUID());
```

**Solução proposta:**
```typescript
// Substituir exceção por warning ou sobrescrever silenciosamente
public time(id: string): Logger {
    if (this.timers.has(id)) {
        this.warn(`Timer ${id} already exists, overwriting`);
    }
    this.timers.set(id, Date.now());
    return this;
}
```

**Status:** 🔴 Não resolvido

---

### 3. Memory Leak em Timers Não Finalizados

**Severidade:** 🟡 Média-Alta

**Descrição:** Timers iniciados com `time()` mas nunca finalizados com `timeEnd()` permanecem no Map indefinidamente.

**Causa:**
Não há mecanismo de expiração ou limpeza automática de timers.

**Impacto:**
Em aplicações de longa execução com muitos timers não finalizados, pode haver consumo excessivo de memória.

**Workaround:**
```typescript
// Implementar limpeza periódica manual
setInterval(() => {
    // Limpar timers antigos (>5 minutos)
    const now = Date.now();
    for (const [id, start] of logger['timers']) {
        if (now - start > 5 * 60 * 1000) {
            logger['timers'].delete(id);
            logger.warn(`Timer ${id} expirado e removido`);
        }
    }
}, 60000);
```

**Solução proposta:**
Implementar TTL configurável para timers ou limpeza automática.

**Status:** 🔴 Não resolvido

---

### 4. Aplicação Não Termina (Processo Fica Pendurado)

**Severidade:** 🔴 Alta

**Descrição:** Quando a aplicação termina sua execução, o processo Node.js permanece ativo indefinidamente devido ao servidor HTTP e/ou event listeners não serem liberados automaticamente.

**Sintoma:**
```bash
$ node app.js
# Aplicação executa normalmente...
# Processo não termina, fica "pendurado"
# Ctrl+C necessário para encerrar
```

**Causa:**
O Logger inicia um servidor HTTP que mantém o event loop ativo. Além disso, event listeners registrados via `registerEvent()` também podem manter referências ativas.

**Código problemático:**
```typescript
// lib/Logger.ts - Servidor HTTP mantém processo ativo
public constructor(opts) {
    // ...
    if (!opts.noServer) this.server = setupLogServer.apply(this, host());
    // Servidor HTTP nunca é fechado automaticamente
}

// lib/util/Events.ts - Listeners mantêm referências
export function registerEvent(context, event, handler) {
    process.on('message', (data) => { /* ... */ });
    // Listener nunca é removido
}
```

**Impacto:**
- Scripts CLI não terminam
- Testes ficam pendurados (Jest reporta "open handles")
- Graceful shutdown não funciona corretamente
- Containers Docker não param com `docker stop`

**Workaround:**
```typescript
// Opção 1: Chamar stop() explicitamente antes de encerrar
const logger = createLogger('App');

// ... uso do logger ...

// Antes de encerrar a aplicação
await logger.stop();
process.exit(0);

// Opção 2: Usar noServer para scripts curtos
const logger = createLogger('Script', { noServer: true });

// Opção 3: Registrar handler de encerramento
const logger = createLogger('App');

process.on('SIGINT', async () => {
    await logger.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await logger.stop();
    process.exit(0);
});

// Opção 4: Para testes Jest
afterAll(async () => {
    await logger.stop();
});
```

**Solução proposta:**
```typescript
// 1. Usar server.unref() para não bloquear o event loop
export function setupLogServer(port, address) {
    const server = http.createServer(/* ... */);
    server.unref(); // Permite que o processo termine
    return server;
}

// 2. Implementar cleanup automático via FinalizationRegistry
// 3. Adicionar opção para auto-cleanup quando event loop estiver vazio
// 4. Documentar melhor a necessidade de chamar stop()
```

**Detecção:**
```bash
# Usar why-is-node-running para diagnosticar
npm install -g why-is-node-running

# No código
import whyIsNodeRunning from 'why-is-node-running';
setTimeout(() => whyIsNodeRunning(), 5000);
```

**Status:** 🔴 Não resolvido - Requer mudança de comportamento

**Análise detalhada:** [ANALYSIS-PROCESS-HANG.md](./ANALYSIS-PROCESS-HANG.md)

**Issue relacionada:** Aguardando criação

---

## Problemas Moderados

### 5. Servidor HTTP Não Inicia em Workers

**Severidade:** 🟡 Média

**Descrição:** Em modo cluster, o servidor HTTP só é iniciado no processo primário. Workers não têm servidor próprio.

**Comportamento esperado:** Correto - evita conflito de portas

**Problema:** A comunicação entre primary e workers depende de `process.send()`, que pode falhar silenciosamente.

**Causa:**
```typescript
// lib/http/server.ts
if (cluster.isWorker) return; // Worker não inicia servidor
```

**Impacto:**
- Workers dependem do primary para receber comandos
- Se primary falhar, workers não podem ser reconfigurados

**Workaround:**
Monitorar health do processo primary e reiniciar cluster se necessário.

**Status:** 🟡 Comportamento intencional, mas com limitações

---

### 6. Colorização Não Funciona em Alguns Terminais

**Severidade:** 🟢 Baixa-Média

**Descrição:** Códigos ANSI de cor podem não ser interpretados corretamente em alguns terminais ou quando output é redirecionado.

**Sintoma:**
```
[32m[INFO] MeuApp Mensagem[0m
```

**Causa:**
Verificação de suporte a cores é simplificada (apenas verifica variável de ambiente).

**Workaround:**
```bash
# Desabilitar cores explicitamente
OZLOGGER_COLORS=false node app.js

# Ou usar | cat para forçar modo pipe
node app.js 2>&1 | cat
```

**Solução proposta:**
Usar biblioteca como `supports-color` para detecção automática.

**Status:** 🟡 Workaround disponível

---

### 7. Campos Deprecados Inflam Saída JSON

**Severidade:** 🟢 Baixa

**Descrição:** Os campos `data` e `level` são duplicados com `body` e `severityText` na saída JSON para retrocompatibilidade.

**Impacto:**
- Aumento de ~20% no tamanho do payload JSON
- Confusão sobre qual campo usar

**Causa:**
```typescript
// lib/format/json.ts
const structuredData = {
    data /** @deprecated */,
    level /** @deprecated */,
    severityText: level,
    body: data
};
```

**Workaround:**
Aguardar versão 0.3.x que removerá campos deprecados.

**Status:** 🟡 Planejado para remoção em 0.3.x

---

## Limitações Conhecidas

### 8. Sem Suporte a Async Hooks para Contexto

**Severidade:** 🟢 Baixa

**Descrição:** O contexto de logging não é propagado automaticamente através de callbacks assíncronos.

**Exemplo:**
```typescript
logger.withContext({ requestId: '123' });

setTimeout(() => {
    // Contexto pode não estar disponível aqui
    logger.info('Async operation');
}, 1000);
```

**Causa:**
Não utiliza AsyncLocalStorage ou async_hooks do Node.js.

**Workaround:**
```typescript
import { AsyncLocalStorage } from 'async_hooks';

const storage = new AsyncLocalStorage();

function logWithContext(msg: string) {
    const ctx = storage.getStore();
    logger.withContext(ctx).info(msg);
}
```

**Status:** 🔵 Limitação conhecida

---

### 9. Limite de Payload HTTP

**Severidade:** 🟢 Baixa

**Descrição:** O servidor HTTP tem limite de 5MB para o corpo da requisição.

**Código:**
```typescript
// lib/http/server.ts
if (limit(Buffer.concat(data), 5)) {
    req.socket.destroy();
    throw new HttpError('Content too large', 413);
}
```

**Impacto:**
Requisições maiores que 5MB são rejeitadas com erro 413.

**Status:** 🔵 Comportamento intencional

---

### 10. Sem Suporte a Múltiplas Instâncias com Mesmo Servidor

**Severidade:** 🟢 Baixa

**Descrição:** Criar múltiplas instâncias do logger com servidor HTTP habilitado causa conflito.

**Causa:**
Cada instância tenta criar seu próprio servidor na mesma porta.

**Workaround:**
```typescript
const logger1 = createLogger('app');  // Porta 9898
const logger2 = createLogger('worker', { noServer: true }); // Sem servidor
```

**Status:** 🔵 Limitação conhecida

---

### 11. Performance de Serialização com Objetos Grandes

**Severidade:** 🟢 Baixa

**Descrição:** Objetos muito grandes (>1MB serializado) podem causar latência perceptível.

**Causa:**
`JSON.stringify` é síncrono e bloqueia o event loop.

**Workaround:**
```typescript
// Filtrar ou limitar dados antes de logar
const safeData = filter(largeObject, ['hugeArray', 'binaryData']);
logger.info('Operação', safeData);
```

**Status:** 🔵 Limitação conhecida

---

## Problemas Resolvidos

### ✅ Referências Circulares Causavam Crash

**Versão:** Resolvido em 0.2.5

**Descrição:** Objetos com referências circulares causavam exceção `TypeError: Converting circular structure to JSON`.

**Solução:**
Implementado `getCircularReplacer()` em `lib/util/Helpers.ts`.

---

### ✅ Servidor HTTP Não Fechava Corretamente

**Versão:** Resolvido em 0.2.3

**Descrição:** O método `stop()` não aguardava o fechamento do servidor corretamente.

**Solução:**
Implementado Promise-based shutdown com cleanup de timeouts.

---

## Reportar Novo Problema

Para reportar um novo problema:

1. Verifique se já não está listado aqui
2. Abra uma issue no [GitHub](https://github.com/ozmap/ozlogger/issues)
3. Inclua:
   - Versão do OZLogger
   - Versão do Node.js
   - Sistema operacional
   - Código para reproduzir
   - Mensagem de erro completa
   - Comportamento esperado vs atual

---

## Matriz de Severidade

| Severidade | Descrição | Ação |
|------------|-----------|------|
| 🔴 Alta | Crash, perda de dados, segurança | Corrigir imediatamente |
| 🟡 Média | Funcionalidade degradada | Planejar correção |
| 🟢 Baixa | Inconveniência, cosmético | Backlog |
| 🔵 Limitação | Comportamento intencional | Documentar |

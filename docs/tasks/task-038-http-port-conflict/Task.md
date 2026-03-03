# Task #38: Resolver Conflito de Porta HTTP em Testes

## Objetivo

Eliminar o erro `EADDRINUSE` que ocorre quando múltiplos testes tentam usar a mesma porta HTTP simultaneamente.

## Descrição

Quando múltiplos testes criam instâncias do Logger, o servidor HTTP tenta usar a mesma porta (9898 por padrão), causando falhas de testes.

### Sintoma

```
Error: listen EADDRINUSE: address already in use :::9898
```

### Causa

O servidor HTTP é iniciado automaticamente no construtor do Logger, e o Jest pode executar testes em paralelo ou não limpar adequadamente entre testes.

## Critérios de Aceitação

- [ ] Testes podem rodar em paralelo sem conflito de porta
- [ ] Opção `noServer` funciona corretamente
- [ ] Variável `OZLOGGER_HTTP=false` desabilita servidor
- [ ] Porta dinâmica como alternativa (porta 0)
- [ ] Documentação de best practices para testes

## Prioridade

🔴 **Alta** - Afeta desenvolvimento e CI

## Estimativa

- **Esforço:** 0.5-1 dia
- **Complexidade:** Baixa

## Workarounds Atuais

```typescript
// Opção 1: Desabilitar via env
process.env.OZLOGGER_HTTP = 'false';

// Opção 2: Opção noServer
const logger = createLogger('test', { noServer: true });

// Opção 3: Porta única por teste
process.env.OZLOGGER_SERVER = String(9900 + Math.random() * 100);
```

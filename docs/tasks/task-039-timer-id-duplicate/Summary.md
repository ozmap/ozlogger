# Resumo Executivo - Task #39

## Visão Geral

| Campo | Valor |
|-------|-------|
| **ID** | task-039 |
| **GitHub** | [#39](https://github.com/ozmap/ozlogger/issues/39) |
| **Título** | Timer ID Duplicado Lança Exceção |
| **Prioridade** | 🔴 Alta |
| **Status** | ✅ Concluído |
| **Estimativa** | 0.5 dia |
| **Breaking Change** | Sim (comportamento de erro) |

## Problema

```typescript
logger.time('process');
logger.time('process'); // Error: Identifier process is in use
```

Timer duplicado causava crash da aplicação devido a exceção não tratada.

## Impacto

### Afetados
- ❌ Loops que reutilizam ID
- ❌ Código sem tratamento de erro

## Solução Implementada (Opção B)

O método `time(id)` foi alterado para emitir um **WARNING** e reiniciar o timer, em vez de lançar exceção.

```typescript
// Agora:
logger.time('process');
logger.time('process'); 
// Log: [WARN] Identifier process is already in use. Overwriting...
// Timer 'process' agora conta a partir da segunda chamada.
```

### Benefícios
- ✅ Não quebra aplicação em produção
- ✅ Informa desenvolvedor sobre erro de lógica
- ✅ Mantém funcionalidade viva

## Decisões

- **Opção B (Warning + Overwrite)** foi escolhida por ser a mais robusta e simples.
- Não foi adicionada configuração para manter a API limpa.

## Links Relacionados

- [ISSUES.md](../../ISSUES.md) - Issue #2
- [lib/Logger.ts](../../../lib/Logger.ts)

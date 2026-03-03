# Resumo Executivo - Task #39

## Visão Geral

| Campo | Valor |
|-------|-------|
| **ID** | task-039 |
| **GitHub** | [#39](https://github.com/ozmap/ozlogger/issues/39) |
| **Título** | Timer ID Duplicado Lança Exceção |
| **Prioridade** | 🔴 Alta |
| **Status** | Workaround Disponível |
| **Estimativa** | 0.5 dia |
| **Assignee** | - |
| **Breaking Change** | Potencial (comportamento) |

## Problema

```typescript
logger.time('process');
logger.time('process'); // Error: Identifier process is in use
```

Timer duplicado causa crash da aplicação.

## Impacto

### Afetados
- ❌ Loops que reutilizam ID
- ❌ Código sem tratamento de erro
- ❌ Bibliotecas que usam OZLogger internamente

### Workarounds
- ✅ Usar IDs únicos
- ✅ Try/catch ao redor
- ✅ UUID para cada timer

## Opções de Solução

| Opção | Comportamento | Recomendado |
|-------|---------------|-------------|
| A | Sobrescrever sempre | ❌ |
| B | Warning + sobrescrever | ✅ |
| C | Configurável | ❌ (complexo) |

## Recomendação

**Opção B:** Warning e sobrescreve

```typescript
public time(id: string): Logger {
    if (this.timers.has(id)) {
        this.warn(`Timer '${id}' already running, restarting`);
    }
    this.timers.set(id, Date.now());
    return this;
}
```

### Benefícios
- ✅ Não quebra aplicação
- ✅ Informa desenvolvedor
- ✅ Mantém funcionalidade

## Decisões Pendentes

1. Confirmar que Opção B é a escolha final
2. Decidir se deve ser configurável no futuro

## Links Relacionados

- [ISSUES.md](../../ISSUES.md) - Issue #2
- [lib/Logger.ts](../../../lib/Logger.ts)

# Contexto Técnico - Task #41

## Código Atual

```typescript
// lib/Logger.ts
private timers = new Map<string, number>();

public time(id: string): Logger {
    // ...
    this.timers.set(id, Date.now());
    return this;
}
```

## Problema

Não existe código que remova chaves do `Map` `timers` exceto `timeEnd()`.

## Solução Proposta

Implementar uma limpeza periódica (garbage collection de timers) ou verificar na inserção.

### Opção: Limpeza Periódica

Usar `setInterval` (com `unref`) para checar timers expirados.

```typescript
// No construtor ou init
if (this.options.timerCleanup !== false) {
    this.timerGc = setInterval(() => this.cleanupTimers(), 60000);
    this.timerGc.unref(); // Importante para não segurar o processo
}
```

### Configuração

```typescript
interface LoggerOptions {
    timerTTL?: number; // ms, default 600000 (10min)
}
```

# Contexto Técnico - Task #39

## Código Atual

```typescript
// lib/Logger.ts
public time(id: string): Logger {
    if (this.timers.has(id)) throw new Error(`Identifier ${id} is in use`);
    this.timers.set(id, Date.now());
    return this;
}

public timeEnd(id: string): number | void {
    const start = this.timers.get(id);
    if (!start) {
        this.warn(`Timer ${id} does not exist`);
        return;
    }
    const duration = Date.now() - start;
    this.timers.delete(id);
    this.debug(`${id}: ${duration}ms`);
    return duration;
}
```

## Arquivos Afetados

- `lib/Logger.ts` - Métodos time() e timeEnd()
- `lib/util/interface/LoggerMethods.ts` - Interface (se adicionar opções)

## Cenários de Uso

### Problemático: Loop com mesmo ID
```typescript
for (const item of items) {
    logger.time('process'); // CRASH na segunda iteração
    await processItem(item);
    logger.timeEnd('process');
}
```

### Correto: ID único
```typescript
for (const item of items) {
    const id = `process-${item.id}`;
    logger.time(id);
    await processItem(item);
    logger.timeEnd(id);
}
```

## Soluções Detalhadas

### Solução A: Sobrescrever Sempre

```typescript
public time(id: string): Logger {
    this.timers.set(id, Date.now());
    return this;
}
```

**Prós:** Simples, nunca falha
**Contras:** Pode mascarar bugs de lógica

### Solução B: Warning e Sobrescreve

```typescript
public time(id: string): Logger {
    if (this.timers.has(id)) {
        this.warn(`Timer '${id}' already running, restarting`);
    }
    this.timers.set(id, Date.now());
    return this;
}
```

**Prós:** Informa o desenvolvedor, não quebra
**Contras:** Pode gerar muitos warnings

### Solução C: Configurável

```typescript
interface TimerOptions {
    onDuplicate?: 'throw' | 'warn' | 'overwrite' | 'ignore';
}

public time(id: string, options: TimerOptions = { onDuplicate: 'warn' }): Logger {
    if (this.timers.has(id)) {
        switch (options.onDuplicate) {
            case 'throw':
                throw new Error(`Identifier ${id} is in use`);
            case 'warn':
                this.warn(`Timer '${id}' already running, restarting`);
                break;
            case 'ignore':
                return this; // Não faz nada
            case 'overwrite':
            default:
                break;
        }
    }
    this.timers.set(id, Date.now());
    return this;
}
```

**Prós:** Flexível, backward compat com throw
**Contras:** API mais complexa

## Recomendação

**Solução B** - Warning e sobrescreve. É o equilíbrio entre informar o desenvolvedor e não quebrar a aplicação.

## Testes

```typescript
describe('Timer Duplicate', () => {
    test('should warn and overwrite on duplicate timer', () => {
        const warnSpy = jest.spyOn(logger, 'warn');
        
        logger.time('dup');
        logger.time('dup'); // Não deve lançar exceção
        
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('dup'));
    });
    
    test('timeEnd should return correct duration after overwrite', async () => {
        logger.time('test');
        await sleep(50);
        logger.time('test'); // Restart
        await sleep(100);
        
        const duration = logger.timeEnd('test');
        expect(duration).toBeGreaterThanOrEqual(100);
        expect(duration).toBeLessThan(150);
    });
});
```

## Links

- [ISSUES.md](../../ISSUES.md) - Issue #2
- [lib/Logger.ts](../../../lib/Logger.ts)

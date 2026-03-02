# Task #39: Timer ID Duplicado Lança Exceção

## Objetivo

Melhorar o comportamento do método `time()` quando um ID já está em uso, evitando exceções não tratadas.

## Descrição

Chamar `logger.time(id)` com um ID já em uso lança uma exceção não tratada, quebrando o fluxo da aplicação.

### Sintoma

```
Error: Identifier test-timer is in use
```

### Causa

O método `time()` verifica se o ID já existe no Map de timers e lança erro de forma síncrona.

### Código Problemático

```typescript
// lib/Logger.ts
public time(id: string): Logger {
    if (this.timers.has(id)) throw new Error(`Identifier ${id} is in use`);
    // ...
}
```

## Critérios de Aceitação

- [ ] Timer duplicado não lança exceção
- [ ] Comportamento configurável (throw, warn, overwrite, ignore)
- [ ] Backward compatibility via opção
- [ ] Log de warning quando timer é sobrescrito
- [ ] Testes para todos os cenários

## Prioridade

🔴 **Alta** - Pode causar crash em produção

## Estimativa

- **Esforço:** 0.5 dia
- **Complexidade:** Baixa

## Soluções Propostas

```typescript
// Opção 1: Sobrescrever silenciosamente
public time(id: string): Logger {
    this.timers.set(id, Date.now()); // Sempre sobrescreve
    return this;
}

// Opção 2: Warning e sobrescreve
public time(id: string): Logger {
    if (this.timers.has(id)) {
        this.warn(`Timer ${id} already exists, overwriting`);
    }
    this.timers.set(id, Date.now());
    return this;
}

// Opção 3: Configurável
public time(id: string, options?: { onDuplicate: 'throw' | 'warn' | 'ignore' }): Logger {
    // ...
}
```

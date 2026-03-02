# Contexto Técnico - Task #44

## Interface Transport

```typescript
interface LogMessage {
    level: string;
    message: string;
    // ...
}

interface Transport {
    log(message: LogMessage): void | Promise<void>;
    close?(): void | Promise<void>;
}
```

## Refatoração

Mover a lógica de `console.log` e `format` para dentro de um `ConsoleTransport` padrão.
O `Logger` passará a iterar sobre `this.transports` e chamar `.log()`.

## Arquivos

- Nova pasta `lib/transports/`
- `lib/transports/Transport.ts` (interface)
- `lib/transports/ConsoleTransport.ts`
- `lib/transports/FileTransport.ts`

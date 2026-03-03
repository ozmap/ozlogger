# Contexto Técnico - Task #43

## Arquitetura Proposta

```mermaid
flowchart LR
    Log call --> Buffer
    Buffer --> |Threshold/Timer| Flush
    Flush --> Transport
    Transport --> |Error| RetryQueue
    RetryQueue --> Buffer
```

## Componentes

- `LogBuffer`: Classe para gerenciar a fila de mensagens.
- `FlushStrategy`: Interface para decidir quando escrever.

## Considerações

O OZLogger atual foca em `stdout`. Bufferizar `stdout` pode melhorar throughput em Node.js (usando `process.stdout.write` de forma assíncrona ou bufada).

**Importante:** Ao encerrar o processo, o buffer deve ser descarregado (`flushSync`).

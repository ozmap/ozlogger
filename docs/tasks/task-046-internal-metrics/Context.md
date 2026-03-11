# Contexto Técnico - Task #46

## Estrutura de Dados

```typescript
interface LoggerMetrics {
    counters: Record<string, number>; // Counters por nível
    dropped: number;
    lastError?: Error;
    startTime: number;
}
```

## Implementação

Adicionar hooks no método `log` principal para incrementar contadores.
Certificar-se de que a coleta de métricas tem overhead desprezível (evitar locks ou operações pesadas).

## Exposição

Rota interna no servidor HTTP existente (`GET /metrics` ou `/status`) seria ideal.

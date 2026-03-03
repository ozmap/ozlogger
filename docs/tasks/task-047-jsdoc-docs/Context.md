# Contexto Técnico - Task #47

## Padrão Esperado

```typescript
/**
 * Cria uma nova instância de Logger.
 * 
 * @param tag - Tag identificadora para os logs desta instância.
 * @param options - Opções de configuração.
 * @returns Instância configurada do Logger.
 * 
 * @example
 * ```ts
 * const logger = createLogger('PaymentService', { level: 'debug' });
 * logger.info('Service started');
 * ```
 */
export function createLogger(...)
```

## Arquivos Alvo

- `lib/Logger.ts`
- `lib/index.ts`
- `lib/util/Helpers.ts`
- `lib/util/Objects.ts`

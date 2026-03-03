# Contexto Técnico - Task #36

## Arquivos Afetados

### Principal
- `lib/Logger.ts` - Métodos deprecados: silly(), http(), critical(), tag(), init()

### Formatters
- `lib/format/json.ts` - Campos: data, level

### Enums
- `lib/util/enum/LogLevels.ts` - Níveis: silly, http, critical
- `lib/util/enum/LevelTags.ts` - Tags correspondentes

## Código a Remover

### lib/Logger.ts

```typescript
// REMOVER: Método silly
/** @deprecated Use debug() instead */
public silly(...args: unknown[]): Logger {
  // ...
}

// REMOVER: Método http
/** @deprecated Use info() or debug() instead */
public http(...args: unknown[]): Logger {
  // ...
}

// REMOVER: Método critical
/** @deprecated Use error() instead */
public critical(...args: unknown[]): Logger {
  // ...
}

// REMOVER: Método tag (se existir)
/** @deprecated Use createLogger('tag') instead */
public tag(tag: string): Logger {
  // ...
}

// REMOVER: Método estático init
/** @deprecated Use createLogger() instead */
public static init(options?: LoggerOptions): Logger {
  // ...
}
```

### lib/format/json.ts

```typescript
// REMOVER do output JSON
{
  "data": { ... },  // Usar body
  "level": "INFO",  // Usar severityText
}
```

### lib/util/enum/LogLevels.ts

```typescript
// REMOVER
export enum LogLevels {
  silly = 1,     // REMOVER
  http = 8,      // REMOVER
  critical = 21, // REMOVER
  // Manter: debug, info, audit, warn, error, quiet
}
```

## Impacto em Usuários

### Breaking Changes

| Antes | Depois | Migração |
|-------|--------|----------|
| `logger.silly()` | `logger.debug()` | Substituir chamadas |
| `logger.http()` | `logger.info()` | Substituir chamadas |
| `logger.critical()` | `logger.error()` | Substituir chamadas |
| `Logger.init()` | `createLogger()` | Usar factory |
| `output.data` | `output.body` | Atualizar parsers |
| `output.level` | `output.severityText` | Atualizar parsers |

## Dependências

- Task #34 (Test Coverage) deve ser concluída antes para garantir que remoções não quebrem funcionalidades

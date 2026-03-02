# Contexto Técnico - Task #34

## Arquivos Envolvidos

### Testes Existentes
- `tests/logger.test.ts` - Testes principais do Logger
- `tests/utils.test.ts` - Testes de utilitários
- `tests/logger.perf.test.ts` - Testes de performance
- `tests/logger.old.test.ts` - Testes legados

### Arquivos a Testar

#### Core
- `lib/Logger.ts` - Classe principal
- `lib/index.ts` - Entry point

#### Formatters
- `lib/format/json.ts` - Formatar JSON
- `lib/format/text.ts` - Formatar texto

#### HTTP Server
- `lib/http/server.ts` - Servidor HTTP
- `lib/http/routes/index.ts` - Rotas
- `lib/http/errors.ts` - Classe HttpError

#### Utilities
- `lib/util/Events.ts` - Sistema de eventos
- `lib/util/Helpers.ts` - Funções auxiliares
- `lib/util/Objects.ts` - mask() e filter()

## Dependências

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.12"
  }
}
```

## Cenários de Teste Faltantes

### 1. OpenTelemetry Integration
```typescript
// Verificar que traceId e spanId são capturados
test('should capture trace context from OpenTelemetry', () => {
  // Mock @opentelemetry/api
  // Verificar campos no output
});
```

### 2. HTTP Server
```typescript
describe('HTTP Server', () => {
  test('POST /changeLevel should change log level');
  test('POST /changeLevel with invalid level should return 400');
  test('POST /changeLevel without duration should return 400');
  test('should handle invalid JSON body');
  test('should return 404 for unknown routes');
});
```

### 3. Cluster Communication
```typescript
describe('Cluster Mode', () => {
  test('broadcastEvent should send to all workers');
  test('registerEvent should handle incoming messages');
});
```

### 4. JSON Formatter Edge Cases
```typescript
describe('JSON Formatter', () => {
  test('should handle circular references');
  test('should handle BigInt');
  test('should handle Symbol');
  test('should handle undefined in objects');
  test('should handle Error objects');
});
```

## Configuração Jest

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

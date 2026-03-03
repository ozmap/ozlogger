# Contexto Técnico - Task #37

## Causa Raiz

### 1. Servidor HTTP Ativo

```typescript
// lib/http/server.ts
const server = http.createServer(handleRequest);
server.listen(port, host);
// Servidor mantém event loop ativo
```

### 2. Event Listeners IPC

```typescript
// lib/util/Events.ts
process.on('message', handler);
// Listener mantém referência ativa
```

### 3. Referências no Cluster

```typescript
// lib/Logger.ts - configure()
if (cluster.isPrimary) {
    cluster.on('message', handler);
}
```

## Arquivos Afetados

- `lib/Logger.ts` - Adicionar opção allowExit e método shutdown()
- `lib/http/server.ts` - Implementar unref() e close()
- `lib/util/Events.ts` - Implementar removeListener

## Solução Detalhada

### Opção allowExit

```typescript
// lib/Logger.ts
export interface LoggerOptions {
    // ...existing options
    allowExit?: boolean; // Default: false
}

private configure() {
    // ...existing code
    
    if (this.options.allowExit) {
        // Não inicia HTTP server
        // Ou usa server.unref()
    }
}
```

### Server Unref

```typescript
// lib/http/server.ts
export function startServer(options?: { unref?: boolean }) {
    const server = http.createServer(handleRequest);
    server.listen(port, host, () => {
        if (options?.unref) {
            server.unref();
        }
    });
    return server;
}
```

### Método Shutdown

```typescript
// lib/Logger.ts
public async shutdown(): Promise<void> {
    // 1. Fechar servidor HTTP
    if (this.server) {
        await new Promise<void>((resolve, reject) => {
            this.server.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
    
    // 2. Remover event listeners
    process.removeListener('message', this.messageHandler);
    
    // 3. Limpar referências
    this.timers.clear();
}
```

## Impacto

### Sem mudança para uso normal
```typescript
// Aplicações web/servidores: comportamento inalterado
const logger = createLogger('api');
// Processo continua rodando (esperado)
```

### Novo comportamento para scripts
```typescript
// Scripts CLI
const logger = createLogger('cli', { allowExit: true });
logger.info('Processing...');
// Processo termina naturalmente ao final
```

## Testes

```typescript
describe('Process Exit', () => {
    test('process should exit with allowExit: true', async () => {
        const subprocess = spawn('node', ['-e', `
            const { createLogger } = require('./lib');
            const logger = createLogger('test', { allowExit: true });
            logger.info('done');
        `]);
        
        const exitCode = await new Promise(r => subprocess.on('exit', r));
        expect(exitCode).toBe(0);
    });
});
```

## Links

- [ANALYSIS-PROCESS-HANG.md](../../ANALYSIS-PROCESS-HANG.md) - Análise completa
- [ISSUES.md](../../ISSUES.md) - Issue documentada

# Task #37: Corrigir Process Hang

## Objetivo

Resolver o problema onde o processo Node.js não termina naturalmente quando o OZLogger está ativo, mesmo após o trabalho principal ser concluído.

## Descrição

O OZLogger mantém o processo vivo devido a:
1. **Servidor HTTP** escutando na porta configurada
2. **Event listeners** para comunicação IPC em cluster mode
3. **Referências ativas** que impedem garbage collection

Isso causa problemas em:
- Scripts CLI que devem terminar automaticamente
- Testes Jest que ficam pendurados
- Lambda/Serverless que não liberam recursos

## Critérios de Aceitação

- [ ] Processo termina naturalmente quando não há mais trabalho
- [ ] Opção `allowExit: true` para scripts/CLI
- [ ] Método `shutdown()` para cleanup explícito
- [ ] Backward compatible - comportamento padrão mantido
- [ ] Testes verificam que processo termina
- [ ] Documentação atualizada

## Prioridade

🔴 **Crítico** - Afeta uso em scripts e testes

## Estimativa

- **Esforço:** 1-2 dias
- **Complexidade:** Média

## Solução Proposta

```typescript
// Opção 1: Configuração
const logger = createLogger('app', { allowExit: true });

// Opção 2: Unref do servidor
server.unref();

// Opção 3: Shutdown explícito
await logger.shutdown();
```

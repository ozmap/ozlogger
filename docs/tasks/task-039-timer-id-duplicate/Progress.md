# Progresso - Task #39: Timer ID Duplicado

## Status Atual

🟡 **Workaround Disponível**

## Checklist de Subtarefas

### Fase 1: Decisão
- [x] Documentar opções de solução
- [ ] Decidir qual abordagem implementar
- [ ] Validar com testes manuais

### Fase 2: Implementação
- [ ] Modificar método `time()`
- [ ] Adicionar warning log
- [ ] Ou adicionar opção configurável
- [ ] Manter backward compatibility

### Fase 3: Testes
- [ ] Teste de timer duplicado
- [ ] Teste de warning gerado
- [ ] Teste de duração correta após overwrite
- [ ] Teste de comportamento configurável (se aplicável)

### Fase 4: Documentação
- [ ] Atualizar README
- [ ] Documentar mudança de comportamento
- [ ] Atualizar CHANGELOG

## Histórico de Progresso

| Data | Ação | Resultado |
|------|------|-----------|
| - | Issue identificada | Documentada em ISSUES.md |
| - | Soluções propostas | 3 opções documentadas |
| - | Task criada | Aguardando decisão |

## Bloqueios

- **Decisão pendente:** Qual abordagem implementar (A, B, ou C)

## Workarounds Atuais

```typescript
// Opção 1: Usar IDs únicos
logger.time(`operation-${Date.now()}`);

// Opção 2: Try/catch
try {
    logger.time('my-timer');
} catch (e) {
    // Timer já existe
}

// Opção 3: UUID
import { randomUUID } from 'crypto';
logger.time(randomUUID());
```

## Notas

- Solução B (warn + overwrite) é recomendada
- Manter exceção como opção para quem quer comportamento estrito
- Considerar deprecar comportamento atual na v0.3.x

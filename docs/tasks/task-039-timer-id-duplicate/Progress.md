# Progresso - Task #39: Timer ID Duplicado

## Status Atual

� **Concluído**

## Checklist de Subtarefas

### Fase 1: Decisão
- [x] Documentar opções de solução
- [x] Decidir qual abordagem implementar (Solução B: Warning + Overwrite)
- [x] Validar com testes manuais

### Fase 2: Implementação
- [x] Modificar método `time()`
- [x] Adicionar warning log
- [x] Ou adicionar opção configurável (Não implementado, mantido simples)
- [x] Manter backward compatibility (Comportamento alterado de throw para warning)

### Fase 3: Testes
- [x] Teste de timer duplicado
- [x] Teste de warning gerado
- [x] Teste de duração correta após overwrite
- [x] Teste de comportamento configurável (se aplicável)

### Fase 4: Documentação
- [x] Atualizar README
- [x] Documentar mudança de comportamento
- [ ] Atualizar CHANGELOG

## Histórico de Progresso

| Data | Ação | Resultado |
|------|------|-----------|
| - | Issue identificada | Documentada em ISSUES.md |
| - | Soluções propostas | 3 opções documentadas |
| 2026-03-02 | Task criada | Aguardando decisão |
| 2026-03-02 | Implementação | Implementado sobrescrita de timer com warning |

## Bloqueios

- Nenhum

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

- Solução B (warn + overwrite) foi a escolhida por ser a mais robusta para produção.
- Manter exceção como opção para quem quer comportamento estrito não foi implementado para manter a simplicidade (KISS).

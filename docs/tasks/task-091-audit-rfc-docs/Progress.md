# Progresso - Task #91: Documentação do Padrão de Auditoria

## Status Atual

🟢 **Não Iniciado** · Opcional · Idealmente após #89/#90

## Checklist

- [ ] Atualizar assinatura no README (linhas ~400, ~405, ~610) → `audit(_msg, body)`
- [ ] Trocar "descartado" por "quebrado + ERROR AUDIT_OVERSIZE" (linhas ~405, ~413)
- [ ] Reconciliar a lista de campos do corpo (linha ~412) com `_msg`/`audit_id`
- [ ] Adicionar §7 (auditar a intenção)
- [ ] Adicionar §10 (modelagem / `_stream_fields=tag,level`)
- [ ] Adicionar §11 (exemplos LogsQL a/b/c/d)
- [ ] Adicionar §12 (matriz de decisão do corpo)
- [ ] Adicionar §13 (dados sensíveis: `filter()` p/ segredos; PII visível; sem auto-máscara)
- [ ] Conferir coerência dos exemplos com os campos emitidos por #89/#90

## Histórico

| Data | Ação | Resultado |
|------|------|-----------|
| 2026-06-25 | Task criada a partir da RFC-OZLOGGER-AUDIT-001 | Aguardando #89/#90 |

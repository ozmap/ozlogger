# Progresso - Task #89: Assinatura audit(_msg, body)

## Status Atual

🔴 **Não Iniciado**

## Checklist

- [ ] Inverter a guarda de aridade em `buildAudit` (exigir 2 args; lançar caso contrário)
- [ ] Extrair `_msg` (string) e `body`; validar tipo de `_msg` (decisão: throw)
- [ ] Gerar `audit_id` via `auditId()` (Task #88)
- [ ] Passar `_msg`/`audit_id`/`body` ao caminho de emissão sem o proxy `body.0`
- [ ] `json.ts`: branch AUDIT — `body` inteiro, `_time` sempre, sem `getContext()`
- [ ] Remover `data` (depreciado) do envelope de auditoria; manter `level`
- [ ] Preservar branch de corpo não serializável (não derrubar processo)
- [ ] Definir saída mínima do `text.ts` para auditoria (não lançar)
- [ ] Atualizar `AuditMethod` em `LoggerMethods.ts` + comentário
- [ ] Atualizar JSDoc de `audit` público e `buildAudit`
- [ ] Reescrever `tests/audit.test.ts` (body.0→body, aridade, _msg, audit_id, _time, exclusões)
- [ ] Teste negativo: email/cpf não mascarados

## Histórico

| Data | Ação | Resultado |
|------|------|-----------|
| 2026-06-25 | Task criada a partir da RFC-OZLOGGER-AUDIT-001 | Aguardando implementação |

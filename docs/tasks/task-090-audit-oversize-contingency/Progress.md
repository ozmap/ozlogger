# Progresso - Task #90: Contingência de Quebra + ERROR AUDIT_OVERSIZE

## Status Atual

🔴 **Não Iniciado** · Bloqueado por #88 e #89

## Checklist

- [ ] Substituir o branch de descarte (`lib/Logger.ts` ~296-301) pela chamada a `splitAuditBody`
- [ ] Mintar `audit_id` e gatilhar quebra acima de `SAFE_LINE_BYTES`
- [ ] Emitir cabeçalho (skeleton + marcadores) com o envelope da Task #89
- [ ] Emitir segmentos (array → JSON; escalar/blob → `chunk_part`) sem reintroduzir `body.0`
- [ ] Emitir ERROR `AUDIT_OVERSIZE` (audit_id, contagem, §7) — casa com §11d
- [ ] Implementar `auditChunked(_msg, body)` `@deprecated` reutilizando o mesmo util
- [ ] Caminho "coube" do `auditChunked` → linha única, sem `chunk_*`, sem ERROR
- [ ] Exportar `auditChunked` em `lib/index.ts` (ESM + CJS) e em `LoggerMethods.ts` se método
- [ ] Tratar estouro por nº de campos (emitir grupos de chaves)
- [ ] Atualizar JSDoc de `audit`/`DEFAULT_AUDIT_MAX_BYTES`
- [ ] Testes: quebra, marcador, segmentos, correlação, ERROR, reconstrução, `auditChunked`

## Histórico

| Data | Ação | Resultado |
|------|------|-----------|
| 2026-06-25 | Task criada a partir da RFC-OZLOGGER-AUDIT-001 | Aguardando #88 e #89 |

# Progresso - Task #88: Util de Quebra (AuditChunk)

## Status Atual

🔴 **Não Iniciado**

## Checklist

- [ ] Criar `lib/util/AuditChunk.ts` (módulo puro, sem `Logger`, sem `stdout`)
- [ ] Implementar `byteLen`, `auditId` (ULID inline zero-dep), `heavyMarker`
- [ ] Implementar `splitFirstLevel` (skeleton inline + marcadores)
- [ ] Implementar `chunkArrayByBytes` e `chunkStringByBytes` (divisão por bytes)
- [ ] Implementar `countChunks` e a função de topo `splitAuditBody`
- [ ] Implementar estouro por nº de campos (key-set splitting)
- [ ] Exportar superfície pública em `lib/index.ts` (ESM + CJS `Object.assign`)
- [ ] Criar `tests/auditChunk.test.ts` (importa o util **sem** o `Logger`)
- [ ] Provar ausência de efeito colateral (espião em `process.stdout.write`/`console`)
- [ ] Provar determinismo byte a byte (entrada fixa → saída fixa)

## Histórico

| Data | Ação | Resultado |
|------|------|-----------|
| 2026-06-25 | Task criada a partir da RFC-OZLOGGER-AUDIT-001 | Aguardando implementação |

# Task #89: Assinatura `audit(_msg, body)` e Isolamento do Envelope

> RFC: [RFC-OZLOGGER-AUDIT-001](../../rfc/RFC-OZLOGGER-AUDIT-001.md) §1, §2, §6 (6.1–6.4), §10–§11, §14

## Objetivo

Substituir o contrato atual do `audit()` pela assinatura fixa
`audit(_msg: string, body: unknown)`, eliminar o campo `body.0` e produzir um
envelope de auditoria limpo, com `_msg` e `audit_id` explícitos e os metadados
estruturalmente protegidos contra sobrescrita.

## Descrição

Hoje (`lib/Logger.ts` + `lib/format/json.ts`):

- `audit()` aceita **exatamente 1 argumento** e o wrapper JSON o empacota em
  `data[i++]`, gerando `body: { "0": <valor> }` — o **problema do `body.0`** que a
  RFC encerra.
- Não há `_msg` explícito (a mensagem não é definível).
- Não há `audit_id`.
- O envelope ainda vaza `pid`/`ppid`/`traceId`/`spanId` via `getContext()`.

A RFC (§6) define dois parâmetros: o primeiro é a **mensagem** (sempre `string`,
usada pelo Victoria Logs como texto exibido e alvo de busca); o segundo é o
**corpo**, atribuído **inteiro** a `entry.body` (`entry.body = body`), nunca
distribuído na camada superior — o que torna a sobrescrita de metadados
impossível por construção (§6.3).

Esta task entrega o **caminho de linha única** (corpo que cabe no limite). A
contingência de quebra fica na Task #90.

## Escopo

### Inclui

- `audit()` exige **aridade exatamente 2**; qualquer outra aridade lança erro
  (mesmo com o nível desabilitado), como erro de programação (§6, §14).
- `_msg` (1º arg, `string`) e `audit_id` (do util da Task #88) no envelope.
- `body` atribuído inteiro (objeto vira `body.*`; escalar vira o próprio valor) — **fim do `body.0`**.
- Envelope de auditoria **sem** `pid`, `ppid`, `traceId`, `spanId`, `host`, `tenant` (§3, §6.4).
- `_time` (ISO-8601 UTC) **sempre presente** no envelope de auditoria.
- Mantém `severityText: 'AUDIT'` e `severityNumber: 12`.
- Preserva o comportamento atual de corpo **não serializável** (reporta via erro, não derruba o processo).
- Atualiza o tipo `AuditMethod` e os JSDoc.
- Atualiza `tests/audit.test.ts` para o novo contrato.

### Não inclui

- Quebra de corpos grandes / `auditChunked()` (Task #90).
- Documentação de consulta/modelagem/dados sensíveis (Task #91).

## Critérios de Aceitação

- [ ] `audit()`, `audit('m')`, `audit('m', b, c)` **lançam erro** (inclusive com nível desabilitado); `audit('m', body)` **não** lança.
- [ ] `JSON.parse(out)._msg === ` 1º argumento; `out.audit_id` é string não vazia (formato conforme decisão da #88).
- [ ] **`body.0` eliminado:** `audit('m', { action: 'login' })` → `out.body` deep-equal `{ action: 'login' }` e `out.body['0'] === undefined`. Escalar: `audit('m', 42)` → `out.body === 42`.
- [ ] **Isolamento:** `audit('t', { a: 1, LEVEL: 'x', level: 'x', tag: 'x', audit_id: 'x' })` →
      `out.level === 'AUDIT'`, `out.tag === <tag do logger>`, `out.audit_id === <id gerado>` (não `'x'`),
      e as chaves do chamador permanecem aninhadas em `out.body`.
- [ ] Envelope de auditoria **não contém** `pid`, `ppid`, `traceId`, `spanId`, `host`, `tenant`, mesmo com span OTel ativo.
- [ ] `out._time` é ISO-8601 UTC válido em **todo** registro de auditoria, independentemente de `OZLOGGER_DATETIME`.
- [ ] `severityText === 'AUDIT'` e `severityNumber === 12`.
- [ ] Corpo não serializável não derruba o processo e é reportado via erro (comportamento atual preservado).
- [ ] Saída em `OZLOGGER_OUTPUT=text` para `audit(_msg, body)` não lança (formato mínimo: `_msg` + corpo serializado).
- [ ] `AuditMethod` em `LoggerMethods.ts` atualizado para `(_msg: string, body: unknown) => void` + `timeEnd`.
- [ ] **Teste negativo:** `email`/`cpf` no corpo **não** são mascarados/filtrados pelo logger (§13 — não introduzir redaction no caminho de auditoria).
- [ ] JSDoc do `audit` público e de `buildAudit` atualizados (deixam de dizer "exatamente um argumento").

## Prioridade

🔴 Crítico (mudança de API quebrando contrato)

## Dependências

- **Leve** em #88: consome `auditId()` e combina o contrato de envelope (para as linhas de quebra baterem com as linhas normais).
- **Bloqueia** #90 e #91.

## Estimativa

- **Esforço:** 1-2 dias
- **Complexidade:** Média

# Contexto Técnico - Task #89

## Estado atual (o que muda)

### `lib/Logger.ts` — `buildAudit()` (linhas ~267-318)

- Guarda de aridade hoje: `if (args.length !== 1) throw ...` → **inverter para exigir 2**
  (`_msg = args[0]`, `body = args[1]`); manter o `throw` **antes** do check de `enabled`
  (erro de programação aparece mesmo com nível desabilitado).
- Validação de `_msg`: a RFC diz que é sempre `string`. Default recomendado: **lançar
  `TypeError`** se `args[0]` não for string (coerência com a filosofia de "erro de
  programação"). *Alternativa:* `String(_msg)`. Ver decisão no `Summary.md`.
- Gerar `audit_id` via `auditId()` (util da Task #88).
- A chamada `this.logger('AUDIT', data)` precisa passar `_msg`/`audit_id`/`body`
  separadamente para que o envelope seja montado **sem** o proxy `body.0`.
- Preservar o branch de **não serializável** (try/catch atual, linhas ~283-291).
- O branch de **oversize** (linhas ~296-301) é tratado na Task #90 — nesta task,
  manter o comportamento atual ou apenas deixar o gancho pronto (combinar com #90).

### `lib/format/json.ts` — `toStructuredJsonLog` / `json()`

Fonte do `body.0`:

- linha ~37 `data` (depreciado) e ~41 `body: data` (alias) + ~56-60 `push()` fazendo `data[i++] = value`.

Para auditoria, o envelope deve:

1. atribuir `body = body` **inteiro** (sem `data[i++]`, sem alias `data`);
2. emitir `_time` (ISO) **sempre** (não o `timestamp` condicional);
3. **não** espalhar `...this.getContext()` (que injeta `pid`/`ppid`/`traceId`/`spanId`);
4. incluir `audit_id` e `_msg` vindos do `buildAudit`;
5. manter `severityText: 'AUDIT'` e `severityNumber: 12`.

Os níveis não-audit podem manter o comportamento atual → provável **branch
específico de AUDIT** (ou wrapper de auditoria dedicado).

### `lib/util/interface/LoggerMethods.ts` (linhas 9-20)

`AuditMethod` muda de `((data: unknown) => void)` para
`((_msg: string, body: unknown) => void) & { timeEnd(id: string): Logger }`.
Atualizar o comentário de contrato (descreve "exatamente UM argumento").

### `lib/util/Helpers.ts` — `datetime()` (linhas 190-203)

Emite `timestamp` e só com `OZLOGGER_DATETIME=true`. A auditoria precisa de `_time`
**sempre**. Recomendado: o construtor do envelope de auditoria define `_time`
diretamente (ISO UTC), em vez de reusar esse helper gated. `getProcessInformation()`
permanece, mas **não** alimenta o envelope de auditoria.

## Envelope-alvo (linha única) — §6.2

```jsonc
// audit("alice login", { action: "login", user: "alice" })
{
  "_time": "2026-06-24T14:32:10.512Z",
  "level": "AUDIT",            // depreciado, mantido por compat (§6.1 lista 'level')
  "severityText": "AUDIT",
  "severityNumber": 12,
  "tag": "MeuApp",
  "audit_id": "01J8Z9K3F7AB...",
  "_msg": "alice login",
  "body": { "action": "login", "user": "alice" }
}
```

> Campo depreciado `data` (origem do `body.0`) **é removido** do envelope de
> auditoria. `level` (= `'AUDIT'`) é mantido por compatibilidade (consta na §6.1).

## Isolamento de metadados (§6.3)

Atribuir `body` inteiro é o que garante que `audit('t', { LEVEL: 'x' })` mantenha
`LEVEL` aninhado em `body` sem tocar no envelope. **Regra:** nunca espalhar o
corpo na camada superior.

## Testes a reescrever — `tests/audit.test.ts`

- linhas 31-34, 52-54: trocam `body['0']` por `body` (objeto direto / escalar direto);
- linhas 26, 47-49: chamadas de 1 arg → `audit(_msg, body)`;
- linhas 59-83: aridade — **2 passa**, 0/1/3 lançam;
- novas asserções: `_time` (ISO, independe de `OZLOGGER_DATETIME`), `_msg`, `audit_id`,
  ausência de `pid`/`ppid`/`traceId`/`spanId`, corpo inteiro, chaves do chamador aninhadas;
- teste negativo: `email`/`cpf` **não** mascarados.

> O teste de oversize (linhas 88-98) muda na Task #90 (passa de "descarta" para "quebra + ERROR").
> Nesta task, ajustar apenas o necessário para não quebrar a suíte, deixando claro o handoff.

## Migração (consumidores)

Chamadas no estilo antigo (variádico / leitura de `body.0`) migram para
`audit(_msg, body)` e `body.*`. Documentado na Task #91.

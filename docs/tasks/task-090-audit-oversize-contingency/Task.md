# Task #90: Contingência de Quebra (`audit`/`auditChunked`) + ERROR `AUDIT_OVERSIZE`

> RFC: [RFC-OZLOGGER-AUDIT-001](../../rfc/RFC-OZLOGGER-AUDIT-001.md) §1.3, §3, §8 (8.1), §9, §13

## Objetivo

Substituir o descarte silencioso de corpos grandes pela **contingência de
quebra** descrita na RFC: quando um registro de auditoria excede o limite
seguro, o `audit()` quebra os valores em linhas de até ~200 KB (usando o util da
Task #88), emite cabeçalho + segmentos correlacionados pelo `audit_id`, e
**sempre** emite um ERROR de alta visibilidade `AUDIT_OVERSIZE`. Adicionalmente,
expõe a função temporária e `@deprecated` `auditChunked()` para a ferramenta de
importação (§9), consumindo **o mesmo util** — sem fork de lógica.

## Descrição

Hoje (`lib/Logger.ts`, branch de oversize) um corpo > 256 KB é **descartado**
com um `this.error(...)` + `return`. A RFC (§8) trata isso como **perda
silenciosa de dados** e exige contingência:

- "Quebram-se os valores, e não o envelope": o cabeçalho mantém todo o primeiro
  nível; valores que excederam viram marcador `{ ref, type, bytes, sha1 }`; os
  dados volumosos vão em linhas de segmento (array → JSON; escalar/blob → `chunk_part`).
- Toda quebra é uma **condição anômala** → emite ERROR `AUDIT_OVERSIZE` com o
  `audit_id`, a contagem de partes e referência à §7 (corrigir na origem).

A `auditChunked()` (§9) é a mesma contingência, porém **nomeada e `@deprecated`**,
para a ferramenta de importação. Quando o corpo cabe, segue o caminho normal de
linha única (Task #89); quando não cabe, quebra e emite o ERROR. Existe para ser
**localizável e removível** quando a importação passar a auditar por intenção.

## Escopo

### Inclui

- Substituir o descarte por: `audit_id` + `splitAuditBody()` (Task #88) +
  emissão de cabeçalho/segmentos + ERROR `AUDIT_OVERSIZE`.
- Gatilho de quebra = registro (envelope + corpo) acima de `SAFE_LINE_BYTES` (~200 KB).
- Emissão das linhas de quebra com o **mesmo envelope** da Task #89 (sem `pid`/`ppid`/`traceId`/`spanId`; `_time`; `severityNumber 12`) e **sem reintroduzir `body.0`**.
- ERROR nível ERROR contendo literal `AUDIT_OVERSIZE`, token `audit_id=<id>`, contagem de partes e referência à §7.
- Método `auditChunked(_msg, body)` `@deprecated`, reutilizando o mesmo util; caminho de "coube" produz linha única normal.
- Exportar `auditChunked` em `lib/index.ts` (ESM + CJS).
- Tratamento de estouro por nº de campos (emitir as linhas de grupos de chaves do util).
- Atualizar JSDoc/`DEFAULT_AUDIT_MAX_BYTES` (deixa de dizer "descartado").

### Não inclui

- A matemática da quebra em si (Task #88).
- A assinatura/envelope de linha única (Task #89).
- Persistência em pasta local — §8.2 é **estudo, não adotado**.
- Auto-redaction de PII — §13 **proíbe** mascarar no caminho de auditoria.

## Critérios de Aceitação

- [ ] Corpo grande **não é mais descartado:** `audit('m', { blob: 'x'.repeat(300*1024) })`
      emite cabeçalho + segmento(s) + **exatamente 1** ERROR; **nenhuma** mensagem "record dropped"; total de linhas > 1.
- [ ] O ERROR é nível ERROR, com `_msg` contendo `AUDIT_OVERSIZE`, `audit_id=<id>`, contagem de partes e referência à §7
      (consulta §11d `level:=ERROR _msg:~"AUDIT_OVERSIZE"` casa).
- [ ] **Correlação:** `header.audit_id === ` todos os `segment.audit_id` `=== ` o id no texto do ERROR.
- [ ] Cabeçalho: `chunked: true`, `chunk_total`, `_msg`; segmentos: `chunk_seq`/`chunk_total`/`chunk_field`;
      `_msg` presente no cabeçalho e ausente nos segmentos (§8.1).
- [ ] Linhas de quebra usam o **mesmo util** (Task #88) — sem fork — e o **mesmo envelope** da Task #89
      (sem `pid`/`ppid`/`traceId`/`spanId`/`host`/`tenant`; `_time` presente; `severityNumber 12`); **sem `body.0`**.
- [ ] `auditChunked(_msg, body)` existe, é `@deprecated` (JSDoc), reutiliza o mesmo util; para corpo abaixo de
      `SAFE_LINE_BYTES` produz **uma única** linha normal (sem campos `chunk_*`, sem ERROR).
- [ ] `auditChunked` exportado em `lib/index.ts` no bloco ESM **e** no `Object.assign` CJS (e em `LoggerMethods.ts` se for método).
- [ ] Estouro por nº de campos: corpo acima do limite de campos emite múltiplas linhas de grupos de chaves correlacionadas.
- [ ] JSDoc de `audit`/`DEFAULT_AUDIT_MAX_BYTES` atualizado (quebra, não descarte).
- [ ] Reconstrução: agrupando segmentos por `chunk_field` e ordenando por `chunk_seq`, recompõe-se o valor original.

## Prioridade

🟠 Alta (resolve perda silenciosa; depende da fundação)

## Dependências

- **Depende de #88** (util de quebra) **e #89** (envelope de linha única).

## Estimativa

- **Esforço:** 2-3 dias
- **Complexidade:** Alta

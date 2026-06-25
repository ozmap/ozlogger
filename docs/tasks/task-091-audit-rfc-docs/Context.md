# Contexto Técnico - Task #91

## Por que é uma task separada (e opcional)

As seções §7, §10, §11, §12 e §13 da RFC são **orientação ao chamador e
configuração de ambiente** — o logger não as força em código. Mantê-las fora das
tasks de código (#88/#89/#90) evita inflar tasks de código com prosa. Se a equipe
quiser o conjunto **mínimo absoluto**, o conteúdo pode ser absorvido no `Summary`
da Task #90; recomenda-se, porém, mantê-la separada e de baixa prioridade.

## Pontos do README a corrigir (estado atual → alvo)

| Local (aprox.) | Hoje | Alvo |
|---|---|---|
| linha ~400 | `audit(data: unknown)` "apenas UM argumento" | `audit(_msg: string, body: unknown)` |
| linha ~405 | "aceita exatamente um argumento"; oversize "descartado com ERROR" | dois parâmetros; oversize **quebrado** + ERROR `AUDIT_OVERSIZE` (§8) |
| linha ~412 | lista de campos a não pôr no corpo | reconciliar: `_msg`/`audit_id` **são** envelope; `traceId`/`spanId`/`host`/`tenant`/`pid`/`ppid` fora da auditoria |
| linha ~413 | "limita o body a 256KB; acima é descartado" | quebra em linhas ~200KB; nada de descarte silencioso |
| linha ~414 | dados estruturados | manter, ampliar com §10 (rótulos de baixa cardinalidade) |
| linha ~610 | `.audit(...messages: any[])` | `.audit(_msg, body)` |

## Conteúdo novo a adicionar

- **§7 Auditar a intenção:** "atualização de N itens correspondentes ao filtro X"
  em vez da consulta com o array `$in` expandido. A contingência (§8) é exceção, não caminho.
- **§10 Modelagem:** `body` é achatado em `body.*` pelo Victoria Logs no ingest;
  use rótulos estáveis (`action`, `entity_type`, `result`); `_stream_fields=tag,level`
  (config do Victoria Logs — `audit_id`/`body.entity_id` ficam como campos comuns indexados).
- **§11 LogsQL:** os 4 exemplos da RFC (autoria 24h; conteúdo por `audit_id`;
  `json_array_contains_any`; ocorrências de `AUDIT_OVERSIZE`).
- **§12 Matriz:** tabela de "o que vai no corpo / contingência / proibido".
- **§13 Dados sensíveis:** redigir **só** senha/segredo/token/chave com `filter()`
  (em `lib/util/Objects.ts`, já exportado); **PII visível**; jamais auto-mascarar
  no caminho de auditoria (requisito negativo reforçado pela Task #89).

## Observação de consistência

Os exemplos LogsQL e os nomes de campos devem refletir exatamente o que as tasks
#89 (envelope: `_msg`, `audit_id`, `_time`, `body.*`) e #90 (`chunked`, `chunk_seq`,
`chunk_total`, `chunk_field`, `AUDIT_OVERSIZE`) emitem. Por isso esta task vem
**depois** delas.

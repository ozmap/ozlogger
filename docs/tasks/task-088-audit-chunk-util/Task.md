# Task #88: Util Reutilizável de Quebra de Logs de Auditoria (`AuditChunk`)

> RFC: [RFC-OZLOGGER-AUDIT-001](../../rfc/RFC-OZLOGGER-AUDIT-001.md) §5, §8 (8.1), §9

## Objetivo

Criar um **módulo utilitário puro e reutilizável** que implementa a lógica de
quebra de registros de auditoria grandes em segmentos de tamanho seguro para o
Victoria Logs. Esta é a peça central da RFC: a quebra precisa ser feita **uma
única vez, num único lugar**, e exportada de forma que **qualquer outro projeto
da DevOZ a use exatamente da mesma maneira** (mesma entrada → mesma saída,
byte a byte).

## Descrição

Hoje a quebra não existe: o `audit()` simplesmente **descarta** corpos acima de
256 KB (`lib/Logger.ts`, branch de oversize). A RFC (§8) exige uma contingência
que nunca perca dados, quebrando os **valores** (não o envelope) em linhas de
até ~200 KB.

Esta task entrega **apenas a matemática da quebra**, como funções puras, sem
qualquer efeito colateral (não escreve em `stdout`/`console`, não importa o
`Logger`, não formata nem coloriza). O módulo recebe um corpo e devolve **dados
planos** (linha de cabeçalho + linhas de segmento) que o consumidor emite. Assim
o `Logger` (Task #90) e qualquer projeto externo compartilham a mesma lógica,
sem fork.

Arquivo novo proposto: `lib/util/AuditChunk.ts`, exportado por `lib/index.ts`.

## Escopo

### Inclui

- Função de topo `splitAuditBody(body, opts)` → `{ header, segments[] }` (dados planos).
- Gerador de `audit_id` (ULID inline, **zero dependências**) reutilizado pelo envelope (Task #89) e pela quebra (Task #90).
- Helpers de baixo nível, também exportados para composição por outros projetos:
  - `byteLen(value)` — tamanho em bytes UTF-8 via `Buffer.byteLength`.
  - `splitFirstLevel(body, limit)` → `{ skeleton, heavy[] }`.
  - `chunkArrayByBytes(arr, limit)` e `chunkStringByBytes(str, limit)`.
  - `countChunks(heavy, limit)`.
  - Construtor de marcador `{ ref, type, bytes, sha1 }` (sha1 via `node:crypto`).
- Constante `SAFE_LINE_BYTES = 200 * 1024`.
- Tratamento de **estouro por número de campos** (§8.1, §5): quando o corpo tem
  mais chaves de primeiro nível do que o limite, distribuir o conjunto de chaves
  entre linhas correlacionadas pelo mesmo `audit_id`.

### Não inclui

- Emissão para `stdout`/cliente de log (fica na Task #90).
- Mudança da assinatura do `audit()` (Task #89).
- Documentação de consulta/modelagem (Task #91).

## Critérios de Aceitação

- [ ] `lib/util/AuditChunk.ts` **não importa** `Logger` e **não produz nenhuma
      saída** em `process.stdout`/`console` ao rodar (provado por espião nos testes).
- [ ] `splitAuditBody` retorna `{ header, segments[] }` como **dados puros** (não emite nada).
- [ ] `splitFirstLevel(body, SAFE_LINE_BYTES)` preserva **todas** as chaves de
      primeiro nível no `skeleton`; chaves que cabem ficam inline; cada chave que
      excede é substituída por **exatamente** `{ ref: 'body.<campo>', type, bytes, sha1 }`,
      com `bytes = Buffer.byteLength(serializado)` e `sha1 = sha1(serializado)`.
- [ ] A divisão é **por bytes** (`Buffer.byteLength`), nunca por contagem de itens:
      cada segmento serializado tem tamanho `<= SAFE_LINE_BYTES` mesmo com itens de tamanhos variados.
- [ ] Campo **array** grande → segmentos com `body: { [campo]: <fração> }` (fragmento JSON, consultável), **sem** `chunk_part`.
- [ ] Campo **escalar/blob** grande → segmentos com `chunk_part: '<fração de texto>'`, **sem** `body[campo]`;
      concatenar `chunk_part` na ordem de `chunk_seq` reproduz o valor original serializado.
- [ ] Estouro por nº de campos: corpo com mais chaves que o limite gera múltiplas
      linhas correlacionadas (nenhuma linha excede o limite de campos).
- [ ] `auditId()` gera identificador de formato estável (ULID 26 chars Crockford base32), **sem novas dependências de runtime**.
- [ ] `SAFE_LINE_BYTES === 200 * 1024` e é distinto do gatilho do `Logger`.
- [ ] Cobertura unitária em arquivo isolado `tests/auditChunk.test.ts` (importando o util **sem** o `Logger`).

## Prioridade

🔴 Crítico (fundação — bloqueia a Task #90)

## Dependências

- Nenhuma a montante. **Bloqueia** a Task #90 e fornece `auditId()`/contrato de envelope à Task #89.

## Estimativa

- **Esforço:** 2 dias
- **Complexidade:** Média-Alta

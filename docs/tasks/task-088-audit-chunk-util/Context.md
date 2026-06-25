# Contexto Técnico - Task #88

## Por que um util puro e separado

A RFC (§9) traz a `auditChunked()` chamando `splitFirstLevel`, `chunkArrayByBytes`,
`chunkStringByBytes`, `countChunks`, `byteLen`. O requisito do produto é que
**a quebra seja feita igual em todo lugar** — `audit()` interno, a `auditChunked()`
da ferramenta de importação e quaisquer outros projetos DevOZ. A única forma de
garantir isso é uma função pura, sem efeito colateral, exportada pelo pacote.

> Princípio: **a quebra calcula; o consumidor emite.** O util retorna estruturas
> de dados; quem escreve em `stdout` é o `Logger` (Task #90). Isso mantém o util
> testável isoladamente e idêntico entre projetos.

## Arquivo novo

`lib/util/AuditChunk.ts` — não existe ainda (confirmado: não há código de
chunk/split/ulid em `lib/`). Deve usar apenas `node:crypto` (já usado em
`lib/util/Objects.ts` para sha1) — **nenhuma dependência nova**.

## API proposta (superfície exportada)

```ts
export const SAFE_LINE_BYTES = 200 * 1024; // margem abaixo do limite de 256KB do Victoria Logs

/** Tamanho em bytes UTF-8 do valor já serializado. */
export function byteLen(value: unknown): number;

/** Gera um audit_id ULID (26 chars, Crockford base32), monotônico, zero-dep. */
export function auditId(): string;

/** Separa o primeiro nível: o que cabe vira skeleton inline; o que excede vira marcador. */
export function splitFirstLevel(
  body: Record<string, unknown>,
  limit: number
): { skeleton: Record<string, unknown>; heavy: Array<[string, unknown]> };

export function chunkArrayByBytes(arr: unknown[], limit: number): unknown[][];
export function chunkStringByBytes(str: string, limit: number): string[];
export function countChunks(heavy: Array<[string, unknown]>, limit: number): number;

/** Marcador para um valor pesado removido do skeleton. */
export function heavyMarker(field: string, value: unknown):
  { ref: string; type: string; bytes: number; sha1: string };

/**
 * Função de topo: dado um corpo, devolve a linha de cabeçalho e as linhas de
 * segmento como DADOS PUROS (não emite nada). Quem consome adiciona o envelope
 * (audit_id, _time, level...) e escreve.
 */
export function splitAuditBody(
  body: unknown,
  opts: { limit?: number; auditId?: string }
): {
  header: { body: Record<string, unknown>; chunked: true; chunk_total: number };
  segments: Array<
    | { chunk_seq: number; chunk_total: number; chunk_field: string; body: Record<string, unknown> }   // array
    | { chunk_seq: number; chunk_total: number; chunk_field: string; chunk_part: string }               // escalar/blob
  >;
};
```

> Estável para outros projetos: `splitAuditBody`, `auditId`, `SAFE_LINE_BYTES`,
> `heavyMarker`. Os chunkers de baixo nível são exportados para composição, mas
> `splitAuditBody` é o ponto de entrada recomendado.

## Marcador de valor pesado (§8.1)

```jsonc
"result_csv": { "ref": "body.result_csv", "type": "string", "bytes": 5242880, "sha1": "ab12..." }
```

- `ref`  = `body.<campo>`
- `type` = tipo do valor (`'string'`, `'array'`, ...)
- `bytes`= `Buffer.byteLength(serialize(valor), 'utf8')`
- `sha1` = `createHash('sha1').update(serialize(valor)).digest('hex')`

## Segmentos (§8.1) — resolução da ambiguidade `chunk_total`/`chunk_seq`

A RFC tem uma inconsistência: §8.1 (prosa/exemplos) mostra `chunk_total: 34` no
**cabeçalho e nos segmentos** com `chunk_seq` como **sequência global**; já o
pseudocódigo da §9 usa `parts.length` por campo. **Resolução adotada (alinhada à
§8.1, que é a especificação):**

- `chunk_total` = **número total de linhas de segmento** (global), presente no cabeçalho e em cada segmento.
- `chunk_seq`   = índice **global** 0-based da linha de segmento.
- `chunk_field` = qual campo do corpo aquele segmento reconstrói.
- Reconstrução: coletar segmentos pelo `audit_id`, conferir que chegaram `chunk_total`,
  agrupar por `chunk_field`, ordenar por `chunk_seq`, concatenar (texto) ou unir (array).

> ⚠️ Decisão a confirmar — ver `Summary.md`. O default acima remove a ambiguidade.

## Estouro por número de campos (§8.1 / §5)

O Victoria Logs limita ~1000 campos por entrada e 128 bytes por nome de campo.
Quando o corpo tem chaves demais, a **mesma técnica** se aplica às chaves: o
conjunto é distribuído entre linhas de cabeçalho/segmento que compartilham o
`audit_id`. Default sugerido: dividir quando o nº de chaves de primeiro nível
ultrapassar um limite configurável (ex.: 900, com margem sob 1000).

## Referências no código

- `lib/util/Objects.ts` — uso de `createHash('sha1')` (padrão a seguir, sem dep nova).
- `lib/Logger.ts` linhas ~296-301 — branch de oversize que **descarta** hoje (será substituído pela Task #90 usando este util).
- RFC §9 — pseudocódigo de `auditChunked()` (fonte das funções).

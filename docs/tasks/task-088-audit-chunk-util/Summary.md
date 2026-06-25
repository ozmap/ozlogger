# Resumo Executivo - Task #88

## Visão Geral

| Campo | Valor |
|-------|-------|
| **ID** | task-088 |
| **GitHub** | [#88](https://github.com/ozmap/logger/issues/88) |
| **Título** | Util Reutilizável de Quebra de Logs de Auditoria (`AuditChunk`) |
| **RFC** | [RFC-OZLOGGER-AUDIT-001](../../rfc/RFC-OZLOGGER-AUDIT-001.md) §5, §8, §9 |
| **Prioridade** | 🔴 Crítico (fundação) |
| **Depende de** | — |
| **Bloqueia** | #90 (contingência) e fornece contrato a #89 |

## Impacto

Entrega o coração da RFC: a lógica de quebra de registros grandes como **função
pura e reutilizável**. Garante o requisito do produto — "todo lugar que quebrar
o log o faz igual" — porque há **uma única implementação**, exportada pelo
pacote e idêntica para `audit()`, `auditChunked()` e projetos externos.

## Decisões a confirmar (defaults já adotados nos docs)

1. **Gerador de `audit_id`:** ULID inline **zero-dep** (usa `node:crypto`, já
   presente). *Alternativas:* adicionar dependência `ulid` (fere a filosofia de
   1 dependência do projeto) ou usar `crypto.randomUUID()` (muda o formato dos
   exemplos LogsQL da RFC). **Recomendado: ULID inline.**
2. **`chunk_total`/`chunk_seq`:** adotada a semântica **global** da §8.1
   (`chunk_total` = total de segmentos; `chunk_seq` = índice global), resolvendo
   a divergência com o pseudocódigo per-campo da §9.
3. **Limite de estouro por nº de campos:** configurável, default ~900 (margem sob
   o teto de 1000 do Victoria Logs); guarda de nome de campo (128 bytes) é
   opcional nesta fase.
4. **Pureza/arquitetura:** o util **retorna dados e não emite** — a emissão é da
   Task #90. Decisão central para a reutilização entre projetos.

## Risco

Baixo isoladamente (sem efeito colateral, testável em unidade). O principal risco
é de **contrato**: o formato do `audit_id` e do envelope precisa ser combinado com
a Task #89 antes de a Task #90 integrar, para evitar retrabalho.

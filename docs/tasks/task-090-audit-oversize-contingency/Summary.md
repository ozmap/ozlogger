# Resumo Executivo - Task #90

## Visão Geral

| Campo | Valor |
|-------|-------|
| **ID** | task-090 |
| **GitHub** | [#90](https://github.com/ozmap/logger/issues/90) |
| **Título** | Contingência de Quebra (`audit`/`auditChunked`) + ERROR `AUDIT_OVERSIZE` |
| **RFC** | [RFC-OZLOGGER-AUDIT-001](../../rfc/RFC-OZLOGGER-AUDIT-001.md) §1.3, §3, §8, §9, §13 |
| **Prioridade** | 🟠 Alta |
| **Depende de** | #88 (util) **e** #89 (envelope) |
| **Bloqueia** | — |

## Impacto

Elimina a **perda silenciosa de dados** (hoje corpos grandes são descartados):
passa a quebrar os valores em linhas seguras, preservando o primeiro nível
consultável, e emite um ERROR `AUDIT_OVERSIZE` que sinaliza a necessidade de
correção na origem (auditar a intenção, §7). A `auditChunked()` é **dívida
técnica explícita** (`@deprecated`), criada para a ferramenta de importação e a
ser removida quando esta auditar por intenção.

Reforça o requisito do produto: tanto o `audit()` interno quanto a
`auditChunked()` quebram o log **chamando o mesmo util** (Task #88) — quebra
idêntica em todo lugar.

## Decisões a confirmar (defaults adotados nos docs)

1. **Escopo da quebra no `audit()` padrão:** o `audit()` executa a contingência
   **completa** (skeleton, marcadores, segmentos array/escalar, `chunk_*`,
   estouro por nº de campos), **não** apenas um ERROR mais barulhento. (Maior
   alavanca de esforço da decomposição — confirmado pela §9.)
2. **Forma da `auditChunked`:** **método do `Logger`** (acesso a `this.error`,
   `this.tag`, emissão de auditoria), exportado por `lib/index.ts`. *Alternativa:*
   função livre com `Logger` injetado.
3. **Gatilho:** quebra quando `envelope+corpo` excede `SAFE_LINE_BYTES` (~200 KB),
   substituindo o antigo descarte a 256 KB.
4. **§8.2 (pasta local):** **não** implementar — é estudo.

## Risco

Alto: é o maior volume de lógica nova e o ponto onde envelope (#89) e util (#88)
se encontram. Mitigação: util puro testado isoladamente (#88) e envelope de linha
única já fechado (#89) reduzem a superfície de integração desta task à emissão e
ao ERROR.

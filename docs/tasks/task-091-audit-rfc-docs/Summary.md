# Resumo Executivo - Task #91

## Visão Geral

| Campo | Valor |
|-------|-------|
| **ID** | task-091 |
| **GitHub** | [#91](https://github.com/ozmap/logger/issues/91) |
| **Título** | Documentação do Padrão de Auditoria (RFC-001) |
| **RFC** | [RFC-OZLOGGER-AUDIT-001](../../rfc/RFC-OZLOGGER-AUDIT-001.md) §7, §10, §11, §12, §13 |
| **Prioridade** | 🟢 Baixa (opcional / doc-only) |
| **Depende de** | #89 (nomes de campos); idealmente após #90 |
| **Bloqueia** | — |

## Impacto

Fecha a entrega da RFC para o consumidor: documenta a nova assinatura, o fim do
`body.0`, o princípio de auditar a intenção, a modelagem para consulta e a
política de dados sensíveis. Sem isso, o README continuaria descrevendo o
comportamento antigo (1 argumento, descarte no oversize) — informação incorreta
após #89/#90.

## Decisão a confirmar

- **Manter como task separada vs. absorver na #90.** Para o conjunto **mínimo
  absoluto**, pode ser dobrada no escopo da Task #90. Recomendação: manter
  separada e de baixa prioridade — é prosa, sem dependência de código além dos
  nomes finais de campos.

## Risco

Muito baixo (doc-only). Único cuidado: os exemplos LogsQL e nomes de campos devem
espelhar exatamente o que #89/#90 emitem — por isso vem depois delas.

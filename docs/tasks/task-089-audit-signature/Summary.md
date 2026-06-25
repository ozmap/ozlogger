# Resumo Executivo - Task #89

## Visão Geral

| Campo | Valor |
|-------|-------|
| **ID** | task-089 |
| **GitHub** | [#89](https://github.com/ozmap/logger/issues/89) |
| **Título** | Assinatura `audit(_msg, body)` e Isolamento do Envelope |
| **RFC** | [RFC-OZLOGGER-AUDIT-001](../../rfc/RFC-OZLOGGER-AUDIT-001.md) §1, §2, §6, §10–§11, §14 |
| **Prioridade** | 🔴 Crítico (API breaking) |
| **Depende de** | #88 (leve: `auditId()` + contrato de envelope) |
| **Bloqueia** | #90, #91 |

## Impacto

Encerra o estilo variádico e o campo `body.0`, define a mensagem de forma
explícita (`_msg`) e isola o corpo do envelope (sobrescrita de metadados torna-se
impossível). Habilita as consultas LogsQL da RFC (§11) — `_msg`, `audit_id` e
`body.*` passam a existir de forma plana e indexável. **Mudança quebra-contrato:**
chamadas antigas e leitores de `body.0` precisam migrar.

## Decisões a confirmar (defaults adotados nos docs)

1. **`_time` sempre presente e nomeado `_time`** (não `timestamp`) no envelope de
   auditoria, independentemente de `OZLOGGER_DATETIME`. Confirmar se demais níveis
   mantêm o `timestamp` gated (i.e. `_time` é exclusivo de auditoria) ou se o logger
   migra por inteiro. **Recomendado: `_time` exclusivo de auditoria.**
2. **`_msg` não-string com aridade 2:** **lançar `TypeError`** (erro de programação).
   *Alternativa:* `String(_msg)`.
3. **Campo depreciado `data`:** **removido** do envelope de auditoria (era a origem
   do `body.0`). `level` (= `'AUDIT'`) mantido por compat (consta na §6.1).
4. **Arquitetura de emissão:** branch específico de AUDIT em `json.ts` (corpo inteiro,
   `_time`, sem `getContext()`), combinado com o `buildAudit`. Deve bater **byte a byte**
   com o envelope das linhas de quebra da Task #90.

## Risco

Médio: é uma mudança quebra-contrato com impacto em consumidores e em toda a
suíte `tests/audit.test.ts`. Mitigação: caminho de linha única é pequeno e
independente; a contingência (mais arriscada) fica isolada na Task #90.

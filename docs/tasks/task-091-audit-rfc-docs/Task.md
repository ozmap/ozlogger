# Task #91: Documentação do Padrão de Auditoria (RFC-001)

> RFC: [RFC-OZLOGGER-AUDIT-001](../../rfc/RFC-OZLOGGER-AUDIT-001.md) §7, §10, §11, §12, §13
> **Opcional / pode ser absorvida** pelas tasks de código se a equipe quiser o conjunto mínimo absoluto.

## Objetivo

Atualizar a documentação do consumidor (README) para o novo padrão de auditoria:
nova assinatura, fim do `body.0`, princípio de **auditar a intenção**, modelagem
para consulta (LogsQL / `_stream_fields`), matriz de decisão do corpo e a política
de dados sensíveis. São conteúdos **doc-only** da RFC — não geram código no logger.

## Descrição

O README documenta hoje o comportamento **antigo** e agora **incorreto**:

- linha ~400 e ~405: "`audit()` aceita **exatamente um argumento**";
- linha ~405 e ~413: body acima do limite é "**descartado** com um ERROR";
- linha ~412: lista de campos a não incluir no corpo (a reconciliar com `_msg`/`audit_id`);
- linha ~610: assinatura antiga em `.audit(...)`.

Esta task alinha o README à RFC e adiciona a orientação de uso que o logger **não
pode forçar** (cabe ao chamador), fechando a entrega da RFC para quem consome o pacote.

## Escopo

### Inclui (tudo em `README.md`, doc-only)

- **Assinatura:** `audit(_msg: string, body: unknown)` (substitui "exatamente um argumento"); corpo vira `body.*`, fim do `body.0`; `_msg` e `audit_id` no envelope.
- **Oversize:** trocar "descartado" por "**quebrado** em linhas seguras + ERROR `AUDIT_OVERSIZE`" (§8); reconciliar a lista da linha ~412 com os novos campos de envelope.
- **§7 Auditar a intenção:** registrar filtro + contagem, não identificadores resolvidos; nunca logar a consulta bruta expandida.
- **§10 Modelagem para consulta:** rótulos estáveis de baixa cardinalidade; dados estruturados; recomendação `_stream_fields=tag,level` (config do Victoria Logs, **não** do logger).
- **§11 Consultas (LogsQL):** exemplos a/b/c/d (incl. `json_array_contains_any` e `_msg:~"AUDIT_OVERSIZE"`).
- **§12 Matriz de decisão do corpo:** o que vai inline, o que vira contingência, o que é proibido.
- **§13 Dados sensíveis:** redigir **apenas** senhas/segredos/tokens/chaves via `filter()` (já exportado); **e-mail, CPF e PII permanecem visíveis** (auditoria local, um tenant). **Nunca** mascarar PII no caminho de auditoria.

### Não inclui

- Qualquer mudança de código (coberta por #88/#89/#90).
- Configuração de servidor Victoria Logs / Fluent Bit (ambiente do cliente).

## Critérios de Aceitação

- [ ] README não afirma mais "exatamente um argumento" nem "descartado" para oversize.
- [ ] Seção da assinatura mostra `audit(_msg, body)` e exemplo de envelope com `_msg`/`audit_id`/`body.*`.
- [ ] Seção "Auditoria e bases de logs" cobre §7, §10, §11, §12, §13.
- [ ] Linha ~412 reconciliada: deixa claro que `_msg`/`audit_id` **fazem** parte do envelope e que `traceId`/`spanId`/`host`/`tenant`/`pid`/`ppid` **não** integram a auditoria (tratados no Fluent Bit / só no `body` se o produto exigir).
- [ ] Política de dados sensíveis explícita: `filter()` para senhas/segredos; PII visível; sem auto-máscara.
- [ ] Exemplos LogsQL presentes e coerentes com os campos realmente emitidos pelas tasks #89/#90.
- [ ] Assinatura na referência rápida (linha ~610) atualizada.

## Prioridade

🟢 Baixa (doc-only; sem bloqueio de deploy)

## Dependências

- **Depende de #89** (nomes finais de campos: `_msg`, `audit_id`, `_time`, `body.*`). Idealmente após #90 para documentar o ERROR/quebra com fidelidade.

## Estimativa

- **Esforço:** 0,5 dia
- **Complexidade:** Baixa

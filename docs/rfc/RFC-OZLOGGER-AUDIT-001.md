# RFC OZLOGGER-AUDIT-001 — Padrão de Auditoria do OZLogger

> **Versão:** 1.0 · **Status:** Proposta para revisão da equipe · **Data:** 2026-06-24
> **Assinatura:** `audit(_msg: string, body: unknown)` · **Destino:** Victoria Logs local (uma instância por cliente, host único)

Este documento define o canal de auditoria do OZLogger: a assinatura `audit(_msg, body)`, o fim do campo `body.0` e a ingestão garantida no Victoria Logs. A quebra de registros grandes é uma **medida de contingência** contra a perda silenciosa de dados, e **não um recurso**. O canal é independente do OpenTelemetry e permanece local, na máquina de cada cliente.

---

## Índice

1. [Sumário executivo](#1-sumário-executivo)
2. [Objetivos](#2-objetivos)
3. [Contexto](#3-contexto)
4. [O problema: registros de auditoria excessivamente grandes](#4-o-problema-registros-de-auditoria-excessivamente-grandes)
5. [Limites do Victoria Logs e consumo de memória](#5-limites-do-victoria-logs-e-consumo-de-memória)
6. [Assinatura e estrutura do registro](#6-assinatura-e-estrutura-do-registro)
7. [Princípio fundamental: auditar a intenção](#7-princípio-fundamental-auditar-a-intenção)
8. [Contingência: a quebra de registros grandes](#8-contingência-a-quebra-de-registros-grandes)
9. [Função temporária para a ferramenta de importação](#9-função-temporária-para-a-ferramenta-de-importação)
10. [Modelagem para consulta](#10-modelagem-para-consulta)
11. [Consultas (LogsQL)](#11-consultas-logsql)
12. [Matriz de decisão: conteúdo do corpo](#12-matriz-de-decisão-conteúdo-do-corpo)
13. [Observabilidade e dados sensíveis](#13-observabilidade-e-dados-sensíveis)
14. [Consequências](#14-consequências)
15. [Referências](#15-referências)

---

## 1. Sumário executivo

1. **Assinatura `audit(_msg, body)`.** O primeiro parâmetro é a mensagem (uma string); o segundo é o corpo do registro. A assinatura é fixa, o que encerra o estilo variádico e elimina o campo `body.0`. A mensagem `_msg` passa a ser definida de forma simples e explícita.
2. **O objetivo principal é auditar a intenção, não os dados expandidos.** Um registro de grande porte costuma indicar uma modelagem inadequada (por exemplo, gravar a consulta com toda a lista de identificadores). Registrar "atualização de N itens correspondentes ao filtro X" mantém o registro pequeno e dispensa qualquer quebra.
3. **A quebra de registros grandes é uma contingência, não um recurso.** Existe apenas para evitar a perda silenciosa de dados em casos extremos. Sempre que ocorre, emite um **ERROR de alta visibilidade com o `audit_id`**, indicando que a correção deve ser feita na origem. Não deve ser empregada como caminho habitual.
4. **Função temporária para a ferramenta de importação.** A função `auditChunked()` realiza a quebra em segmentos de até 256 KB enquanto a importação não for ajustada. Está marcada como `@deprecated` e **deve ser removida** assim que a importação passar a auditar por intenção (ver [§9](#9-função-temporária-para-a-ferramenta-de-importação)).
5. **O canal de auditoria é local e independente do OpenTelemetry.** Os campos `traceId`, `spanId`, `host` e `tenant` são tratados no Fluent Bit, no caminho do SigNoz, e não integram a auditoria. Os campos `severityText` e `severityNumber` são mantidos. Quanto a dados sensíveis, apenas senhas e segredos são redigidos; e-mail, CPF e demais dados pessoais permanecem visíveis.

---

## 2. Objetivos

| Objetivo | Como é atendido |
| --- | --- |
| 1 — Assinatura fixa `audit(_msg, body)` | Dois parâmetros; qualquer outra aridade lança erro. Sem estilo variádico e sem `body.0` ([§6](#6-assinatura-e-estrutura-do-registro)). |
| 2 — Mensagem (`_msg`) simples | É o primeiro parâmetro, sempre uma string explícita ([§6](#6-assinatura-e-estrutura-do-registro)). |
| 3 — Nenhuma perda silenciosa | A contingência quebra o que exceder o limite e sempre registra um ERROR com o `audit_id` ([§8](#8-contingência-a-quebra-de-registros-grandes)). |
| 4 — Ingestão estável no Victoria Logs | Linhas de até cerca de 200 KB. O Victoria Logs descarta linhas grandes para preservar memória; manter as linhas abaixo do limite elimina esse risco ([§5](#5-limites-do-victoria-logs-e-consumo-de-memória)). |
| 5 — Registros pequenos por padrão | Auditar a intenção ([§7](#7-princípio-fundamental-auditar-a-intenção)); a quebra é exceção. |
| 6 — Facilidade de consulta | Campos planos indexados, rótulos estáveis, `_msg` e o filtro `json_array_contains_any` ([§10](#10-modelagem-para-consulta), [§11](#11-consultas-logsql)). |

---

## 3. Contexto

O OZLogger é um módulo de logging compartilhado por diversos produtos da DevOZ. O padrão descrito a seguir é, portanto, genérico; os exemplos referentes a caixas, postes, cabos ou clientes são ilustrações do OZmap.

> [!NOTE]
> **A auditoria é um canal local, independente do OpenTelemetry.**
> A telemetria operacional é encaminhada ao SigNoz por meio do OpenTelemetry, consolidando informações de muitos clientes. Campos como `tenant`, `spanId`, `traceId`, `host` e atributos de recurso são gerados nesse fluxo e tratados diretamente no Fluent Bit; eles **não fazem parte da auditoria**. O canal de auditoria permanece exclusivamente na máquina do cliente (uma instância por cliente, com host único), no Victoria Logs local. Por tratar-se de um único tenant, o campo `tenant` é dispensável. O nível do registro (`severityText` e `severityNumber`) é mantido.

O comportamento atual do `audit()` herda o estilo de `console.log(a, b, c)`, que agrupa os argumentos em `{0: …}` (originando o `body.0`) e não impõe limite de tamanho. Este documento substitui esse comportamento pela assinatura `audit(_msg, body)` e pela contingência descrita adiante.

---

## 4. O problema: registros de auditoria excessivamente grandes

Considere o seguinte registro real (OZmap), aqui reduzido:

```json
{
  "_id": { "$oid": "66f310126d9a8f0020291299" },
  "request": "{\"query\":{\"$and\":[{\"_id\":{\"$in\":[ ...milhares de ObjectIds... ]}}]}}"
}
```

O volume decorre de um único campo, que serializou a consulta com a totalidade do array `$in`. Trata-se, essencialmente, de um **problema de modelagem**: registrou-se a consulta de implementação (a lista expandida) em vez da intenção da operação. A intenção — "atualizar o status de N itens correspondentes ao filtro X" — é pequena. A correção adequada ocorre na origem; nesse cenário, a quebra sequer deveria ser acionada.

---

## 5. Limites do Victoria Logs e consumo de memória

> [!WARNING]
> **O limite existe para proteger a memória.**
> Uma linha que exceda `-insert.maxLineSizeBytes` (valor padrão de 262144 bytes, equivalente a 256 KiB) é integralmente **descartada** durante o processamento, com registro de um aviso (WARN). A documentação indica que o objetivo é evitar a exaustão de memória. Registros próximos de 2 MB são processados de forma ineficiente. Manter cada linha pequena — auditando a intenção — é o que assegura uma ingestão estável.

| Limite | Valor | Consequência ao exceder |
| --- | --- | --- |
| Tamanho da linha | 256 KiB (padrão) | Linha descartada (proteção de memória), com aviso |
| Tamanho máximo do registro | cerca de 2 MB | Processamento ineficiente; elevar o parâmetro não resolve |
| Campos por entrada | 1000 (padrão) | Entrada rejeitada |
| Nome de campo | 128 bytes | Entrada ignorada |

---

## 6. Assinatura e estrutura do registro

A assinatura passa a ser `audit(_msg: string, body: unknown)`: o primeiro parâmetro é a mensagem e o segundo é o corpo. Qualquer aridade diferente de dois constitui erro de programação e lança uma exceção. Com isso, elimina-se o estilo variádico (e o `body.0`) e define-se a mensagem de forma explícita.

### 6.1. Envelope (logger) e corpo (chamador)

| Camada | Responsável | Campos |
| --- | --- | --- |
| **Envelope** (reservado) | Logger | `_time`, `level`, `severityText`, `severityNumber`, `tag`, `audit_id`, `_msg` (primeiro parâmetro) e os campos de quebra (`chunked`, `chunk_seq`, `chunk_total`, `chunk_field`). O chamador não escreve nesta camada. |
| **`body`** (área do chamador) | Chamador | O segundo parâmetro, tal como recebido. Se for um objeto, torna-se o conteúdo do corpo; se for um valor escalar, o corpo é o próprio valor. |

A mensagem `_msg` é fornecida em separado e é sempre uma string, pois o Victoria Logs a utiliza como o texto exibido e como alvo padrão da busca textual — um corpo do tipo objeto não ofereceria essa string. Não integram o envelope: `traceId`, `spanId`, `host` e `tenant` (tratados no Fluent Bit, conforme [§3](#3-contexto)) e `pid`/`ppid` (conforme [§6.4](#64-os-campos-pid-e-ppid-não-integram-o-padrão)).

### 6.2. Exemplo

```jsonc
// audit("alice login", { action: "login", user: "alice" }) produz:
{
  "_time": "2026-06-24T14:32:10.512Z",
  "level": "AUDIT",
  "severityText": "AUDIT",
  "severityNumber": 12,
  "tag": "MeuApp",
  "audit_id": "01J8Z9K3F7AB...",
  "_msg": "alice login",
  "body": { "action": "login", "user": "alice" }
}
```

### 6.3. O corpo como área isolada: proteção dos metadados

Como o segundo parâmetro torna-se o `body` por inteiro, qualquer chave do chamador permanece contida no corpo e não afeta o envelope:

```jsonc
// audit("teste", { a: 1, LEVEL: "tentativa de sobrescrever o level" }) produz:
{
  "level": "AUDIT",
  "tag": "MeuApp",
  "audit_id": "01J8Z9...",
  "_msg": "teste",
  "body": { "a": 1, "LEVEL": "tentativa de sobrescrever o level" }
}
```

Regra de implementação: o logger **não distribui o corpo na camada superior**; atribui `entry.body = body` de uma só vez. Dessa forma, a sobrescrita de metadados torna-se estruturalmente impossível.

### 6.4. Os campos `pid` e `ppid` não integram o padrão

Esses campos são pertinentes apenas ao OZmap, que opera em cluster de processos. **Não fazem parte do padrão de auditoria.** Caso um produto específico necessite deles, devem ser incluídos no `body`, nunca no envelope.

---

## 7. Princípio fundamental: auditar a intenção

A forma correta de não exceder o limite é não produzir registros grandes:

- Quando a seleção é feita por filtro, registre o **filtro e a contagem** — não os identificadores resolvidos.
- Identificadores individuais devem ser registrados apenas quando relevantes (seleção manual ou exigência de rastreabilidade por item), em uma linha por item, de pequeno porte.
- **Não se deve registrar a consulta bruta de forma literal** (o caso da [§4](#4-o-problema-registros-de-auditoria-excessivamente-grandes)).

> [!TIP]
> **Resultado:** o registro de 5 MB da [§4](#4-o-problema-registros-de-auditoria-excessivamente-grandes), remodelado para a intenção, reduz-se a poucos KB. A contingência da [§8](#8-contingência-a-quebra-de-registros-grandes) não chega a ser acionada. Este é o estado desejado.

---

## 8. Contingência: a quebra de registros grandes

> [!WARNING]
> **Trata-se de uma contingência, não de um recurso.**
> A quebra existe por um único motivo: impedir que um registro grande seja perdido silenciosamente (descartado pelo logger ou pelo Victoria Logs). Destina-se a **casos extremos** e não deve ser tratada como caminho habitual de auditoria. Quando ocorre com frequência, há um defeito na origem, que deve ser corrigido conforme a [§7](#7-princípio-fundamental-auditar-a-intenção).

> [!IMPORTANT]
> **Toda quebra registra um ERROR com o `audit_id`.**
> Cada quebra emite, obrigatoriamente, um registro de nível ERROR contendo o `audit_id`, que informa a ocorrência e solicita a correção na origem. Esse ERROR segue para o fluxo operacional (SigNoz) e deve ser tratado como alerta.

```text
ERROR AUDIT_OVERSIZE audit_id=01J8Z9K3F7AB... : o registro excedeu 256KB e precisou
      ser quebrado em 34 partes. Esta é uma medida de contingência, não um recurso;
      reduza o volume na origem (auditar a intenção). Consulte a §7.
```

### 8.1. A quebra preserva o primeiro nível do corpo

Quando a quebra é inevitável, o corpo permanece utilizável, pois **quebram-se os valores, e não o envelope**. A linha de cabeçalho contém todas as chaves de primeiro nível; o valor que excedeu o limite é substituído por um marcador (`{ ref, type, bytes, sha1 }`, também consultável); e os dados volumosos são distribuídos em linhas de segmento, identificadas por `chunk_field` e associadas pelo mesmo `audit_id`.

```jsonc
// cabeçalho — esqueleto com todo o primeiro nível
{
  "_time": "...", "level": "AUDIT", "severityText": "AUDIT", "severityNumber": 12,
  "tag": "reports", "audit_id": "01J8Z9...", "chunked": true, "chunk_total": 34,
  "_msg": "report.generate",
  "body": {
    "action": "report.generate",   // inline — consultável
    "user": "alice",               // inline — consultável
    "result_csv": { "ref": "body.result_csv", "type": "string", "bytes": 5242880, "sha1": "ab12..." }
  }
}

// segmento — array: fração em formato JSON (consultável por json_array_contains_any)
{
  "...envelope...": "...", "audit_id": "01J8Z9...", "chunk_seq": 3, "chunk_total": 34,
  "chunk_field": "body.affected_ids",
  "body": { "affected_ids": ["64f8...e09", "..."] }   // ~5000 itens por segmento
}

// segmento — escalar ou blob: fração em texto (reconstruída por concatenação, via chunk_field)
{
  "...envelope...": "...", "audit_id": "01J8Z9...", "chunk_seq": 7, "chunk_total": 34,
  "chunk_field": "body.result_csv",
  "chunk_part": "<fração de ~150KB>"
}
```

Assim, mesmo no pior caso, o primeiro nível permanece consultável; apenas o conteúdo interno do campo volumoso requer reconstrução. A divisão é feita **por bytes**, e não por quantidade de itens. Caso o corpo possua um número de chaves elevado a ponto de exceder o limite de campos, a mesma técnica aplica-se às chaves: o conjunto é distribuído entre linhas que compartilham o `audit_id`.

### 8.2. Alternativa para estudo futuro

> [!NOTE]
> **Pasta local para fidelidade integral — para estudo, não adotada.**
> Cogitou-se gravar o conteúdo integral dos casos volumosos em uma pasta local (incluída no backup, já de longa duração, da máquina), mantendo no registro apenas o evento e uma referência. A proposta permanece como estudo, pelos seguintes motivos: introduz um ponto adicional de manutenção (arquivo, verificação de integridade, coleta de órfãos); diverge da filosofia do OZLogger, baseada apenas em stdout; e, com a auditoria por intenção ([§7](#7-princípio-fundamental-auditar-a-intenção)), os casos volumosos tornam-se raros. Caso a equipe retome a ideia, o local mais adequado seria o coletor (Fluent Bit) ou um componente auxiliar, preservando o logger. Registra-se para avaliação futura.

---

## 9. Função temporária para a ferramenta de importação

> [!CAUTION]
> **`auditChunked()` — `@deprecated`, temporária, a remover.**
> A ferramenta de importação ainda produz registros grandes (listas de identificadores). Até que seja ajustada para auditar por intenção ([§7](#7-princípio-fundamental-auditar-a-intenção)), esta função permite que a importação opere sem perda silenciosa de dados, dividindo o corpo em linhas de até 256 KB. **Não constitui um recurso e não deve ser utilizada em código novo.** Cada chamada que necessite dividir o corpo emite o ERROR descrito na [§8](#8-contingência-a-quebra-de-registros-grandes). A função deve ser removida tão logo a importação passe a auditar por intenção.

```ts
/**
 * @deprecated Função temporária (contingência) criada para a ferramenta de importação.
 * Não é um recurso. Divide um corpo grande em linhas de auditoria de até 256KB para
 * evitar a perda silenciosa no Victoria Logs, sempre emitindo um ERROR com o audit_id.
 * Remover quando a importação passar a auditar por intenção (resumo e filtro).
 */
const SAFE_LINE_BYTES = 200 * 1024; // margem abaixo do limite de 256KB do Victoria Logs

export function auditChunked(_msg: string, body: Record<string, unknown>): void {
  const id = ulid();
  const head = {
    _time: now(), level: 'AUDIT', severityText: 'AUDIT', severityNumber: 12,
    tag: logger.tag, audit_id: id, _msg,
  };

  if (byteLen(serialize({ ...head, body })) <= SAFE_LINE_BYTES) {
    return logger.audit(_msg, body); // coube: caminho normal, sem divisão
  }

  // foi necessário dividir — condição anômala; registre um ERROR com o audit_id.
  const { skeleton, heavy } = splitFirstLevel(body, SAFE_LINE_BYTES);
  const total = countChunks(heavy, SAFE_LINE_BYTES);
  logger.error(
    `AUDIT_OVERSIZE audit_id=${id}: o corpo excedeu 256KB e foi dividido em ` +
    `${total} partes. Contingência, não recurso; reduza na origem (§7). Remover no futuro.`
  );

  stdout({ ...head, body: skeleton, chunked: true, chunk_total: total });

  for (const [field, value] of heavy) {
    const parts = Array.isArray(value)
      ? chunkArrayByBytes(value, SAFE_LINE_BYTES)
      : chunkStringByBytes(stringify(value), SAFE_LINE_BYTES);

    parts.forEach((part, i) => stdout({
      _time: now(), level: 'AUDIT', tag: logger.tag, audit_id: id,
      chunk_seq: i, chunk_total: parts.length, chunk_field: `body.${field}`,
      ...(Array.isArray(value) ? { body: { [field]: part } } : { chunk_part: part }),
    }));
  }
}
```

> O `audit()` padrão aplica a mesma contingência internamente (divisão acompanhada de ERROR), de modo a nunca perder dados silenciosamente. A diferença é que `auditChunked()` é explícita, nomeada e marcada como `@deprecated` — o que facilita sua localização e posterior remoção.

---

## 10. Modelagem para consulta

Na ingestão, o Victoria Logs **achata o `body` em `body.*`** (objeto aninhado convertido em chaves separadas por ponto) e indexa cada campo — o que viabiliza consultas como `body.action:=login`. Recomenda-se:

- Empregar **rótulos estáveis e de baixa cardinalidade** no corpo (por exemplo, `action`, `entity_type`, `result`).
- Registrar **dados estruturados**, e não textos concatenados.
- Definir como _stream fields_ apenas campos de baixa cardinalidade — `tag` e `level`. Os campos `audit_id` e `body.entity_id` **não** devem compor os _stream fields_, pois, como campos comuns, já são indexados nativamente. Configuração sugerida: `_stream_fields=tag,level`.

---

## 11. Consultas (LogsQL)

> Nas consultas, os campos figuram em forma achatada (`body.x`), conforme indexados pelo Victoria Logs.

**a) Autoria de uma ação nas últimas 24 horas**

```text
_time:24h level:=AUDIT body.action:=client.import | fields _time, _msg, body.affected_count
```

**b) Conteúdo completo de uma operação (cabeçalho e segmentos)**

```text
level:=AUDIT audit_id:=01J8Z9K3F7AB...
```

**c) Verificar se o item 12345 foi afetado por uma operação em lote**

```text
level:=AUDIT audit_id:=01J8Z9K3F7AB... json_array_contains_any(body.affected_ids, "12345")
```

**d) Ocorrências de quebra (que devem ser raras)**

```text
level:=ERROR _msg:~"AUDIT_OVERSIZE" | fields _time, _msg
```

---

## 12. Matriz de decisão: conteúdo do corpo

| Tipo de dado | No corpo | Se exceder (contingência) | Não permitido |
| --- | --- | --- | --- |
| Identidade, ação e contagem | ✓ inline | — | — |
| Alteração de campo escalar | ✓ anterior/novo | — | — |
| Seleção por filtro | ✓ critério e contagem | — | identificadores resolvidos |
| Campo de tipo array de grande porte | cabeçalho e marcador | quebra §8 (array JSON) e ERROR | array completo em uma linha |
| Campo escalar ou blob de grande porte | marcador (`ref`/`bytes`/`sha1`) | quebra §8 (frações de texto) e ERROR | valor bruto inline |
| Consulta bruta (`$in` expandido) | — | — | de forma literal (a [§4](#4-o-problema-registros-de-auditoria-excessivamente-grandes)) |
| `pid` e `ppid` | apenas se o produto exigir | — | no envelope padrão |
| `tenant`, `traceId`, `spanId`, host | — | Fluent Bit → SigNoz | na auditoria |
| Senha, token, segredo, chave | — | — | **redigir** (`filter()`) |
| E-mail, CPF e dados pessoais | ✓ visíveis (auditoria local) | — | — |

---

## 13. Observabilidade e dados sensíveis

- **Ocorrência de quebra:** o ERROR `AUDIT_OVERSIZE` ([§8](#8-contingência-a-quebra-de-registros-grandes)) é o principal indicador. Cada ocorrência corresponde a uma auditoria a ser corrigida na origem e deve ser tratada como alerta.
- **Descarte no Victoria Logs:** recomenda-se monitorar `vl_rows_dropped_total` e o aviso de "linha longa". Com a contingência em funcionamento, esses valores permanecem em zero.
- **Integridade dos segmentos:** na reconstrução, deve-se verificar se foram recebidos os `chunk_total` segmentos esperados.

> [!IMPORTANT]
> **Dados sensíveis: a natureza local da auditoria define a regra.**
> Como a auditoria permanece exclusivamente na máquina do cliente (um único tenant, com dados do próprio cliente), não há risco de vazamento entre clientes. Por esse motivo, **redigem-se apenas senhas** — e credenciais equivalentes, como tokens, chaves de API e segredos, dado que uma credencial exposta é perigosa em qualquer contexto. **E-mail, CPF e demais dados pessoais permanecem visíveis**, por serem dados do próprio cliente, em seu ambiente. Recomenda-se utilizar `filter()` para remover senhas e segredos na emissão; dados pessoais não devem ser mascarados nem removidos.

---

## 14. Consequências

### Benefícios

- A assinatura `audit(_msg, body)` é previsível, elimina o `body.0` e resolve a definição da mensagem.
- Não há perda silenciosa de dados; quando a contingência é acionada, ela sinaliza a necessidade de correção.
- Os registros são pequenos por padrão (auditoria por intenção); a quebra é uma exceção rara.
- Mesmo em situação de excesso, o primeiro nível do corpo permanece consultável.
- O isolamento do corpo elimina a sobrescrita de metadados.

### Custos e migração

- As chamadas no estilo antigo (variádico) e os leitores de `body.0` devem migrar para `audit(_msg, body)` e `body.*`.
- A função `auditChunked()` constitui dívida técnica explícita: existe para a importação e deve ser removida ([§9](#9-função-temporária-para-a-ferramenta-de-importação)).
- O conteúdo interno de um campo dividido só é consultável após a reconstrução.
- Aridade incorreta passa a lançar erro, evidenciando-se em ambiente de desenvolvimento e de testes.

---

## 15. Referências

1. **OZLogger** — `github.com/ozmap/logger`. Módulo de logging compartilhado; arquitetura baseada em stdout; funções `mask()` e `filter()`.
2. **Victoria Logs** — *Key Concepts* e *FAQ* (achatamento de JSON; _stream fields_; limite de 128 bytes por nome de campo; número máximo de campos; tamanho de registro de cerca de 2 MB). <https://docs.victoriametrics.com/victorialogs/>
3. **Victoria Logs** — *Metrics* e parâmetros de configuração (`maxLineSizeBytes` de 256 KB; descarte de linhas grandes para preservar memória).
4. **Victoria Logs** — *LogsQL* (filtro `json_array_contains_any`; recomendação de campos separados em vez de JSON no `_msg`).
5. Bibliografia de apoio: *Designing Data-Intensive Applications* (M. Kleppmann); *Clean Architecture* (R. C. Martin); *Implementing Domain-Driven Design* (V. Vernon); *Learning Domain-Driven Design* (V. Khononov); *Enterprise Integration Patterns* (G. Hohpe e B. Woolf); *OWASP Logging Cheat Sheet*; *NIST SP 800-92*; *ISO/IEC 27001* e *27002*.

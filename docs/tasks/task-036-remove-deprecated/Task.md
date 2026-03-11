# Task #36: Remover Campos e Métodos Deprecados

## Objetivo

Limpar código legado para reduzir complexidade, tamanho do bundle e confusão na API pública.

## Descrição

O OZLogger possui métodos e campos marcados como deprecados que devem ser removidos na versão 0.3.x para simplificar a interface e reduzir o tamanho do código.

### Itens a Remover

**Métodos:**
- `silly()` - Nível muito verboso, não usado em produção
- `http()` - Substituído por info/debug
- `critical()` - Substituído por error
- `tag()` - Substituído por createLogger com tag
- `Logger.init()` - Substituído por createLogger

**Campos JSON:**
- `data` - Campo legado, usar `body`
- `level` - Campo legado, usar `severityText`

**Níveis:**
- `silly` (severity 1) - Desnecessário
- `http` (severity 8) - Confuso
- `critical` (severity 21) - Redundante com error

## Critérios de Aceitação

- [ ] Todos os métodos deprecados removidos
- [ ] Campos JSON legados removidos do output
- [ ] Níveis deprecados removidos dos enums
- [ ] Testes atualizados para refletir mudanças
- [ ] CHANGELOG atualizado com breaking changes
- [ ] Migration guide documentado

## Prioridade

🟡 **Médio** - Planejado para v0.3.x

## Estimativa

- **Esforço:** 1-2 dias
- **Complexidade:** Baixa
- **Breaking Change:** Sim

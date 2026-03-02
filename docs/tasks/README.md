# Tasks - OZLogger

Este diretório contém todas as tasks de desenvolvimento do OZLogger.

## Estrutura de Tasks

Cada task segue a estrutura:
- `Task.md` - Descrição da tarefa, objetivo, critérios de aceitação
- `Context.md` - Contexto técnico: arquivos afetados, código relevante
- `Progress.md` - Histórico de progresso, checklist, status atual
- `Summary.md` - Resumo executivo: impacto, prioridade, decisões

## Tasks Ativas

| ID | GitHub | Título | Prioridade | Status |
|----|--------|--------|------------|--------|
| [034](task-034-test-coverage/) | [#34](https://github.com/ozmap/ozlogger/issues/34) | Expandir Cobertura de Testes | 🔴 Crítico | Não Iniciado |
| [036](task-036-remove-deprecated/) | [#36](https://github.com/ozmap/ozlogger/issues/36) | Remover Deprecados | 🟡 Médio | Planejado v0.3.x |
| [037](task-037-process-hang-fix/) | [#37](https://github.com/ozmap/ozlogger/issues/37) | Corrigir Process Hang | 🔴 Crítico | Não Iniciado |
| [038](task-038-http-port-conflict/) | [#38](https://github.com/ozmap/ozlogger/issues/38) | Conflito de Porta HTTP | 🔴 Alta | Workaround |
| [039](task-039-timer-id-duplicate/) | [#39](https://github.com/ozmap/ozlogger/issues/39) | Timer ID Duplicado | 🔴 Alta | Workaround |
| [041](task-041-timer-memory-leak/) | [#41](https://github.com/ozmap/ozlogger/issues/41) | Timer Memory Leak | 🟡 Média | Não Iniciado |
| [042](task-042-colorize-fix/) | [#42](https://github.com/ozmap/ozlogger/issues/42) | Fix Colorização | 🟢 Baixa | Não Iniciado |
| [043](task-043-retry-buffer/) | [#43](https://github.com/ozmap/ozlogger/issues/43) | Retry & Buffer | 🔴 Crítico | Não Iniciado |
| [044](task-044-multi-transports/) | [#44](https://github.com/ozmap/ozlogger/issues/44) | Multi-Transportes | 🟠 Alta | Não Iniciado |
| [045](task-045-log-rotation/) | [#45](https://github.com/ozmap/ozlogger/issues/45) | Log Rotation | 🟡 Média | Bloqueado (#44) |
| [046](task-046-internal-metrics/) | [#46](https://github.com/ozmap/ozlogger/issues/46) | Métricas Internas | 🟡 Média | Não Iniciado |
| [047](task-047-jsdoc-docs/) | [#47](https://github.com/ozmap/ozlogger/issues/47) | Docs JSDoc | 🟢 Baixa | Não Iniciado |

## Prioridades

| Emoji | Nível | Descrição |
|-------|-------|-----------|
| 🔴 | Crítico | Bloqueia deploy ou causa bugs em produção |
| 🟠 | Alto | Importante para próxima release |
| 🟡 | Médio | Melhoria desejável |
| 🟢 | Baixo | Nice to have |
| ⚪ | Backlog | Futuro indefinido |

## Dependências

```mermaid
flowchart TD
    T034["#34\nTest Coverage"] --> T036["#36\nRemove Deprecated"]
    T034 --> T037["#37\nProcess Hang"]
    T037 --> T038["#38\nHTTP Port"]
    T038 --> T039["#39\nTimer ID"]
```

## Como Criar Nova Task

1. Criar issue no GitHub: `gh issue create --repo ozmap/ozlogger`
2. Criar pasta `task-NNN-nome-curto/` onde NNN é o número da issue
3. Criar os 4 arquivos obrigatórios
4. Atualizar esta tabela
5. Vincular ao IMPROVEMENTS.md ou ISSUES.md se aplicável

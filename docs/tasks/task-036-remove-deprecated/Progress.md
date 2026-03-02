# Progresso - Task #36: Remover Deprecados

## Status Atual

🟡 **Planejado para v0.3.x**

## Checklist de Subtarefas

### Fase 1: Preparação
- [ ] Verificar cobertura de testes atual
- [ ] Identificar todos os usos internos dos métodos deprecados
- [ ] Criar migration guide no README

### Fase 2: Remoção de Métodos
- [ ] Remover `silly()`
- [ ] Remover `http()`
- [ ] Remover `critical()`
- [ ] Remover `tag()`
- [ ] Remover `Logger.init()`

### Fase 3: Remoção de Campos JSON
- [ ] Remover `data` do output
- [ ] Remover `level` do output
- [ ] Atualizar interface de output

### Fase 4: Remoção de Enums
- [ ] Remover `silly` de LogLevels
- [ ] Remover `http` de LogLevels
- [ ] Remover `critical` de LogLevels
- [ ] Atualizar LevelTags

### Fase 5: Documentação
- [ ] Atualizar CHANGELOG
- [ ] Criar seção de migração
- [ ] Atualizar README
- [ ] Atualizar Agents.md

### Fase 6: Release
- [ ] Bump version para 0.3.0
- [ ] Rodar testes completos
- [ ] Publicar no npm

## Histórico de Progresso

| Data | Ação | Resultado |
|------|------|-----------|
| - | Task criada | Aguardando v0.3.x |

## Bloqueios

- **Dependência:** Task #34 (Test Coverage) deve ser concluída primeiro

## Notas

- Esta é uma mudança de breaking change
- Avisar usuários com antecedência via deprecation warnings
- Considerar manter aliases temporários na v0.3.0 com warnings mais fortes

# Task #43: Implementar Retry e Buffer para Logs

## Objetivo

Implementar um sistema de buffer e retry para garantir que logs não sejam perdidos em momentos de alta carga ou falha momentânea de I/O (embora `stdout` seja geralmente seguro, isso prepara para transportes futuros).

## Descrição

Em cenários de alta carga, escrever diretamente pode bloquear ou falhar. Um buffer permite agrupar escritas e tentar novamente em caso de falha, além de melhorar performance (batching).

## Critérios de Aceitação

- [ ] Implementar Ring Buffer ou array simples
- [ ] Implementar mecanismo de flush (por tamanho ou tempo)
- [ ] Implementar retry logs falhados (se aplicável ao transporte)
- [ ] Opção para configurar tamanho do buffer

## Prioridade

🔴 Crítico (Preparação para Transportes)

## Estimativa

- **Esforço:** 2-3 dias
- **Complexidade:** Média

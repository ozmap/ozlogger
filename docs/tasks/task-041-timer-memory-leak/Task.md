# Task #41: Memory Leak em Timers Não Finalizados

## Objetivo

Resolver o problema de memory leak causado por timers iniciados com `time()` que nunca são finalizados com `timeEnd()`.

## Descrição

Atualmente, o método `time(id)` adiciona um timestamp em um `Map` interno. Se `timeEnd(id)` nunca for chamado (por exemplo, em caso de erro no fluxo ou lógica condicional), essa entrada permanece para sempre. Em aplicações de longa duração, isso pode causar consumo excessivo de memória.

## Critérios de Aceitação

- [ ] Implementar mecanismo de limpeza para timers antigos
- [ ] Configuração de TTL (Time To Live) para timers (default razoável, ex: 5-10min)
- [ ] Log de aviso quando um timer é removido por expiração
- [ ] Testes validando que timers antigos são removidos
- [ ] Documentação atualizada sobre o comportamento

## Prioridade

🟡 Média-Alta

## Estimativa

- **Esforço:** 0.5 dia
- **Complexidade:** Baixa

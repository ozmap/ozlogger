# Task #42: Colorização Não Funciona em Alguns Terminais

## Objetivo

Garantir que a colorização de logs funcione corretamente em diferentes ambientes e terminais, e respeite as configurações padrão de desativação (NO_COLOR).

## Descrição

A detecção atual de suporte a cores é muito simples e falha em alguns terminais ou quando a saída é redirecionada, mas o usuário ainda deseja cores (ou vice-versa).

## Critérios de Aceitação

- [ ] Melhorar detecção de suporte a cores (considerar `FORCE_COLOR`, `NO_COLOR`)
- [ ] Garantir que `OZLOGGER_COLORS` tem precedência
- [ ] Testar em ambiente CI (onde geralmente não há TTY)

## Prioridade

🟢 Baixa-Média

## Estimativa

- **Esforço:** 0.2 dia
- **Complexidade:** Baixa

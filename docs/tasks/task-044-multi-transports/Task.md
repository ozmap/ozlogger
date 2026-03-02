# Task #44: Adicionar Suporte a Múltiplos Transportes

## Objetivo

Permitir que o logger envie dados para múltiplos destinos (Console, Arquivo, HTTP, Stream) simultaneamente, configuráveis via opções.

## Descrição

Atualmente o logger escreve fixo em `stdout`. A arquitetura baseada em transportes tornará o logger flexível para enterprise use-cases.

## Critérios de Aceitação

- [ ] Criar interface `Transport`
- [ ] Converter implementação atual de Console para `ConsoleTransport`
- [ ] Permitir array de transportes na configuração
- [ ] Garantir que falha em um transporte não afeta outros
- [ ] Implementar `FileTransport` básico como prova de conceito

## Prioridade

🟠 Alta

## Estimativa

- **Esforço:** 2-3 dias
- **Complexidade:** Média

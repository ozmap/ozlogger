# Task #34: Expandir Cobertura de Testes

## Objetivo

Expandir a cobertura de testes do OZLogger para incluir todos os cenários críticos, garantindo maior confiabilidade e facilitando refatorações futuras.

## Descrição

A cobertura de testes atual não inclui todos os cenários críticos. É necessário expandir os testes para cobrir:

- Integração com OpenTelemetry
- Servidor HTTP (rotas, erros, parsing)
- Comunicação cluster (eventos IPC)
- Edge cases no formatador JSON
- Performance/benchmark
- Configuração via variáveis de ambiente

## Critérios de Aceitação

- [ ] Cobertura mínima de 80% em linhas de código
- [ ] Todos os métodos públicos do Logger devem ter testes
- [ ] Testes de integração para servidor HTTP
- [ ] Testes de comunicação entre processos (cluster mode)
- [ ] Testes de edge cases (circular refs, tipos especiais)
- [ ] Benchmark documentado de performance
- [ ] CI configurado com threshold de cobertura

## Prioridade

🔴 **Crítico** - Bloqueia refatorações seguras e deploy confiável

## Estimativa

- **Esforço:** 3-5 dias
- **Complexidade:** Média-Alta

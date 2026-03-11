# Task #46: Adicionar Métricas Internas

## Objetivo

Expor métricas operacionais do logger para facilitar a observabilidade do próprio sistema de logging.

## Descrição

Saber quantos logs estão sendo gerados, quantos foram descartados (se houver buffer cheio), e latência de formatação é crucial para tunning.

## Critérios de Aceitação

- [ ] Contadores para cada nível de log (info, error, debug, etc.)
- [ ] Contador de erros internos do logger
- [ ] API para recuperar métricas (`logger.getMetrics()`)
- [ ] (Opcional) Integração com endpoint Prometheus

## Prioridade

🟡 Média

## Estimativa

- **Esforço:** 1 dia
- **Complexidade:** Baixa

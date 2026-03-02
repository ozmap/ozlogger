# Task #45: Implementar Log Rotation

## Objetivo

Implementar rotação de arquivos de log para o `FileTransport`, evitando arquivos gigantescos que consomem todo o disco.

## Descrição

Arquivos de log devem ser rotacionados com base em tamanho (ex: 10MB) ou tempo (ex: diário), mantendo um número máximo de arquivos antigos.

## Critérios de Aceitação

- [ ] Rotação por tamanho (maxSize)
- [ ] Rotação por tempo (daily/hourly) - Opcional para v1
- [ ] Limite de arquivos mantidos (maxFiles)
- [ ] Compressão de arquivos rotacionados (gzip)

## Prioridade

🟡 Média (Depende de Task #44)

## Estimativa

- **Esforço:** 2 dias
- **Complexidade:** Média

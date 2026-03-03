# Contexto Técnico - Task #42

## Estado Atual

A verificação é feita apenas olhando uma variável de ambiente ou configuração direta.

## Solução Recomendada

Utilizar uma biblioteca leve como `supports-color` ou implementar lógica similar seguindo padrões de mercado:
1. Se `OZLOGGER_COLORS` for definido, usar.
2. Se `NO_COLOR` (padrão) for definido, desativar.
3. Se `FORCE_COLOR` for definido, ativar.
4. Se é TTY (`process.stdout.isTTY`), ativar.
5. Caso contrário, desativar.

## Arquivos Afetados

- `lib/util/Helpers.ts` (função `colorized`)
- `lib/Logger.ts`

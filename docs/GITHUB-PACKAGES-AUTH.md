# Autenticação no GitHub Packages

O `@ozmap/logger` é publicado no **GitHub Packages**. Para instalar o pacote localmente ou dentro de containers, é necessário autenticar no registry `npm.pkg.github.com`.

Este documento descreve como configurar a autenticação e como autorizar repositórios da organização a consumir o pacote via CI.

---

## Script de autenticação automática

O script abaixo configura a autenticação em **dois ambientes de uma vez**:

1. **Local (`~/.npmrc`)** — para `npm install` / `pnpm install` direto na máquina
2. **Docker (`.env.github-packages`)** — para `docker compose` que precisa acessar o registry durante build

### Pré-requisitos

- [GitHub CLI (`gh`)](https://cli.github.com/) instalado e autenticado (`gh auth login`)
- `npm` instalado

### Como usar

1. Salve o script abaixo como `setup-registry.sh` na raiz do projeto que consome o pacote
2. Execute: `bash setup-registry.sh`
3. Pronto — `npm install` e `docker compose build` funcionam

### O script

```bash
#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# setup-registry.sh
#
# Configura autenticação no GitHub Packages para o scope @ozmap.
# Gera credenciais para dois ambientes:
#
#   1. ~/.npmrc          → usado por npm/pnpm install na máquina local
#   2. .env.github-packages → usado por docker compose para passar o token
#                             como build arg ou variável de ambiente
#
# Pré-requisitos:
#   - GitHub CLI (gh) instalado: https://cli.github.com/
#   - Estar logado no gh: gh auth login
#   - npm instalado
#
# Uso:
#   bash setup-registry.sh
# ============================================================================

# --- Configurações -----------------------------------------------------------
ORG_SCOPE="@ozmap"                          # Scope da org no registry
REGISTRY_URL="https://npm.pkg.github.com"   # Registry do GitHub Packages
NPMRC_PATH="${HOME}/.npmrc"                  # Arquivo global de configuração npm
NPMRC_BACKUP_PATH="${NPMRC_PATH}.bak.$(date +%Y%m%d%H%M%S)"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_ENV_FILE="${PROJECT_ROOT}/.env.github-packages"  # Arquivo de env para Docker
GH_HOST="github.com"
# -----------------------------------------------------------------------------

# Executa o gh ignorando GH_TOKEN/GITHUB_TOKEN do ambiente,
# para garantir que usa a credencial salva no gh auth login.
gh_safe() {
  env -u GH_TOKEN -u GITHUB_TOKEN gh "$@"
}

# Extrai os escopos OAuth do token atual do gh,
# lendo o header x-oauth-scopes da resposta da API.
extract_scopes() {
  gh_safe api -i /user 2>/dev/null \
    | tr -d '\r' \
    | awk -F': ' 'tolower($1)=="x-oauth-scopes" {print $2; exit}'
}

# Verifica se um escopo específico está presente na lista CSV de escopos.
has_scope() {
  local scope="$1"
  local scopes_csv="$2"
  tr ',' '\n' <<<"${scopes_csv:-}" | sed 's/^ *//; s/ *$//' | grep -Fxq "$scope"
}

# --- Verificação de dependências ---------------------------------------------
echo "==> Verificando GitHub CLI..."
command -v gh >/dev/null 2>&1 || { echo "Erro: gh não encontrado. Instale: https://cli.github.com/" >&2; exit 1; }

echo "==> Verificando npm..."
command -v npm >/dev/null 2>&1 || { echo "Erro: npm não encontrado." >&2; exit 1; }

# --- Ignorar tokens do ambiente -----------------------------------------------
# Se GH_TOKEN ou GITHUB_TOKEN estão definidos no shell, o gh CLI os usa em vez
# da credencial salva. O script ignora essas variáveis para garantir que o token
# obtido tenha os escopos corretos (read:packages).
if [[ -n "${GH_TOKEN:-}" ]] || [[ -n "${GITHUB_TOKEN:-}" ]]; then
  echo "==> Detectado GH_TOKEN/GITHUB_TOKEN no ambiente; ignorando para usar a credencial salva no gh."
fi

# --- Verificar autenticação no gh --------------------------------------------
echo "==> Verificando autenticação no gh..."
gh_safe auth status >/dev/null 2>&1 || {
  echo "Erro: não autenticado no gh. Execute: gh auth login -h ${GH_HOST}" >&2
  exit 1
}

# --- Verificar e solicitar escopo read:packages ------------------------------
# O token do gh precisa do escopo read:packages para acessar o GitHub Packages.
# Se não tiver, o script abre o fluxo de refresh interativo do gh.
echo "==> Verificando escopo read:packages no token do gh..."
SCOPES="$(extract_scopes)"

if ! has_scope "read:packages" "${SCOPES}"; then
  echo "==> Token atual sem read:packages; abrindo fluxo de refresh..."
  gh_safe auth refresh -h "${GH_HOST}" -s read:packages
  SCOPES="$(extract_scopes)"
fi

if ! has_scope "read:packages" "${SCOPES}"; then
  echo "Erro: o token do gh continua sem o escopo read:packages." >&2
  echo "Rode manualmente: gh auth refresh -h ${GH_HOST} -s read:packages" >&2
  exit 1
fi

# --- Obter token -------------------------------------------------------------
TOKEN="$(gh_safe auth token)"

if [[ -z "${TOKEN}" ]]; then
  echo "Erro: não foi possível obter token do gh." >&2
  exit 1
fi

# --- Configurar ~/.npmrc (ambiente local) ------------------------------------
# Faz backup do ~/.npmrc antes de substituir as entradas do @ozmap
# e o token do GitHub Packages, evitando perda acidental de configuração.
echo "==> Configurando ${NPMRC_PATH} (ambiente local)..."

if [[ -f "${NPMRC_PATH}" ]]; then
  cp "${NPMRC_PATH}" "${NPMRC_BACKUP_PATH}"
  echo "==> Backup criado em ${NPMRC_BACKUP_PATH}"
fi

touch "${NPMRC_PATH}"

TMP_NPMRC="$(mktemp)"
grep -v '^@ozmap:registry=' "${NPMRC_PATH}" \
  | grep -v '^//npm\.pkg\.github\.com/:_authToken=' \
  > "${TMP_NPMRC}" || true
mv "${TMP_NPMRC}" "${NPMRC_PATH}"

{
  echo "${ORG_SCOPE}:registry=${REGISTRY_URL}"
  echo "//npm.pkg.github.com/:_authToken=${TOKEN}"
} >> "${NPMRC_PATH}"

# Restringe permissões — o arquivo contém um token de acesso.
chmod 600 "${NPMRC_PATH}"

# --- Gerar .env.github-packages (ambiente Docker) ---------------------------
# Este arquivo é usado pelo docker compose para passar o token como variável
# de ambiente ou build arg. Exemplo no docker-compose.yml:
#
#   services:
#     app:
#       build:
#         args:
#           NPM_TOKEN: ${NPM_TOKEN}
#       env_file:
#         - .env.github-packages
#
# E no Dockerfile:
#
#   ARG NPM_TOKEN
#   RUN corepack enable && corepack prepare pnpm@9 --activate
#   RUN printf "@ozmap:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\n" "${NPM_TOKEN}" > ~/.npmrc \
#      && pnpm install --frozen-lockfile --prod \
#      && rm -f ~/.npmrc
echo "==> Gerando ${LOCAL_ENV_FILE} (ambiente Docker)..."
cat > "${LOCAL_ENV_FILE}" <<EOF
NPM_TOKEN=${TOKEN}
EOF

chmod 600 "${LOCAL_ENV_FILE}"

# --- Resultado ---------------------------------------------------------------
echo ""
echo "==> Configuração concluída!"
echo ""
echo "Arquivos atualizados:"
echo "  ${NPMRC_PATH}            → npm/pnpm install local"
echo "  ${LOCAL_ENV_FILE}  → docker compose build/up"
echo ""
echo "Agora você pode usar:"
echo "  npm install              → instala pacotes @ozmap localmente"
echo "  docker compose build     → build com acesso ao GitHub Packages"
echo "  docker compose up        → sobe containers normalmente"
```

> **Importante:** adicione `.env.github-packages` ao `.gitignore` do projeto consumidor — ele contém um token de acesso.

---

## Uso no Dockerfile

Exemplo de como usar o token durante o build:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Recebe o token como build arg (não fica na imagem final se usado em multi-stage)
ARG NPM_TOKEN

# Configura o registry e o token para o pnpm install
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-lock.yaml ./
RUN printf "@ozmap:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\n" "${NPM_TOKEN}" > ~/.npmrc && \
  pnpm install --frozen-lockfile --prod && \
  rm -f ~/.npmrc

COPY . .
CMD ["node", "dist/index.js"]
```

No `docker-compose.yml`:

```yaml
services:
  app:
    build:
      context: .
      args:
        NPM_TOKEN: ${NPM_TOKEN}
    env_file:
      - .env.github-packages
```

---

## Autorizando outros repositórios da organização

Quando o CI de **outro repositório** precisa instalar `@ozmap/logger` (ex: em um `npm install` dentro do GitHub Actions), o `GITHUB_TOKEN` daquele repositório **não tem acesso ao pacote por padrão**.

Existem duas formas de resolver isso:

### Opção 1: Autorizar repositórios nas configurações do pacote (recomendado)

Vá até as configurações do pacote na organização:

**https://github.com/orgs/ozmap/packages/npm/logger/settings**

Na seção **"Manage Actions access"**, clique em **"Add Repository"** e selecione os repositórios que devem ter acesso. Os repositórios autorizados poderão usar o `GITHUB_TOKEN` automático do Actions para instalar o pacote — **sem criar nenhum token adicional**.

```yaml
# .github/workflows/ci.yml do repositório consumidor
# Funciona sem secrets extras após autorizar o repositório
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      packages: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'
          scope: '@ozmap'
      - run: npm install
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Opção 2: PAT compartilhado (Organization Secret)

Se há muitos repositórios, crie um **Personal Access Token** com `read:packages` e adicione como Organization Secret (`ORG_NPM_TOKEN`):

```yaml
- run: npm install
  env:
    NODE_AUTH_TOKEN: ${{ secrets.ORG_NPM_TOKEN }}
```

> **A Opção 1 é preferível** porque usa o `GITHUB_TOKEN` nativo (sem secrets para rotacionar) e o controle de acesso é explícito e auditável na UI do pacote.

---

## Referências

- [GitHub Docs: Trabalhando com o registro npm do GitHub Packages](https://docs.github.com/pt/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [GitHub Docs: Configurando controle de acesso de pacotes](https://docs.github.com/pt/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility)
- [GitHub Docs: Publicando imagens Docker (referência de Actions + Packages)](https://docs.github.com/pt/actions/tutorials/publish-packages/publish-docker-images#publishing-images-to-github-packages)
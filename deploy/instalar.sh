#!/usr/bin/env bash
# Instala ou atualiza o Sistema de Avaliação do Atendimento (SEMAD) num servidor Ubuntu.
#
#   sudo bash deploy/instalar.sh
#
# O que faz (pode ser executado de novo para atualizar; nada é apagado):
#   1. instala Docker + Compose, git, curl e openssl;
#   2. clona/atualiza o projeto em /opt/avaliacao-semad;
#   3. no primeiro uso, cria o .env com segredos aleatórios e guarda as credenciais
#      em /root/avaliacao-semad-credenciais.txt (somente root lê);
#   4. sobe PostgreSQL + API + dashboard com docker compose e confere o /api/health;
#   5. agenda backup diário do banco (02:30) em /var/backups/avaliacao-semad, 30 dias de retenção.
#
# Qualquer variável do .env pode ser definida na chamada, no primeiro uso. Ex.:
#   sudo TOTEM_API_KEY='chave-ja-usada-no-totem' DASHBOARD_PORT=8080 bash deploy/instalar.sh
set -euo pipefail

DIR_APP="${DIR_APP:-/opt/avaliacao-semad}"
REPO="${REPO:-https://github.com/LouisCharlles/avaliacao-atendimento-semad-dashboard.git}"
BRANCH="${BRANCH:-master}"
DIR_BACKUP="${DIR_BACKUP:-/var/backups/avaliacao-semad}"
ARQ_CREDENCIAIS=/root/avaliacao-semad-credenciais.txt

passo() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
aviso() { printf '\033[1;33m[aviso] %s\033[0m\n' "$*"; }
falha() { printf '\033[1;31m[erro] %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || falha "Execute como root: sudo bash $0"

# ---------------------------------------------------------------- 1. pacotes
passo "Instalando dependências (Docker, Compose, git)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl openssl ca-certificates >/dev/null
if ! docker compose version >/dev/null 2>&1; then
  if ! apt-get install -y -qq docker.io docker-compose-v2 >/dev/null 2>&1; then
    aviso "Pacotes do Ubuntu indisponíveis; usando o instalador oficial do Docker."
    curl -fsSL https://get.docker.com | sh
  fi
fi
systemctl enable --now docker >/dev/null
docker compose version

# Permite ao usuário que chamou o sudo usar o docker sem sudo (logs, manutenção).
if [[ -n "${SUDO_USER:-}" && "$SUDO_USER" != root ]]; then
  usermod -aG docker "$SUDO_USER"
fi

# ---------------------------------------------------------------- 2. código
passo "Obtendo o código em $DIR_APP"
if [[ -d "$DIR_APP/.git" ]]; then
  git -C "$DIR_APP" fetch --quiet origin "$BRANCH"
  git -C "$DIR_APP" checkout --quiet "$BRANCH"
  git -C "$DIR_APP" merge --ff-only --quiet "origin/$BRANCH"
else
  git clone --quiet --branch "$BRANCH" "$REPO" "$DIR_APP"
fi
git -C "$DIR_APP" --no-pager log -1 --format='Versão: %h %s (%cd)' --date=short
cd "$DIR_APP"

# ---------------------------------------------------------------- 3. .env
porta_ocupada() { ss -ltnH "sport = :$1" | grep -q .; }
segredo_hex() { openssl rand -hex "$1"; }
# Senha legível (sem / + = que confundem shells e URLs), 20 caracteres.
senha() { openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | cut -c1-20; }

if [[ ! -f .env ]]; then
  passo "Criando .env de produção com segredos aleatórios"
  PORTA="${DASHBOARD_PORT:-8080}"
  porta_ocupada "$PORTA" && falha "A porta $PORTA já está em uso. Rode de novo com DASHBOARD_PORT=<outra porta>."
  PORTA_PG="${POSTGRES_HOST_PORT:-5432}"
  if porta_ocupada "$PORTA_PG"; then
    PORTA_PG=5433
    aviso "Porta 5432 ocupada no servidor; o PostgreSQL do sistema ficará em 127.0.0.1:$PORTA_PG."
  fi
  ATEND_USER="${ATENDIMENTO_USER:-ceat}"
  ATEND_PASS="${ATENDIMENTO_PASSWORD:-$(senha)}"
  ASSES_USER="${ASSESSORIA_USER:-astec}"
  ASSES_PASS="${ASSESSORIA_PASSWORD:-$(senha)}"
  CHAVE_TOTEM="${TOTEM_API_KEY:-$(segredo_hex 24)}"

  umask 077
  cat > .env <<EOF
# Gerado por deploy/instalar.sh em $(date -Iseconds). NÃO versionar.
POSTGRES_DB=${POSTGRES_DB:-avaliacao}
POSTGRES_USER=${POSTGRES_USER:-semad}
# Hexadecimal: vai dentro da DATABASE_URL, não pode ter caracteres especiais.
POSTGRES_PASSWORD=$(segredo_hex 24)
POSTGRES_HOST_PORT=$PORTA_PG
JWT_SECRET=$(segredo_hex 48)
TOTEM_API_KEY=$CHAVE_TOTEM
# Senhas iniciais: só valem no primeiro start (viram hash bcrypt).
# Depois troque com: docker compose exec api npm run set-password -- <usuario>
ATENDIMENTO_USER=$ATEND_USER
ATENDIMENTO_PASSWORD=$ATEND_PASS
ASSESSORIA_USER=$ASSES_USER
ASSESSORIA_PASSWORD=$ASSES_PASS
COOKIE_SECURE=${COOKIE_SECURE:-false}
DASHBOARD_PORT=$PORTA
EOF
  chmod 600 .env

  IP=$(hostname -I | awk '{print $1}')
  cat > "$ARQ_CREDENCIAIS" <<EOF
Sistema de Avaliação do Atendimento — SEMAD
Gerado em $(date '+%d/%m/%Y %H:%M')

Dashboard ............ http://$IP:$PORTA
Usuário Atendimento .. $ATEND_USER   senha: $ATEND_PASS
Usuário Assessoria ... $ASSES_USER   senha: $ASSES_PASS

Totem (área técnica ou .env do projeto do totem):
  EXPO_PUBLIC_API_URL   = http://$IP:$PORTA
  EXPO_PUBLIC_TOTEM_KEY = $CHAVE_TOTEM
EOF
  chmod 600 "$ARQ_CREDENCIAIS"
  NOVO=1
else
  passo "Mantendo o .env existente"
  NOVO=0
fi
PORTA=$(grep -E '^DASHBOARD_PORT=' .env | cut -d= -f2)
PORTA=${PORTA:-8080}

# ---------------------------------------------------------------- 4. subir
if [[ "${SEM_BUILD:-0}" == 1 ]]; then
  # Imagens montadas em outra máquina e carregadas com `docker load` (internet lenta no servidor).
  passo "Subindo os containers com as imagens já carregadas (sem build)"
  for img in postgres:16-alpine avaliacao-semad-api:latest avaliacao-semad-dashboard:latest; do
    docker image inspect "$img" >/dev/null 2>&1 || falha "Imagem $img não encontrada. Carregue-a com docker load antes."
  done
  docker compose up -d --no-build --pull never --remove-orphans
else
  passo "Construindo e subindo os containers (a primeira vez leva alguns minutos)"
  docker compose up -d --build --remove-orphans
  docker image prune -f >/dev/null
fi

passo "Aguardando a API responder"
for i in $(seq 1 60); do
  if curl -fsS -m 3 "http://127.0.0.1:$PORTA/api/health" >/dev/null 2>&1; then
    echo "OK: http://127.0.0.1:$PORTA/api/health"
    break
  fi
  if [[ $i -eq 60 ]]; then
    docker compose ps
    docker compose logs --tail=60 api
    falha "A API não respondeu em 3 minutos. Veja os logs acima."
  fi
  sleep 3
done
docker compose ps

# ---------------------------------------------------------------- 5. backup
passo "Configurando backup diário do banco"
install -d -m 700 "$DIR_BACKUP"
install -m 755 deploy/backup.sh /usr/local/bin/avaliacao-semad-backup
cat > /etc/cron.d/avaliacao-semad <<EOF
# Backup diário do banco do Sistema de Avaliação (SEMAD)
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 2 * * * root DIR_APP=$DIR_APP DIR_BACKUP=$DIR_BACKUP /usr/local/bin/avaliacao-semad-backup >> /var/log/avaliacao-semad-backup.log 2>&1
EOF
DIR_APP="$DIR_APP" DIR_BACKUP="$DIR_BACKUP" /usr/local/bin/avaliacao-semad-backup

# ---------------------------------------------------------------- firewall
if command -v ufw >/dev/null && ufw status | grep -q 'Status: active'; then
  ufw allow "$PORTA/tcp" >/dev/null && echo "ufw: porta $PORTA/tcp liberada."
fi

# ---------------------------------------------------------------- resumo
passo "Pronto"
if [[ $NOVO -eq 1 ]]; then
  cat "$ARQ_CREDENCIAIS"
  echo
  echo "Estas credenciais ficaram salvas em $ARQ_CREDENCIAIS (sudo cat para ver de novo)."
else
  echo "Dashboard: http://$(hostname -I | awk '{print $1}'):$PORTA"
fi

#!/usr/bin/env bash
# ==========================================================
# 🐍 SNACKE LIVE — Script de Inicialização Rápida no Termux
# Dispositivo Alvo: Android / POCO C65
# TikTok Alvo: @rainz878
# ==========================================================

set -e

echo "=========================================================="
echo "🐍 SNACKE LIVE — Instalador & Conector Termux Android"
echo "=========================================================="

# 1. Atualizar e instalar Node.js se necessário
echo "[1/4] Verificando ambiente e dependências do Termux..."
if ! command -v node &> /dev/null; then
    echo "Node.js não encontrado. Instalando via pkg..."
    pkg update -y && pkg install nodejs git -y
else
    echo "Node.js $(node -v) já está instalado!"
fi

# 2. Navegar para a pasta do conector
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 3. Configurar variáveis de ambiente
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo ""
    echo "[2/4] Configurando conexão com o Backend Railway..."
    
    # URL do Backend Railway
    read -p "Informe a URL do Backend Railway (ex: https://meu-snacke.up.railway.app): " INPUT_BACKEND_URL
    INPUT_BACKEND_URL="${INPUT_BACKEND_URL:-http://localhost:3000}"

    # Segredo do Webhook
    read -p "Informe o TERMUX_WEBHOOK_SECRET configurado no Railway: " INPUT_SECRET
    INPUT_SECRET="${INPUT_SECRET:-rainz878_snacke_secret_replace_me}"

    # Usuário TikTok
    read -p "Nome de usuário TikTok (padrão: rainz878): " INPUT_USER
    INPUT_USER="${INPUT_USER:-rainz878}"

    cat <<EOF > "$ENV_FILE"
TIKTOK_USERNAME=$INPUT_USER
BACKEND_URL=$INPUT_BACKEND_URL
TERMUX_WEBHOOK_SECRET=$INPUT_SECRET
EOF
    echo "Arquivo .env criado com sucesso!"
else
    echo "[2/4] Arquivo .env já existe. Utilizando configurações salvas."
fi

# 4. Instalar dependências se node_modules não existir
if [ ! -d "node_modules" ]; then
    echo "[3/4] Instalando dependências (tiktok-live-connector, dotenv)..."
    npm install --production
else
    echo "[3/4] Dependências prontas."
fi

# 5. Iniciar o conector
echo ""
echo "[4/4] Iniciando Conector TikTok LIVE..."
echo "Pressione Ctrl+C para parar a qualquer momento."
echo "=========================================================="
exec node termux-connector.js

# 🐍 SNACKE LIVE — Conector Termux (POCO C65 / Android)

Guia de execução oficial para conectar a LIVE TikTok de `@rainz878` ao backend da Snacke LIVE.

---

### 📱 Como Rodar no Android (POCO C65) via Termux

#### Método 1: Linha de comando direta (Mais rápido)

Abra o aplicativo **Termux** no POCO C65 e execute:

```bash
# 1. Instalar git e nodejs no Termux
pkg update -y && pkg install nodejs git -y

# 2. Baixar e rodar o script oficial do conector:
curl -sL https://SEU_DOMINIO_RAILWAY/termux/start-termux.sh | bash
```

---

#### Método 2: Clonando o repositório ou pasta `/termux`

```bash
cd termux
chmod +x start-termux.sh
./start-termux.sh
```

O script perguntará:
1. **URL do Backend Railway** (ex: `https://seu-app.up.railway.app`)
2. **TERMUX_WEBHOOK_SECRET** (o mesmo segredo configurado nas variáveis de ambiente da Railway)
3. **Usuário TikTok** (pressione Enter para usar `rainz878`)

---

### 🛡️ Variáveis de Ambiente do Termux (`termux/.env`)

```env
TIKTOK_USERNAME=rainz878
BACKEND_URL=https://seu-app.up.railway.app
TERMUX_WEBHOOK_SECRET=rainz878_snacke_secret_replace_me
```

---

### 📡 Rastreamento End-to-End

O conector gera logs transparentes para cada etapa:

```
[TERMUX] gift gift_123456789_5655_1 detected: Rose x1 de @usuario
[TERMUX] gift gift_123456789_5655_1 enviado com sucesso ao backend!
```

E no backend:
```
[WEBHOOK] gift_123456789_5655_1 received
[GIFT] Rose x1 @usuario
[GIFT] gift_123456789_5655_1 validated
[WS] Evento gift_123456789_5655_1 enviado para 1 cliente
[GAME] gift_123456789_5655_1 received
[GAME] gift_123456789_5655_1 applied
[ACK] gift_123456789_5655_1 aplicado pelo jogo
```

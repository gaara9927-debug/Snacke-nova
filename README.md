# 🐍 SNACKE LIVE — TikTok LIVE @rainz878

Aplicação profissional em tempo real construída para transmissões TikTok LIVE de **@rainz878**, com conector Termux executável no **Android (POCO C65)**, backend Node.js + WebSocket pronto para **Railway**, e jogo autônomo da cobra com IA (BFS/A* com análise de flood-fill anti-encarceramento).

---

## 🏗️ Arquitetura do Sistema

```
TikTok LIVE Real (@rainz878)
          ↓
Conector Termux (POCO C65)
          ↓ (POST /api/tiktok/webhook com Bearer/HMAC)
Backend Railway (Express + WebSocket)
    ├─ Deduplicação por eventId
    ├─ Validação de Secret & Replay Attack
    └─ Heartbeat contínuo (POST /api/tiktok/heartbeat)
          ↓ (WebSocket ws://.../ws)
Snacke LIVE (Frontend React + Canvas)
    ├─ IA Autônoma (BFS/A* + Análise de Espaço Livre)
    ├─ Distribuição Dinâmica de Maçãs
    ├─ Alerta visual com foto & @username do presenteador
    └─ Envio de ACK (gift_ack com eventId)
          ↓
Backend confirma: [ACK] eventId aplicado pelo jogo
```

---

## 📱 Instalação no Android / POCO C65 (Termux)

No aplicativo **Termux** do POCO C65:

```bash
# 1. Instalar dependências básicas
pkg update -y && pkg install nodejs git -y

# 2. Executar o inicializador automático:
curl -sL https://SEU_DOMINIO_RAILWAY/termux/start-termux.sh | bash
```

O script configurará automaticamente:
- `BACKEND_URL`: URL pública da Railway
- `TERMUX_WEBHOOK_SECRET`: Segredo de autenticação
- `TIKTOK_USERNAME`: `rainz878`

---

## 🎁 Tabela de Recompensas de Presentes

| Presente | Gift ID | Efeito no Jogo |
|---|---|---|
| 🌹 **Rosa** | `5655` | +2 Maçãs normais |
| 🍩 **Rosquinha** | `5827` | +6 Maçãs + 1 Maçã Dourada + Boost de Velocidade (12s) |
| ❤️ **Heart Me** | `5269` | +8 Maçãs + 2 Maçãs Douradas + Multiplicador 1.5x (15s) |
| 🌌 **Galáxia** | `5656` | **SUPER EVENTO GALÁXIA**: +20 Maçãs + 5 Douradas + 3 Cósmicas + Efeito Estrelado + 3x Pontos (30s) |
| 🎁 **Outros Presentes** | Dinâmico | Proporcional à quantidade de diamantes e contagem |

---

## 🛡️ Segurança & Anti-Fraude

1. **Autenticação Termux**: Todos os webhooks exigem `Authorization: Bearer <TERMUX_WEBHOOK_SECRET>` ou assinatura HMAC SHA-256.
2. **Deduplicação Rigorosa**: Cada presente gera um `eventId` único (`gift_{msgId}_{userId}_{giftId}_{count}`). O backend descarta duplicatas antes de qualquer processamento.
3. **Proteção de Combos**: Presentes de streak são tratados para evitar multiplicações intermediárias incorretas.
4. **Proteção contra Replay**: Timestamps fora da janela de tolerância são rejeitados.
5. **Rastreamento End-to-End com ACK**: O frontend devolve confirmação `{ type: "gift_ack", eventId }` após renderizar e aplicar o efeito.

---

## 📊 Endpoints da API

- `GET /health` — Verificação de saúde da aplicação
- `GET /api/tiktok/status` — Status completo do sistema (Backend, WebSocket, Termux, TikTok, LIVE, presentes reais)
- `GET /api/tiktok/leaderboard` — Ranking dos maiores presenteadores reais da sessão
- `POST /api/tiktok/heartbeat` — Heartbeat periódico do Termux (15s)
- `POST /api/tiktok/webhook` — Webhook de presentes reais do TikTok

---

## 🛠️ Variáveis de Ambiente (Railway)

| Variável | Descrição | Exemplo |
|---|---|---|
| `PORT` | Porta HTTP (Railway injeta automaticamente) | `3000` |
| `TERMUX_WEBHOOK_SECRET` | Chave secreta entre Termux e Railway | `rainz878_snacke_secret_...` |
| `TIKTOK_USERNAME` | Usuário TikTok a monitorar | `rainz878` |
| `NODE_ENV` | Ambiente de execução | `production` |

---

## 🧪 Executando os Testes

```bash
npm test
```
Verifica autenticação, deduplicação, pathfinding BFS da cobra e prevenção de encarceramento.

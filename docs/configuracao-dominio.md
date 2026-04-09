# Configuração de Domínio — FarmFlow / FarmFlow

## Contexto

- **VPS IP:** `187.77.255.92`
- **Domínio:** `farmflow.com.br`
- **DNS:** Registro.br (registro A criado apontando para o IP da VPS)
- **Portas internas:** Frontend `:5173` | Backend `:3000`

---

## Passo 1 — Verificar propagação do DNS

Após criar o registro A no Registro.br, aguardar a propagação (5 min a 24h).

Verificar em: https://www.whatsmydns.net

Ou via terminal:
```bash
ping farmflow.com.br
```
O IP retornado deve ser `187.77.255.92`.

---

## Passo 2 — Instalar e configurar Nginx

```bash
sudo apt update && sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/farmflow
```

Conteúdo do arquivo:

```nginx
server {
    listen 80;
    server_name farmflow.com.br www.farmflow.com.br;

    # Frontend (Vite/React)
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WhatsApp webhook
    location /webhook {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Ativar e recarregar:
```bash
sudo ln -s /etc/nginx/sites-available/farmflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Passo 3 — HTTPS com Let's Encrypt

> Executar somente após o DNS ter propagado.

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d farmflow.com.br -d www.farmflow.com.br
```

O Certbot configura o HTTPS automaticamente e agenda a renovação do certificado a cada 90 dias.

---

## Passo 4 — Atualizar variáveis de ambiente

No `.env` de produção na VPS:

```bash
FRONTEND_URL=https://farmflow.com.br
VITE_API_URL=https://farmflow.com.br
```

> Remover as portas `:5173` e `:3000` — o Nginx passa a ser o ponto de entrada.

Rebuildar os containers:
```bash
cd /app
docker compose down && docker compose up -d --build
```

---

## Passo 5 — Liberar portas no firewall

```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw reload
```

---

## Fluxo final

```
Usuário → https://farmflow.com.br (porta 443)
    └── Nginx (SSL termination)
         ├── /       → localhost:5173  (frontend React)
         └── /api/   → localhost:3000  (backend Node)
```

| Antes | Depois |
|---|---|
| `http://187.77.255.92:5173/login` | `https://farmflow.com.br/login` |
| `http://187.77.255.92:3000/api/` | `https://farmflow.com.br/api/` |
| Link proposta: `http://187.77.255.92:5173/p/2d7b2d41` | `https://farmflow.com.br/p/2d7b2d41` |

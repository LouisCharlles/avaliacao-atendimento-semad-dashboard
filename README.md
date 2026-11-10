# Avaliação do Atendimento — Projeto Web (API + Dashboard)

SEMAD · Prefeitura de São Luís

Este é o servidor do sistema de avaliação do atendimento. Ele recebe as avaliações enviadas pelo totem (projeto separado **avaliacao-semad-totem**, em React Native) e oferece o dashboard com login, gráficos e exportação.

| Parte | Pasta | Tecnologia |
|---|---|---|
| API | `api/` | Node.js + Express + PostgreSQL |
| Dashboard | `dashboard/` | React + Vite + Recharts |

```
 Totem Android (projeto avaliacao-semad-totem)
        │  POST /api/avaliacoes  (cabeçalho X-Totem-Key)
        ▼
 Navegador ──► http://SERVIDOR:8080 ──► nginx ──/api──► API Node/Express ──► PostgreSQL
              (login + dashboard)        (Docker)          (Docker)            (Docker)
```

## Implantação em produção (servidor Ubuntu)

Dentro do servidor, um único comando instala o Docker, baixa o projeto em `/opt/avaliacao-semad`, gera o `.env` com segredos aleatórios, sobe tudo e agenda o backup diário do banco:

```bash
curl -fsSL https://raw.githubusercontent.com/LouisCharlles/avaliacao-atendimento-semad-dashboard/master/deploy/instalar.sh | sudo bash
```

- No fim, o script mostra o endereço do dashboard, os usuários e senhas iniciais e a chave do totem. Tudo fica salvo em `/root/avaliacao-semad-credenciais.txt`, legível só pelo root.
- **Atualizar** para a versão mais nova do GitHub: rode o mesmo comando. O `.env` e o banco são mantidos.
- **Backup:** todo dia às 02:30, em `/var/backups/avaliacao-semad/`, com retenção de 30 dias. Para um backup manual: `sudo avaliacao-semad-backup`. A restauração está descrita em `deploy/backup.sh`.
- Para reaproveitar uma chave de totem que já está nos aparelhos, informe-a na primeira execução: `... | sudo TOTEM_API_KEY='chave' bash`.

## Subir com Docker Compose

```bash
cp .env.example .env        # edite TODAS as senhas e segredos
docker compose up -d --build
```

- Dashboard: `http://IP-DO-SERVIDOR:8080`. A mesma URL serve aos dois perfis: sem sessão aparece o login.
- No primeiro start são criados o banco, as tabelas, os 24 setores e os dois usuários.
- As senhas do `.env` (`ATENDIMENTO_PASSWORD`, `ASSESSORIA_PASSWORD`) só são lidas no primeiro start e ficam gravadas **apenas como hash bcrypt** (custo 12). O próprio usuário pode trocar a senha pelo link **Trocar senha** na tela de login (pede a senha atual; mínimo de 10 caracteres). Para redefinir sem saber a senha atual:

```bash
docker compose exec api npm run set-password -- atendimento
docker compose exec api npm run set-password -- assessoria
```

Dados de teste (opcional, **só em homologação**):

```bash
docker compose exec api npm run seed:demo -- 800 60   # 800 avaliações fictícias nos últimos 60 dias
```

### Ligação com o totem

O totem precisa de dois valores deste servidor:

| No servidor (`.env`) | No totem (`.env` do projeto do totem) |
|---|---|
| `http://IP-DO-SERVIDOR:${DASHBOARD_PORT}` | `EXPO_PUBLIC_API_URL` |
| `TOTEM_API_KEY` | `EXPO_PUBLIC_TOTEM_KEY` (mesmo valor) |

## Dashboard

- **Acesso:** login único em `/`. Os perfis **Atendimento** e **Assessoria Técnica** têm as mesmas permissões.
- **Filtros:** Hoje, 7, 30 ou 90 dias, Este mês, Mês anterior, Personalizado, e por setor.
- **Indicadores:** índice de satisfação geral, total de avaliações, nota média da CEAT, % de demandas resolvidas totalmente e comentários. Cada um traz a variação em relação ao período anterior.
- **Gráficos (Recharts):** distribuição das perguntas 1 a 4 em escala divergente, resolução da demanda (P5), evolução diária (volume ou satisfação), satisfação por setor e horários de pico.
- **Parte qualitativa:** tabela por setor com ordenação, e comentários com busca e filtro de positivos ou negativos.
- **Exportar:**
  - **PDF:** relatório com cabeçalho da SEMAD, indicadores, gráficos, tabelas e comentários.
  - **Excel:** abas Resumo, Por pergunta, Por setor, Evolução diária e Respostas (todas as respostas individuais).
- **Atualização:** os dados se renovam sozinhos a cada 2 minutos.

**Índice de satisfação** = % de respostas "Excelente/Bom" (na P4, "Muito satisfatório/Satisfatório"). No ranking por setor, considera as perguntas 2 a 4. Setores com menos de 10 avaliações aparecem em tom mais claro, porque o percentual ainda é pouco representativo.

Exemplos em `docs/prototipo/`: telas do dashboard, um PDF e um Excel gerados com dados fictícios.

## Segurança

- Senhas com hash **bcrypt**. O login leva o mesmo tempo para usuário existente ou inexistente.
- Sessão em **JWT dentro de cookie `httpOnly` + `SameSite=Strict`**, válida por 8 h. Com HTTPS, use `COOKIE_SECURE=true`.
- Limite de **10 tentativas de login erradas por IP a cada 15 min**. Todas as tentativas ficam registradas na tabela `auditoria_login`.
- `helmet`, validação de todas as entradas com `zod` e limite de 20 KB por requisição.
- Envio do totem autenticado por `X-Totem-Key` e limitado a 60 envios por minuto. **Atenção:** a chave fica dentro do APK, então mantenha a API acessível apenas pela rede interna.
- O envio é idempotente: cada avaliação traz um UUID, e um reenvio pela fila offline do totem não duplica o registro.

## Desenvolvimento local (sem Docker)

```bash
# API (precisa de um PostgreSQL rodando)
cd api && cp .env.example .env && npm install && npm run dev        # http://localhost:3000
# Dashboard (o proxy do Vite encaminha /api para localhost:3000)
cd dashboard && npm install && npm run dev                           # http://localhost:5173
```

## Endpoints

| Método | Rota | Acesso |
|---|---|---|
| GET | `/api/health` | público |
| GET | `/api/avaliacoes/config` | público (perguntas e setores) |
| POST | `/api/avaliacoes` | totem (`X-Totem-Key`) |
| POST | `/api/auth/login` · `/api/auth/logout` | público |
| GET | `/api/auth/me` | sessão |
| GET | `/api/painel?inicio=AAAA-MM-DD&fim=AAAA-MM-DD&setor=SIGLA` | sessão |
| GET | `/api/painel/exportar/excel?…` | sessão |
| GET | `/api/painel/respostas?…` | sessão |

Corpo esperado em `POST /api/avaliacoes`:

```json
{
  "clientId": "uuid-v4",
  "totemId": "totem-01",
  "respondidoEm": "2026-11-05T14:30:00.000Z",
  "setor": "COFP",
  "q1": 5, "q2": 4, "q3": 4, "q4": 3,
  "q5": "total | parcial | nao | andamento",
  "comentario": "opcional, até 1000 caracteres"
}
```

Notas `q1` a `q4`: 5 = Excelente/Muito satisfatório … 1 = Péssimo/Muito insatisfatório.

## Pontos de atenção

- A **lista de setores e perguntas é fixa** em `api/src/domain.js` e `dashboard/src/lib/dominio.ts`, e há uma cópia em `src/domain.ts` no projeto do totem. Ao mudar, altere os três arquivos.
- Fuso usado nos relatórios: `America/Fortaleza`.

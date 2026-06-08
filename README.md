# 🏷️ Gerador de Ofertas de Afiliado

Ferramenta para montar mensagens de ofertas de afiliado
(Mercado Livre, Netshoes, Shopee, Amazon…) prontas para colar em grupos de
WhatsApp, canais de Telegram e Instagram.

Roda na Vercel **sem custo**: o frontend é estático e há um **backend leve**
(Serverless Function) que serve apenas para consultar a API do Mercado Livre na
busca automática de produtos. Seus dados (ofertas e cupons) continuam salvos
**só no IndexedDB do seu navegador** — não há banco em nuvem.

---

## ✨ O que a ferramenta faz

- **Cadastro semi-automático de oferta:** cole a URL de um produto do Mercado
  Livre e a ferramenta busca **nome, preço atual, preço original e imagem**
  através do backend. Se não conseguir (sem credenciais, item indisponível),
  ela avisa e libera o **preenchimento manual**. Outras lojas são sempre manuais.
- **Gerenciador de cupons (na mesma tela da oferta):** cadastre os cupons de
  campanha que **você** descobriu (loja, tipo/valor de desconto, categoria,
  valor mínimo, validade). A ferramenta **sugere os cupons elegíveis** e
  **nunca sugere cupom vencido**.
- **Geração da mensagem:** monta o texto no template dos grupos de promoção,
  com a formatação do WhatsApp (`*negrito*`, `~riscado~`, `` `monospace` ``),
  **preview ao vivo** e botão **copiar**.
- **Histórico e exportação:** salva cada oferta gerada, com tabela ordenável,
  filtro por loja e exportação para **CSV** e **JSON**.

### O que a ferramenta NÃO faz (por decisão de escopo)

- ❌ Não gera link de afiliado (você gera no painel oficial e cola aqui).
- ❌ Não descobre cupons sozinha nem faz scraping de páginas de ofertas/cupons.
- ❌ Não automatiza login nas lojas.
- ❌ Não envia mensagens automaticamente — **isso é a Fase 2** (Baileys/Telegram).
  O código já está modular e preparado para receber esse módulo.

---

## 🧱 Stack

- **React + Vite** (frontend, build estático)
- **Vercel Serverless Function** (`/api`) — backend leve que faz o proxy
  autenticado para a API do Mercado Livre
- **IndexedDB** via [`idb`](https://github.com/jakearchibald/idb) (persistência local)
- **Tailwind CSS**
- Deploy na **Vercel**

---

## 🚀 Como rodar localmente

Pré-requisito: **Node.js 18+**.

```bash
# 1. Instalar as dependências
npm install

# 2. (Opcional) Configurar as credenciais do Mercado Livre — veja a seção abaixo.
#    Sem isso, a busca automática não funciona, mas o resto do app sim.
cp .env.example .env   # e preencha ML_CLIENT_ID / ML_CLIENT_SECRET

# 3. Rodar em modo desenvolvimento (abre em http://localhost:5173)
#    O Vite também serve o backend de /api em dev — não precisa de outro servidor.
npm run dev

# 4. Gerar o build de produção (gera a pasta dist/)
npm run build
```

---

## 🔑 Busca automática do Mercado Livre (credenciais)

> A API do Mercado Livre **deixou de ser aberta**: hoje exige autenticação
> mesmo para consultar um produto. Por isso a busca automática passa pelo nosso
> backend, que autentica com as credenciais de uma aplicação do ML. **Sem
> credenciais, o app funciona normalmente, mas você preenche os dados do
> produto manualmente.**

**Passo a passo:**

1. Acesse o [DevCenter do Mercado Livre](https://developers.mercadolivre.com.br/)
   e faça login.
2. Em **Suas aplicações → Criar aplicação**, crie uma app (qualquer nome).
3. Copie o **App ID** (`Client ID`) e a **Secret Key** (`Client Secret`).
4. Configure as variáveis de ambiente:
   - **Local:** crie um arquivo `.env` (copie de `.env.example`) com
     `ML_CLIENT_ID` e `ML_CLIENT_SECRET`.
   - **Vercel:** em **Settings → Environment Variables**, adicione as duas.

O backend gera e **renova o token automaticamente**. Os segredos ficam apenas
no servidor — nunca chegam ao navegador.

---

## ☁️ Deploy na Vercel (passo a passo)

1. **Suba o projeto para o GitHub** (já está em
   `github.com/SEU_USUARIO/gerador-ofertas-afiliado`; para um novo repositório,
   faça `git push` normalmente).
2. Acesse [vercel.com](https://vercel.com) e faça login com sua conta GitHub.
3. Clique em **Add New… → Project** e **importe** o repositório.
4. A Vercel detecta o Vite e a pasta `/api` automaticamente:
   - **Framework Preset:** Vite · **Build Command:** `npm run build` ·
     **Output Directory:** `dist`
5. (Opcional, p/ busca automática) Em **Environment Variables**, adicione
   `ML_CLIENT_ID` e `ML_CLIENT_SECRET`.
6. Clique em **Deploy**. Em ~1 minuto sua URL pública estará no ar.

> A cada `git push` na branch `master`, a Vercel **redeploya** automaticamente.
> Se adicionar/alterar variáveis de ambiente, faça um **Redeploy** para valerem.

---

## 🗂️ Estrutura do projeto

```
api/
└── ml-produto.js            # BACKEND: proxy autenticado p/ a API do Mercado Livre
src/
├── App.jsx                  # Navegação por abas (Nova oferta / Histórico)
├── main.jsx                 # Ponto de entrada do React
├── index.css                # Tailwind + classes utilitárias
├── lib/
│   ├── db.js                # Acesso ao IndexedDB (isolado)
│   ├── mlApi.js             # Cliente que chama o backend /api/ml-produto
│   ├── messageBuilder.js    # buildMessage() — função PURA (reusada na Fase 2)
│   ├── couponMatcher.js     # Regras de elegibilidade de cupom
│   ├── export.js            # Exportação CSV/JSON
│   └── constants.js         # Lojas e tipos de desconto
└── components/
    ├── OfferForm.jsx        # Oferta + sugestão de cupom + gerenciador + preview
    ├── MessagePreview.jsx   # Preview + copiar
    ├── CouponManager.jsx    # CRUD de cupons
    └── History.jsx          # Histórico + filtros + exportação
vite.config.js               # Vite + plugin que serve /api em desenvolvimento
```

---

## 🔮 Preparação para a Fase 2 (envio automático)

A arquitetura já isola os pontos que a Fase 2 vai reaproveitar:

- `lib/messageBuilder.js` → `buildMessage(offer, coupon)` é uma **função pura**:
  o módulo de envio (Baileys/WhatsApp, Telegram) gera a mesma mensagem sem
  duplicar lógica.
- `lib/db.js` concentra todo o acesso ao banco. O schema de `offers` já tem os
  campos reservados `statusEnvio`, `canal` e `enviadoEm` (criados como `null`).
- Em `components/OfferForm.jsx`, no método `salvar()`, há o marcador:
  `// FASE 2: ponto de integração do envio (Baileys/Telegram).`
- A pasta `/api` já existe: o disparo automático pode virar novas Serverless
  Functions ao lado de `ml-produto.js`.

---

## 📊 Modelo de dados (IndexedDB)

**Store `offers`:** `id`, `loja`, `nomeProduto`, `precoDe?`, `precoPor`,
`descontoPercent?`, `cupomCodigo?`, `linkAfiliado`, `urlImagem`,
`mensagemGerada`, `criadoEm`, _(reservados Fase 2:)_ `statusEnvio`, `canal`,
`enviadoEm`.

**Store `coupons`:** `id`, `codigo`, `loja`, `tipoDesconto`
(`'percentual'|'fixo'`), `valorDesconto`, `categoria`, `valorMinimo?`,
`validade`, `criadoEm`.

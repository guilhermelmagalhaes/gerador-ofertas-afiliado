# 🏷️ Gerador de Ofertas de Afiliado (Fase 1)

Ferramenta **100% no navegador** para montar mensagens de ofertas de afiliado
(Mercado Livre, Netshoes, Shopee, Amazon…) prontas para colar em grupos de
WhatsApp, canais de Telegram e Instagram.

Sem backend, sem banco em nuvem, sem custo. Os dados ficam salvos no
**IndexedDB do seu próprio navegador**.

---

## ✨ O que a ferramenta faz

- **Cadastro semi-automático de oferta:** cole a URL de um produto do Mercado
  Livre e a ferramenta busca **nome, preço atual, preço original e imagem** pela
  API pública. Se a API não responder no navegador (CORS/autenticação), ela
  avisa e libera o **preenchimento manual**. Outras lojas são sempre manuais.
- **Gerenciador de cupons:** cadastre os cupons de campanha que **você**
  descobriu (loja, tipo/valor de desconto, categoria, valor mínimo, validade).
  Ao montar uma oferta, a ferramenta **sugere os cupons elegíveis** e **nunca
  sugere cupom vencido**.
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

- **React + Vite** (somente frontend, build estático)
- **IndexedDB** via [`idb`](https://github.com/jakearchibald/idb)
- **Tailwind CSS**
- Deploy na **Vercel**

---

## 🚀 Como rodar localmente

Pré-requisito: **Node.js 18+**.

```bash
# 1. Instalar as dependências
npm install

# 2. Rodar em modo desenvolvimento (abre em http://localhost:5173)
npm run dev

# 3. Gerar o build de produção (gera a pasta dist/)
npm run build

# 4. (Opcional) Pré-visualizar o build localmente
npm run preview
```

---

## ☁️ Deploy na Vercel (passo a passo)

1. **Suba o projeto para o GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Gerador de ofertas de afiliado - Fase 1"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
   git push -u origin main
   ```
2. Acesse [vercel.com](https://vercel.com) e faça login com sua conta GitHub.
3. Clique em **Add New… → Project** e **importe** o repositório.
4. A Vercel detecta o Vite automaticamente. As configurações já vêm corretas:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Clique em **Deploy**. Em ~1 minuto sua URL pública estará no ar.

> A cada `git push` na branch `main`, a Vercel **redeploya** automaticamente.

---

## 🗂️ Estrutura do projeto

```
src/
├── App.jsx                  # Navegação por abas + estado compartilhado
├── main.jsx                 # Ponto de entrada do React
├── index.css                # Tailwind + classes utilitárias
├── lib/
│   ├── db.js                # Acesso ao IndexedDB (isolado)
│   ├── mlApi.js             # Consulta à API pública do Mercado Livre
│   ├── messageBuilder.js    # buildMessage() — função PURA (reusada na Fase 2)
│   ├── couponMatcher.js     # Regras de elegibilidade de cupom
│   ├── export.js            # Exportação CSV/JSON
│   └── constants.js         # Lojas e tipos de desconto
└── components/
    ├── OfferForm.jsx        # Cadastro de oferta + sugestão de cupom + preview
    ├── MessagePreview.jsx   # Preview + copiar
    ├── CouponManager.jsx    # CRUD de cupons
    └── History.jsx          # Histórico + filtros + exportação
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

---

## 📊 Modelo de dados (IndexedDB)

**Store `offers`:** `id`, `loja`, `nomeProduto`, `precoDe?`, `precoPor`,
`descontoPercent?`, `cupomCodigo?`, `linkAfiliado`, `urlImagem`,
`mensagemGerada`, `criadoEm`, _(reservados Fase 2:)_ `statusEnvio`, `canal`,
`enviadoEm`.

**Store `coupons`:** `id`, `codigo`, `loja`, `tipoDesconto`
(`'percentual'|'fixo'`), `valorDesconto`, `categoria`, `valorMinimo?`,
`validade`, `criadoEm`.

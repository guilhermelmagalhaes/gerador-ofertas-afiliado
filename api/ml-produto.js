// =============================================================================
// BACKEND (Vercel Serverless Function) — proxy autenticado para a API do ML.
//
// Por que existe:
//   1) O navegador não chama a API do ML diretamente (bloqueio de CORS).
//   2) Desde 2024 o ML também EXIGE autenticação na maioria dos endpoints
//      (/items, /products) — retorna 401/403 mesmo server-side sem token.
//   Este backend roda no servidor (sem CORS) E autentica, então a busca
//   automática volta a funcionar.
//
// Fluxo:
//   Frontend  ->  GET /api/ml-produto?url=<url-do-produto>
//   Backend   ->  obtém token de app -> consulta o ML -> normaliza -> responde
//                 { nome, precoPor, precoDe, urlImagem }
//
// Credenciais (configurar como Environment Variables na Vercel):
//   - ML_CLIENT_ID e ML_CLIENT_SECRET  -> recomendado. O backend gera o token
//     automaticamente (OAuth client_credentials) e o renova sozinho.
//   - ML_ACCESS_TOKEN                  -> alternativa rápida p/ teste (expira
//     em ~6h; tem prioridade se presente).
//   Sem credenciais, a busca falha graciosamente e a UI usa preenchimento
//   manual. Os segredos ficam SÓ no servidor, nunca chegam ao navegador.
//
// Continua SEM banco em nuvem: a persistência segue 100% no IndexedDB.
// =============================================================================

import { sessaoValida } from './_auth.js'

// Cache do token de app em memória (vive enquanto a função estiver "quente").
let tokenCache = { token: null, exp: 0 }

// Obtém um access token de aplicação. Ordem: token estático > cache > OAuth.
async function obterToken() {
  // 1) Token estático (teste rápido) tem prioridade.
  if (process.env.ML_ACCESS_TOKEN) return process.env.ML_ACCESS_TOKEN

  // 2) Cache ainda válido?
  if (tokenCache.token && Date.now() < tokenCache.exp) return tokenCache.token

  // 3) Gera via OAuth client_credentials (precisa de client id + secret).
  const clientId = process.env.ML_CLIENT_ID
  const clientSecret = process.env.ML_CLIENT_SECRET
  if (!clientId || !clientSecret) return null // sem credenciais configuradas

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  })
  const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })
  if (!resp.ok) return null
  const data = await resp.json()
  // Renova 60s antes de expirar para evitar usar token no limite.
  tokenCache = {
    token: data.access_token,
    exp: Date.now() + ((data.expires_in || 21600) - 60) * 1000,
  }
  return tokenCache.token
}

// Extrai o ID do Mercado Livre (formato MLB...) de uma URL.
function extrairIdMl(url) {
  if (!url || typeof url !== 'string') return null
  const match = url.match(/MLB-?(\d{5,})/i)
  if (!match) return null
  const id = 'MLB' + match[1]
  const ehCatalogo = /\/p\/MLB/i.test(url) // URLs de catálogo têm "/p/"
  return { id, ehCatalogo }
}

// Normaliza a resposta do endpoint /items/{id}.
function normalizarItem(data) {
  const imagem =
    data?.pictures?.[0]?.secure_url ||
    data?.pictures?.[0]?.url ||
    data?.thumbnail ||
    ''
  return {
    nome: data?.title ?? '',
    precoPor: data?.price ?? null,
    precoDe: data?.original_price ?? null,
    urlImagem: imagem,
  }
}

// Normaliza a resposta do endpoint /products/{id} (catálogo).
function normalizarProduto(data) {
  const imagem = data?.pictures?.[0]?.secure_url || data?.pictures?.[0]?.url || ''
  const box = data?.buy_box_winner ?? {}
  return {
    nome: data?.name ?? '',
    precoPor: box.price ?? null,
    precoDe: box.original_price ?? null,
    urlImagem: imagem,
  }
}

// Faz o fetch (com token opcional) e devolve o JSON, ou lança erro.
async function buscarJson(url, token) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const resp = await fetch(url, { headers })
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`)
  }
  return resp.json()
}

// Para produtos de CATÁLOGO: o endpoint /products/{id} nem sempre traz o
// buy_box_winner (e, portanto, o preço). Aqui buscamos o preço entre os
// ANÚNCIOS vinculados ao produto de catálogo (/products/{id}/items).
async function precoDosItens(id, token) {
  try {
    const data = await buscarJson(
      `https://api.mercadolibre.com/products/${id}/items?limit=10`,
      token,
    )
    const results = Array.isArray(data?.results) ? data.results : []
    if (!results.length) return null

    // 1) Se os anúncios já trazem preço, usa o menor (melhor oferta).
    const comPreco = results.filter((r) => typeof r.price === 'number')
    if (comPreco.length) {
      const melhor = comPreco.reduce((a, b) => (b.price < a.price ? b : a))
      return { precoPor: melhor.price, precoDe: melhor.original_price ?? null }
    }

    // 2) Senão, busca o primeiro anúncio completo em /items/{itemId}.
    const itemId = results[0].item_id || results[0].id
    if (itemId) {
      const item = normalizarItem(
        await buscarJson(`https://api.mercadolibre.com/items/${itemId}`, token),
      )
      return {
        precoPor: item.precoPor,
        precoDe: item.precoDe,
        urlImagem: item.urlImagem,
      }
    }
  } catch {
    // Ignora — mantém o que já tínhamos (preenchimento manual do preço).
  }
  return null
}

export default async function handler(req, res) {
  // Libera o acesso do frontend (útil em dev e previews de domínios distintos).
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  // Protege o recurso: só quem tem sessão válida pode usar a busca do ML
  // (evita que terceiros consumam suas credenciais do Mercado Livre).
  if (!sessaoValida(req)) {
    return res.status(401).json({ erro: 'NAO_AUTENTICADO' })
  }

  const url = (req.query?.url || '').toString()
  const extraido = extrairIdMl(url)
  if (!extraido) {
    return res.status(400).json({ erro: 'URL_INVALIDA' })
  }

  const { id, ehCatalogo } = extraido
  const token = await obterToken()
  // Sinaliza ao frontend que faltam credenciais (mensagem mais útil na UI).
  const semCredenciais = !token

  const urlItem = `https://api.mercadolibre.com/items/${id}`
  const urlProduto = `https://api.mercadolibre.com/products/${id}`

  // Tenta primeiro o endpoint mais provável conforme o tipo de URL.
  const tentativas = ehCatalogo
    ? [
        { url: urlProduto, normaliza: normalizarProduto },
        { url: urlItem, normaliza: normalizarItem },
      ]
    : [
        { url: urlItem, normaliza: normalizarItem },
        { url: urlProduto, normaliza: normalizarProduto },
      ]

  let ultimoErro
  for (const tentativa of tentativas) {
    try {
      const data = await buscarJson(tentativa.url, token)
      let resultado = tentativa.normaliza(data)

      // Se veio sem preço (comum em catálogo sem buy_box_winner), tenta
      // descobrir o preço pelos anúncios vinculados ao produto.
      if (resultado.precoPor == null) {
        const extra = await precoDosItens(id, token)
        if (extra) {
          resultado = {
            ...resultado,
            precoPor: extra.precoPor ?? resultado.precoPor,
            precoDe: extra.precoDe ?? resultado.precoDe,
            urlImagem: resultado.urlImagem || extra.urlImagem || '',
          }
        }
      }

      // Sem cache: o preço do produto muda com o tempo e queremos sempre o
      // valor atual (evita o navegador/CDN servir uma resposta antiga).
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json(resultado)
    } catch (erro) {
      ultimoErro = erro
    }
  }

  // Falhou: item exige auth (sem credenciais), item inexistente, etc.
  return res.status(502).json({
    erro: 'FALHA_API_ML',
    semCredenciais,
    detalhe: String(ultimoErro?.message || ultimoErro),
  })
}

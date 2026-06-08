// =============================================================================
// Consulta à API pública do Mercado Livre isolada neste módulo.
//
// IMPORTANTE (escopo validado):
//  - Não fazemos login, não geramos link de afiliado e não fazemos scraping.
//  - Usamos apenas a API pública de itens/produtos para PUXAR dados do produto.
//  - A API pode bloquear o navegador (CORS) ou exigir autenticação. Por isso,
//    qualquer falha vira um erro tratável e o app cai no preenchimento manual.
// =============================================================================

/**
 * Extrai o ID do Mercado Livre (formato MLB...) de uma URL colada.
 * Cobre os formatos mais comuns:
 *   - https://www.mercadolivre.com.br/.../p/MLB12345678   (catálogo)
 *   - https://produto.mercadolivre.com.br/MLB-1234567890-...-_JM
 *   - qualquer URL que contenha "MLB" seguido de dígitos
 *
 * @returns {{ id: string, ehCatalogo: boolean } | null}
 */
export function extrairIdMl(url) {
  if (!url || typeof url !== 'string') return null

  // Procura "MLB" seguido (opcionalmente) de um hífen e dígitos.
  const match = url.match(/MLB-?(\d{5,})/i)
  if (!match) return null

  const id = 'MLB' + match[1]
  // URLs de catálogo têm o trecho "/p/" antes do ID.
  const ehCatalogo = /\/p\/MLB/i.test(url)
  return { id, ehCatalogo }
}

// Normaliza a resposta do endpoint /items/{id} para o formato do app.
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

// Faz o fetch e devolve JSON, ou lança erro se o status não for OK.
async function buscarJson(url) {
  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`)
  }
  return resp.json()
}

/**
 * Busca os dados do produto no Mercado Livre a partir da URL colada.
 *
 * Tenta o endpoint adequado (item ou catálogo) e, em caso de falha,
 * tenta o outro como fallback. Se tudo falhar (CORS, 401, rede), lança
 * um erro — o componente captura e ativa o preenchimento manual.
 *
 * @param {string} url URL do produto no Mercado Livre.
 * @returns {Promise<{nome, precoPor, precoDe, urlImagem}>}
 */
export async function buscarProdutoMl(url) {
  const extraido = extrairIdMl(url)
  if (!extraido) {
    throw new Error('URL_INVALIDA')
  }
  const { id, ehCatalogo } = extraido

  const urlItem = `https://api.mercadolibre.com/items/${id}`
  const urlProduto = `https://api.mercadolibre.com/products/${id}`

  // Define a ordem de tentativa conforme o tipo de URL detectado.
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
      const data = await buscarJson(tentativa.url)
      return tentativa.normaliza(data)
    } catch (erro) {
      ultimoErro = erro
      // Tenta a próxima opção.
    }
  }

  // Nenhuma tentativa funcionou: deixa o componente tratar o fallback manual.
  throw new Error('FALHA_API_ML', { cause: ultimoErro })
}

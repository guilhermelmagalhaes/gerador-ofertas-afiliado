// =============================================================================
// Cliente da busca de produto do Mercado Livre.
//
// IMPORTANTE: o navegador NÃO chama mais a API do ML diretamente (era
// bloqueado por CORS). Agora chamamos o nosso BACKEND em /api/ml-produto,
// que roda no servidor da Vercel e faz o proxy para o Mercado Livre.
// A lógica de extração de ID e normalização vive no backend (api/ml-produto.js).
//
// Escopo mantido: não fazemos login, não geramos link de afiliado nem
// scraping — apenas LEITURA de dados públicos do produto.
// =============================================================================

/**
 * Validação rápida (client-side) para detectar um ID MLB na URL antes de
 * ir ao servidor. Evita uma requisição desnecessária em URLs claramente erradas.
 * @returns {boolean}
 */
export function temIdMl(url) {
  return typeof url === 'string' && /MLB-?\d{5,}/i.test(url)
}

/**
 * Busca os dados do produto chamando o backend (/api/ml-produto).
 *
 * @param {string} url URL do produto no Mercado Livre.
 * @returns {Promise<{nome, precoPor, precoDe, urlImagem}>}
 * @throws {Error} com message 'URL_INVALIDA' ou 'FALHA_API_ML' para o
 *                 componente decidir o fallback manual.
 */
export async function buscarProdutoMl(url) {
  if (!temIdMl(url)) {
    throw new Error('URL_INVALIDA')
  }

  let resp
  try {
    resp = await fetch(`/api/ml-produto?url=${encodeURIComponent(url)}`, {
      credentials: 'include', // envia o cookie de sessão
      cache: 'no-store', // sempre busca dados frescos (evita preço/cache antigo)
    })
  } catch {
    // Rede caiu ou backend indisponível (ex.: rodando sem o servidor).
    throw new Error('FALHA_API_ML')
  }

  if (!resp.ok) {
    // O backend devolve { erro: 'URL_INVALIDA' | 'FALHA_API_ML', semCredenciais }.
    const dados = await resp.json().catch(() => ({}))
    const erro = new Error(dados.erro || 'FALHA_API_ML')
    erro.semCredenciais = !!dados.semCredenciais
    throw erro
  }

  return resp.json()
}

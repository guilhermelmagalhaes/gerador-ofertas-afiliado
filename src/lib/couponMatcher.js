// =============================================================================
// Lógica de elegibilidade de cupom isolada (regra de negócio pura).
//
// A ferramenta NUNCA inventa nem busca cupons: trabalha apenas com os que o
// usuário cadastrou. Aqui decidimos QUAIS cupons cadastrados servem para um
// determinado produto, com base em: loja, validade, valor mínimo e categoria.
// =============================================================================

/**
 * Converte uma data 'YYYY-MM-DD' para um Date no início do dia (local).
 */
function paraDataLocal(yyyyMmDd) {
  if (!yyyyMmDd) return null
  const [ano, mes, dia] = yyyyMmDd.split('-').map(Number)
  if (!ano || !mes || !dia) return null
  return new Date(ano, mes - 1, dia)
}

/** Retorna o Date de hoje zerado (00:00) para comparações de dia. */
function hojeZerado() {
  const h = new Date()
  h.setHours(0, 0, 0, 0)
  return h
}

/** Cupom está vencido? (validade anterior a hoje) */
export function estaVencido(coupon, hoje = hojeZerado()) {
  const v = paraDataLocal(coupon.validade)
  if (!v) return false
  return v < hoje
}

/** Cupom vence exatamente hoje? */
export function venceHoje(coupon, hoje = hojeZerado()) {
  const v = paraDataLocal(coupon.validade)
  if (!v) return false
  return v.getTime() === hoje.getTime()
}

/**
 * Avalia um único cupom contra um produto e devolve o resultado detalhado.
 *
 * @param {object} coupon
 * @param {object} produto
 * @param {string} produto.loja
 * @param {number} produto.precoPor
 * @param {string} [produto.categoria]  Categoria livre digitada para o match.
 * @returns {{ elegivel: boolean, vencido: boolean, venceHoje: boolean, motivos: string[] }}
 */
export function avaliarCupom(coupon, produto) {
  const motivos = [] // razões pelas quais NÃO é elegível
  const vencido = estaVencido(coupon)
  const venceHojeFlag = venceHoje(coupon)

  // 1) Loja precisa bater.
  const lojaBate =
    (coupon.loja || '').trim().toLowerCase() ===
    (produto.loja || '').trim().toLowerCase()
  if (!lojaBate) motivos.push('outra loja')

  // 2) Cupom vencido nunca é sugerido (evita divulgar cupom morto).
  if (vencido) motivos.push('vencido')

  // 3) Valor mínimo de compra (quando definido).
  if (coupon.valorMinimo != null && coupon.valorMinimo !== '') {
    const min = Number(coupon.valorMinimo)
    if (Number.isFinite(min) && Number(produto.precoPor) < min) {
      motivos.push(`mínimo R$${min}`)
    }
  }

  // 4) Categoria (texto livre). Se o cupom não tem categoria, vale para tudo.
  //    Se tem, comparamos de forma tolerante (substring, ignorando caixa)
  //    com a categoria digitada para o produto. Sem categoria do produto,
  //    não bloqueamos — apenas marcamos para o usuário confirmar.
  const catCupom = (coupon.categoria || '').trim().toLowerCase()
  const catProduto = (produto.categoria || '').trim().toLowerCase()
  if (catCupom) {
    if (catProduto) {
      const casa =
        catProduto.includes(catCupom) || catCupom.includes(catProduto)
      if (!casa) motivos.push(`categoria "${coupon.categoria}"`)
    }
    // Se catProduto vazio, deixamos passar (o app exibe aviso de conferência).
  }

  const elegivel = motivos.length === 0
  return { elegivel, vencido, venceHoje: venceHojeFlag, motivos }
}

/**
 * Filtra a lista de cupons cadastrados e devolve apenas os ELEGÍVEIS para o
 * produto. Cupons vencidos são automaticamente excluídos.
 *
 * @returns {Array} cupons elegíveis, cada um com a flag `venceHoje`.
 */
export function getEligibleCoupons(coupons, produto) {
  if (!Array.isArray(coupons)) return []
  return coupons
    .map((c) => ({ cupom: c, avaliacao: avaliarCupom(c, produto) }))
    .filter(({ avaliacao }) => avaliacao.elegivel)
    .map(({ cupom, avaliacao }) => ({ ...cupom, venceHoje: avaliacao.venceHoje }))
}

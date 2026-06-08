// =============================================================================
// Construção da mensagem de oferta (FUNÇÃO PURA).
//
// `buildMessage` não toca em DOM, banco ou rede: recebe dados e devolve a
// string formatada. Por ser pura, será reaproveitada sem alterações pelo
// módulo de envio automático na FASE 2 (Baileys/WhatsApp, Telegram).
//
// Sintaxe de formatação do WhatsApp:
//   *texto*  -> negrito
//   ~texto~  -> riscado (preço antigo)
//   `texto`  -> monospace (cupom)
// =============================================================================

/**
 * Formata um número como preço em Real, no padrão brasileiro.
 * Remove os centavos quando são ",00" para casar com o template (ex.: R$122).
 *
 * @param {number} valor
 * @returns {string} ex.: "122" ou "1.299,90"
 */
export function formatarPreco(valor) {
  const n = Number(valor)
  if (!Number.isFinite(n)) return ''
  const s = n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  // "122,00" -> "122"  |  "99,90" permanece.
  return s.endsWith(',00') ? s.slice(0, -3) : s
}

/**
 * Calcula o percentual de desconto entre preço "de" e preço "por".
 * Retorna null quando não há "de" válido ou quando não houve desconto.
 *
 * @returns {number|null} percentual inteiro (ex.: 39) ou null
 */
export function calcularDescontoPercent(precoDe, precoPor) {
  const de = Number(precoDe)
  const por = Number(precoPor)
  if (!Number.isFinite(de) || !Number.isFinite(por)) return null
  if (de <= 0 || por <= 0 || por >= de) return null
  return Math.round(((de - por) / de) * 100)
}

/**
 * Monta a mensagem de oferta no template dos grupos de promoção.
 *
 * @param {object} offer
 * @param {string} offer.nomeProduto
 * @param {number|null} offer.precoDe        Preço antigo (opcional).
 * @param {number} offer.precoPor            Preço atual.
 * @param {string} offer.loja
 * @param {string} offer.linkAfiliado
 * @param {number|null} [offer.descontoPercent]  % calculado (opcional).
 * @param {boolean} [offer.incluirDesconto]      Inclui o % na mensagem?
 * @param {object|null} coupon               Cupom selecionado (ou null).
 * @param {string} coupon.codigo
 * @returns {string} mensagem pronta para copiar/colar.
 */
export function buildMessage(offer, coupon) {
  const {
    nomeProduto = '',
    precoDe = null,
    precoPor = null,
    loja = '',
    linkAfiliado = '',
    descontoPercent = null,
    incluirDesconto = false,
  } = offer || {}

  const linhas = []

  // Linha 1: nome do produto em negrito.
  linhas.push(`*${nomeProduto}*`)
  linhas.push('') // linha em branco

  // Linha de preço.
  // Quando há "de", mostra "De ~R$x~ | Por *R$y*"; senão, só "Por *R$y*".
  const temDe =
    precoDe !== null && precoDe !== '' && Number(precoDe) > Number(precoPor)
  const parteDe = temDe ? `De ~R$${formatarPreco(precoDe)}~ | ` : ''

  // Sufixo de desconto: aparece só se o usuário marcou o checkbox e há %.
  const parteDesconto =
    incluirDesconto && descontoPercent ? ` 🔥 -${descontoPercent}%` : ''

  linhas.push(`${parteDe}Por *R$${formatarPreco(precoPor)}* 💵${parteDesconto}`)
  linhas.push('')

  // Linha do cupom: só aparece quando há cupom selecionado.
  if (coupon && coupon.codigo) {
    linhas.push(`\`Cupom: ${coupon.codigo}\` ⚠️`)
    linhas.push('')
  }

  // Rodapé: loja + link de afiliado.
  linhas.push(`🛒 Achado na ${loja}`)
  linhas.push(`👉 ${linkAfiliado}`)

  return linhas.join('\n')
}

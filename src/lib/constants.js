// Constantes compartilhadas pela aplicação.

// Lojas suportadas no dropdown. "Mercado Livre" é a única com busca
// automática via API pública; as demais usam preenchimento manual.
export const LOJAS = [
  'Mercado Livre',
  'Netshoes',
  'Shopee',
  'Amazon',
  'Outro',
]

// Tipos de desconto que um cupom pode ter.
export const TIPOS_DESCONTO = [
  { valor: 'percentual', rotulo: '% (percentual)' },
  { valor: 'fixo', rotulo: 'R$ (valor fixo)' },
]

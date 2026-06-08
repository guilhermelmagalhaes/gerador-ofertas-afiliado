// =============================================================================
// Exportação do histórico de ofertas para CSV e JSON.
// Útil para análise posterior (Excel, Pandas, etc.).
// =============================================================================

// Colunas exportadas no CSV, na ordem desejada.
const COLUNAS = [
  'id',
  'criadoEm',
  'loja',
  'nomeProduto',
  'precoDe',
  'precoPor',
  'descontoPercent',
  'cupomCodigo',
  'linkAfiliado',
  'urlImagem',
  'mensagemGerada',
]

// Escapa um valor para CSV: envolve em aspas e duplica aspas internas.
function escaparCsv(valor) {
  if (valor == null) return ''
  const s = String(valor)
  if (/[",\n;]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

/**
 * Converte a lista de ofertas em uma string CSV.
 * O timestamp `criadoEm` é convertido para ISO legível.
 */
export function gerarCsv(offers) {
  const cabecalho = COLUNAS.join(',')
  const linhas = offers.map((o) =>
    COLUNAS.map((col) => {
      if (col === 'criadoEm' && o.criadoEm) {
        return escaparCsv(new Date(o.criadoEm).toISOString())
      }
      return escaparCsv(o[col])
    }).join(','),
  )
  return [cabecalho, ...linhas].join('\n')
}

/** Converte a lista de ofertas em JSON formatado. */
export function gerarJson(offers) {
  return JSON.stringify(offers, null, 2)
}

/**
 * Dispara o download de um conteúdo de texto como arquivo no navegador.
 * Cria um Blob e um link temporário — tudo client-side, sem servidor.
 */
export function baixarArquivo(nomeArquivo, conteudo, mime = 'text/plain') {
  const blob = new Blob([conteudo], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Atalho: exporta ofertas como CSV com nome datado. */
export function exportarOfertasCsv(offers) {
  const data = new Date().toISOString().slice(0, 10)
  baixarArquivo(`ofertas-${data}.csv`, gerarCsv(offers), 'text/csv')
}

/** Atalho: exporta ofertas como JSON com nome datado. */
export function exportarOfertasJson(offers) {
  const data = new Date().toISOString().slice(0, 10)
  baixarArquivo(`ofertas-${data}.json`, gerarJson(offers), 'application/json')
}

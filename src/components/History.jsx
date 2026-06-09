import { useMemo, useState } from 'react'
import { Copy, Trash2, Download, FileJson, Inbox } from 'lucide-react'
import { deleteOffer } from '../lib/db'
import { exportarOfertasCsv, exportarOfertasJson } from '../lib/export'
import { formatarPreco } from '../lib/messageBuilder'
import { LOJAS } from '../lib/constants'

// =============================================================================
// Histórico das ofertas geradas: tabela ordenável, filtro por loja e
// exportação para CSV/JSON.
// =============================================================================

// Colunas ordenáveis (chave do dado + rótulo exibido).
const COLUNAS = [
  { chave: 'criadoEm', rotulo: 'Data' },
  { chave: 'loja', rotulo: 'Loja' },
  { chave: 'nomeProduto', rotulo: 'Produto' },
  { chave: 'precoPor', rotulo: 'Preço' },
  { chave: 'cupomCodigo', rotulo: 'Cupom' },
]

export default function History({ offers, onChange }) {
  const [filtroLoja, setFiltroLoja] = useState('')
  const [ordenarPor, setOrdenarPor] = useState('criadoEm')
  const [ordemAsc, setOrdemAsc] = useState(false)

  // Aplica filtro por loja e ordenação. useMemo evita recalcular à toa.
  const ofertasVisiveis = useMemo(() => {
    let lista = offers
    if (filtroLoja) lista = lista.filter((o) => o.loja === filtroLoja)

    const ordenada = [...lista].sort((a, b) => {
      const va = a[ordenarPor]
      const vb = b[ordenarPor]
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'number' && typeof vb === 'number') return va - vb
      return String(va).localeCompare(String(vb), 'pt-BR')
    })
    return ordemAsc ? ordenada : ordenada.reverse()
  }, [offers, filtroLoja, ordenarPor, ordemAsc])

  function alternarOrdenacao(chave) {
    if (ordenarPor === chave) {
      setOrdemAsc((v) => !v)
    } else {
      setOrdenarPor(chave)
      setOrdemAsc(true)
    }
  }

  async function remover(id) {
    if (!confirm('Remover esta oferta do histórico?')) return
    await deleteOffer(id)
    onChange?.()
  }

  async function copiar(mensagem) {
    try {
      await navigator.clipboard.writeText(mensagem)
    } catch {
      alert('Não foi possível copiar.')
    }
  }

  return (
    <div className="card">
      {/* Barra de ações: filtro + exportações */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Loja:</label>
          <select
            className="campo w-auto"
            value={filtroLoja}
            onChange={(e) => setFiltroLoja(e.target.value)}
          >
            <option value="">Todas</option>
            {LOJAS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <span className="text-sm text-slate-400">
            {ofertasVisiveis.length}{' '}
            {ofertasVisiveis.length === 1 ? 'oferta' : 'ofertas'}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secundario"
            onClick={() => exportarOfertasCsv(ofertasVisiveis)}
            disabled={ofertasVisiveis.length === 0}
          >
            <Download className="h-4 w-4" /> CSV
          </button>
          <button
            type="button"
            className="btn-secundario"
            onClick={() => exportarOfertasJson(ofertasVisiveis)}
            disabled={ofertasVisiveis.length === 0}
          >
            <FileJson className="h-4 w-4" /> JSON
          </button>
        </div>
      </div>

      {ofertasVisiveis.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-slate-400">
          <Inbox className="h-10 w-10" />
          <p className="text-sm">Nenhuma oferta no histórico ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                {COLUNAS.map((col) => (
                  <th
                    key={col.chave}
                    className="cursor-pointer select-none px-3 py-2 font-medium hover:text-slate-800"
                    onClick={() => alternarOrdenacao(col.chave)}
                  >
                    {col.rotulo}
                    {ordenarPor === col.chave && (ordemAsc ? ' ▲' : ' ▼')}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ofertasVisiveis.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                    {new Date(o.criadoEm).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-3 py-2.5">{o.loja}</td>
                  <td
                    className="max-w-xs truncate px-3 py-2.5"
                    title={o.nomeProduto}
                  >
                    {o.nomeProduto}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                    R${formatarPreco(o.precoPor)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {o.cupomCodigo || '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <button
                      type="button"
                      className="mr-1 rounded-lg p-1.5 text-slate-400 hover:bg-marca-50 hover:text-marca-700"
                      onClick={() => copiar(o.mensagemGerada)}
                      title="Copiar mensagem"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      onClick={() => remover(o.id)}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

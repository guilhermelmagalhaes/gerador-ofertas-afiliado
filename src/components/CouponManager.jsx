import { useState } from 'react'
import { addCoupon, deleteCoupon } from '../lib/db'
import { estaVencido, venceHoje } from '../lib/couponMatcher'
import { LOJAS, TIPOS_DESCONTO } from '../lib/constants'

// =============================================================================
// Gerenciador de cupons: cadastro + listagem com avisos de validade.
//
// A ferramenta só trabalha com cupons cadastrados aqui (nunca inventa nem
// busca cupons em páginas externas).
// =============================================================================

const FORM_VAZIO = {
  codigo: '',
  loja: LOJAS[0],
  tipoDesconto: 'percentual',
  valorDesconto: '',
  categoria: '',
  valorMinimo: '',
  validade: '',
}

export default function CouponManager({ coupons, onChange }) {
  const [form, setForm] = useState(FORM_VAZIO)
  const [erro, setErro] = useState('')

  function atualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')

    // Validações mínimas.
    if (!form.codigo.trim()) return setErro('Informe o código do cupom.')
    if (!form.valorDesconto || Number(form.valorDesconto) <= 0)
      return setErro('Informe um valor de desconto válido.')
    if (!form.validade) return setErro('Informe a data de validade.')

    await addCoupon({
      codigo: form.codigo.trim().toUpperCase(),
      loja: form.loja,
      tipoDesconto: form.tipoDesconto,
      valorDesconto: Number(form.valorDesconto),
      categoria: form.categoria.trim(),
      valorMinimo: form.valorMinimo ? Number(form.valorMinimo) : null,
      validade: form.validade,
    })

    setForm(FORM_VAZIO)
    onChange?.() // pede ao App para recarregar a lista de cupons
  }

  async function remover(id) {
    if (!confirm('Remover este cupom?')) return
    await deleteCoupon(id)
    onChange?.()
  }

  // Define a aparência do badge de validade de cada cupom.
  function badgeValidade(c) {
    if (estaVencido(c))
      return { texto: 'Vencido', classe: 'bg-red-100 text-red-700' }
    if (venceHoje(c))
      return { texto: 'Vence hoje', classe: 'bg-amber-100 text-amber-700' }
    return { texto: 'Válido', classe: 'bg-emerald-100 text-emerald-700' }
  }

  function formatarDesconto(c) {
    return c.tipoDesconto === 'percentual'
      ? `${c.valorDesconto}%`
      : `R$${c.valorDesconto}`
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* ---------- Formulário de cadastro ---------- */}
      <form
        onSubmit={salvar}
        className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Cadastrar cupom
        </h2>

        <div className="space-y-3">
          <div>
            <label className="rotulo">Código do cupom *</label>
            <input
              className="campo uppercase"
              placeholder="Ex.: MODANOML"
              value={form.codigo}
              onChange={(e) => atualizar('codigo', e.target.value)}
            />
          </div>

          <div>
            <label className="rotulo">Loja *</label>
            <select
              className="campo"
              value={form.loja}
              onChange={(e) => atualizar('loja', e.target.value)}
            >
              {LOJAS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Tipo *</label>
              <select
                className="campo"
                value={form.tipoDesconto}
                onChange={(e) => atualizar('tipoDesconto', e.target.value)}
              >
                {TIPOS_DESCONTO.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="rotulo">Valor *</label>
              <input
                className="campo"
                type="number"
                min="0"
                step="0.01"
                placeholder={form.tipoDesconto === 'percentual' ? '10' : '30'}
                value={form.valorDesconto}
                onChange={(e) => atualizar('valorDesconto', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="rotulo">Categoria / condição</label>
            <input
              className="campo"
              placeholder='Ex.: "Moda", "Casa e Decoração" (vazio = qualquer)'
              value={form.categoria}
              onChange={(e) => atualizar('categoria', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Valor mínimo (R$)</label>
              <input
                className="campo"
                type="number"
                min="0"
                step="0.01"
                placeholder="opcional"
                value={form.valorMinimo}
                onChange={(e) => atualizar('valorMinimo', e.target.value)}
              />
            </div>
            <div>
              <label className="rotulo">Validade *</label>
              <input
                className="campo"
                type="date"
                value={form.validade}
                onChange={(e) => atualizar('validade', e.target.value)}
              />
            </div>
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button type="submit" className="btn-primario w-full">
            Adicionar cupom
          </button>
        </div>
      </form>

      {/* ---------- Lista de cupons ---------- */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Cupons cadastrados ({coupons.length})
        </h2>

        {coupons.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhum cupom cadastrado ainda. Adicione no formulário ao lado.
          </p>
        ) : (
          <ul className="space-y-2">
            {coupons.map((c) => {
              const badge = badgeValidade(c)
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold text-slate-800">
                        {c.codigo}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.classe}`}
                      >
                        {badge.texto}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.loja} · {formatarDesconto(c)}
                      {c.categoria ? ` · ${c.categoria}` : ''}
                      {c.valorMinimo ? ` · mín. R$${c.valorMinimo}` : ''} ·
                      vence {new Date(c.validade + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remover(c.id)}
                    className="shrink-0 text-sm text-red-500 hover:text-red-700"
                    title="Remover cupom"
                  >
                    🗑️
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

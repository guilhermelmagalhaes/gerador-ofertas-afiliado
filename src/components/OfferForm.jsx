import { useMemo, useState } from 'react'
import {
  Store,
  Search,
  Loader2,
  TriangleAlert,
  ImageDown,
  Link2,
  Save,
  Ticket,
} from 'lucide-react'
import { buscarProdutoMl } from '../lib/mlApi'
import { getEligibleCoupons, estaVencido } from '../lib/couponMatcher'
import {
  buildMessage,
  calcularDescontoPercent,
} from '../lib/messageBuilder'
import { addOffer } from '../lib/db'
import { LOJAS } from '../lib/constants'
import MessagePreview from './MessagePreview'
import CouponManager from './CouponManager'

// =============================================================================
// Cadastro de oferta (semi-automático).
//
// Fluxo:
//  1. Escolhe a loja. Para Mercado Livre, cola a URL e busca os dados via
//     backend (/api/ml-produto). Se falhar, cai no preenchimento manual.
//  2. Preenche/ajusta nome, preços, imagem e link de afiliado (colado por você).
//  3. A ferramenta sugere cupons cadastrados elegíveis para o produto.
//     O gerenciador de cupons fica logo abaixo, na mesma tela.
//  4. Preview ao vivo + copiar + salvar no histórico (IndexedDB).
// =============================================================================

const FORM_VAZIO = {
  loja: LOJAS[0],
  urlProduto: '',
  nomeProduto: '',
  precoDe: '',
  precoPor: '',
  categoriaProduto: '', // usado só para sugerir cupons (não é persistido)
  urlImagem: '',
  linkAfiliado: '',
  incluirDesconto: false,
}

export default function OfferForm({ coupons, onSaved, onCouponsChange }) {
  const [form, setForm] = useState(FORM_VAZIO)
  const [cupomSelecionadoId, setCupomSelecionadoId] = useState('') // '' = sem cupom
  const [carregando, setCarregando] = useState(false)
  const [aviso, setAviso] = useState('') // aviso de fallback manual
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)

  function atualizar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setSalvo(false)
  }

  const ehMercadoLivre = form.loja === 'Mercado Livre'

  // ---- Busca automática dos dados do produto no Mercado Livre ----
  async function buscarDados() {
    setErro('')
    setAviso('')
    if (!form.urlProduto.trim()) {
      setErro('Cole a URL do produto do Mercado Livre.')
      return
    }
    setCarregando(true)
    try {
      const dados = await buscarProdutoMl(form.urlProduto)
      setForm((f) => ({
        ...f,
        nomeProduto: dados.nome || f.nomeProduto,
        precoPor: dados.precoPor != null ? String(dados.precoPor) : f.precoPor,
        precoDe: dados.precoDe != null ? String(dados.precoDe) : f.precoDe,
        urlImagem: dados.urlImagem || f.urlImagem,
      }))
    } catch (e) {
      // Fallback claro caso o backend não consiga os dados.
      let motivo
      if (e.message === 'URL_INVALIDA') {
        motivo =
          'Não encontrei um ID MLB nessa URL. Use o link completo do produto (não o link curto meli.la).'
      } else if (e.semCredenciais) {
        motivo =
          'O backend está sem as credenciais do Mercado Livre (ML_CLIENT_ID/ML_CLIENT_SECRET). Configure-as na Vercel (veja o README) para ativar a busca automática. Por enquanto, preencha manualmente.'
      } else {
        motivo =
          'Não consegui buscar os dados deste produto no Mercado Livre. Preencha os campos manualmente abaixo.'
      }
      setAviso(motivo)
    } finally {
      setCarregando(false)
    }
  }

  // ---- Cupons elegíveis para o produto atual ----
  const cuponsElegiveis = useMemo(() => {
    const precoPor = Number(form.precoPor)
    if (!Number.isFinite(precoPor) || precoPor <= 0) return []
    return getEligibleCoupons(coupons, {
      loja: form.loja,
      precoPor,
      categoria: form.categoriaProduto,
    })
  }, [coupons, form.loja, form.precoPor, form.categoriaProduto])

  // Cupons da loja que NÃO entram na sugestão por estarem vencidos (aviso).
  const cuponsVencidos = useMemo(
    () => coupons.filter((c) => c.loja === form.loja && estaVencido(c)),
    [coupons, form.loja],
  )

  const cupomSelecionado =
    cuponsElegiveis.find((c) => String(c.id) === cupomSelecionadoId) || null

  // ---- Desconto calculado ----
  const descontoPercent = useMemo(
    () => calcularDescontoPercent(form.precoDe, form.precoPor),
    [form.precoDe, form.precoPor],
  )

  // ---- Objeto de oferta usado tanto no preview quanto ao salvar ----
  const ofertaAtual = useMemo(
    () => ({
      loja: form.loja,
      nomeProduto: form.nomeProduto,
      precoDe: form.precoDe ? Number(form.precoDe) : null,
      precoPor: form.precoPor ? Number(form.precoPor) : null,
      linkAfiliado: form.linkAfiliado,
      descontoPercent,
      incluirDesconto: form.incluirDesconto,
    }),
    [form, descontoPercent],
  )

  // ---- Preview ao vivo (função pura buildMessage) ----
  const mensagem = useMemo(
    () => buildMessage(ofertaAtual, cupomSelecionado),
    [ofertaAtual, cupomSelecionado],
  )

  // ---- Download da imagem ----
  async function baixarImagem() {
    if (!form.urlImagem) return
    try {
      const resp = await fetch(form.urlImagem)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (form.nomeProduto || 'imagem').slice(0, 40) + '.jpg'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: abre a imagem em nova aba para salvar manualmente.
      window.open(form.urlImagem, '_blank', 'noopener')
    }
  }

  // ---- Salvar a oferta no histórico ----
  async function salvar() {
    setErro('')
    if (!form.nomeProduto.trim()) return setErro('Informe o nome do produto.')
    if (!form.precoPor || Number(form.precoPor) <= 0)
      return setErro('Informe o preço atual (Por).')
    if (!form.linkAfiliado.trim()) return setErro('Cole o link de afiliado.')

    await addOffer({
      loja: form.loja,
      nomeProduto: form.nomeProduto.trim(),
      precoDe: form.precoDe ? Number(form.precoDe) : null,
      precoPor: Number(form.precoPor),
      descontoPercent: descontoPercent ?? null,
      cupomCodigo: cupomSelecionado?.codigo ?? null,
      linkAfiliado: form.linkAfiliado.trim(),
      urlImagem: form.urlImagem.trim() || null,
      mensagemGerada: mensagem,
      criadoEm: Date.now(),
    })

    setForm({ ...FORM_VAZIO, loja: form.loja })
    setCupomSelecionadoId('')
    setSalvo(true)
    onSaved?.()

    // FASE 2: ponto de integração do envio (Baileys/Telegram).
    // Aqui, no futuro, em vez de apenas salvar, poderemos enfileirar o disparo
    // automático da `mensagem` para o canal escolhido, reaproveitando buildMessage().
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ===================== COLUNA ESQUERDA: FORMULÁRIO ===================== */}
        <div className="card space-y-4">
          {/* Loja */}
          <div>
            <label className="rotulo flex items-center gap-1.5">
              <Store className="h-4 w-4 text-slate-400" /> Loja
            </label>
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

          {/* URL + busca (apenas Mercado Livre) */}
          {ehMercadoLivre && (
            <div>
              <label className="rotulo">URL do produto (Mercado Livre)</label>
              <div className="flex gap-2">
                <input
                  className="campo"
                  placeholder="https://www.mercadolivre.com.br/.../p/MLB..."
                  value={form.urlProduto}
                  onChange={(e) => atualizar('urlProduto', e.target.value)}
                  onBlur={() => form.urlProduto && buscarDados()}
                />
                <button
                  type="button"
                  className="btn-primario whitespace-nowrap"
                  onClick={buscarDados}
                  disabled={carregando}
                >
                  {carregando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {carregando ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
              {aviso && (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{aviso}</span>
                </p>
              )}
            </div>
          )}

          {/* Nome do produto */}
          <div>
            <label className="rotulo">Nome do produto *</label>
            <input
              className="campo"
              value={form.nomeProduto}
              onChange={(e) => atualizar('nomeProduto', e.target.value)}
            />
          </div>

          {/* Preços */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Preço "De" (opcional)</label>
              <input
                className="campo"
                type="number"
                min="0"
                step="0.01"
                placeholder="ex.: 199.90"
                value={form.precoDe}
                onChange={(e) => atualizar('precoDe', e.target.value)}
              />
            </div>
            <div>
              <label className="rotulo">Preço "Por" *</label>
              <input
                className="campo"
                type="number"
                min="0"
                step="0.01"
                placeholder="ex.: 122"
                value={form.precoPor}
                onChange={(e) => atualizar('precoPor', e.target.value)}
              />
            </div>
          </div>

          {/* Desconto calculado + checkbox */}
          {descontoPercent != null && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-marca-50 p-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-500"
                checked={form.incluirDesconto}
                onChange={(e) => atualizar('incluirDesconto', e.target.checked)}
              />
              Incluir desconto de{' '}
              <span className="font-bold text-marca-700">-{descontoPercent}%</span>{' '}
              na mensagem
            </label>
          )}

          {/* Categoria para casar cupom */}
          <div>
            <label className="rotulo">
              Categoria do produto{' '}
              <span className="font-normal text-slate-400">
                (ajuda a sugerir cupons)
              </span>
            </label>
            <input
              className="campo"
              placeholder='Ex.: "Moda", "Casa e Decoração"'
              value={form.categoriaProduto}
              onChange={(e) => atualizar('categoriaProduto', e.target.value)}
            />
          </div>

          {/* Imagem */}
          <div>
            <label className="rotulo">URL da imagem</label>
            <div className="flex gap-2">
              <input
                className="campo"
                placeholder="https://..."
                value={form.urlImagem}
                onChange={(e) => atualizar('urlImagem', e.target.value)}
              />
              <button
                type="button"
                className="btn-secundario whitespace-nowrap"
                onClick={baixarImagem}
                disabled={!form.urlImagem}
              >
                <ImageDown className="h-4 w-4" /> Baixar
              </button>
            </div>
            {form.urlImagem && (
              <img
                src={form.urlImagem}
                alt="Preview"
                className="mt-2 h-32 w-32 rounded-lg border border-slate-200 object-contain"
                onError={(e) => (e.currentTarget.style.display = 'none')}
                onLoad={(e) => (e.currentTarget.style.display = 'block')}
              />
            )}
          </div>

          {/* Link de afiliado */}
          <div>
            <label className="rotulo flex items-center gap-1.5">
              <Link2 className="h-4 w-4 text-slate-400" /> Link de afiliado *
            </label>
            <input
              className="campo"
              placeholder="meli.la/... (gerado por você no painel da loja)"
              value={form.linkAfiliado}
              onChange={(e) => atualizar('linkAfiliado', e.target.value)}
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}
          {salvo && (
            <p className="text-sm font-medium text-marca-700">
              ✓ Oferta salva no histórico!
            </p>
          )}

          <button type="button" className="btn-primario w-full" onClick={salvar}>
            <Save className="h-4 w-4" /> Salvar oferta no histórico
          </button>
        </div>

        {/* ===================== COLUNA DIREITA: CUPONS + PREVIEW ===================== */}
        <div className="space-y-4">
          {/* Sugestão de cupons */}
          <div className="card">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Ticket className="h-4 w-4 text-marca-600" /> Cupons elegíveis para
              esta oferta
            </h3>

            {cuponsElegiveis.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum cupom elegível. Verifique a loja, o preço e (se aplicável)
                a categoria — ou cadastre cupons na seção abaixo.
              </p>
            ) : (
              <div className="space-y-2">
                {/* Opção: sem cupom */}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm hover:bg-slate-50">
                  <input
                    type="radio"
                    name="cupom"
                    className="text-marca-600 focus:ring-marca-500"
                    checked={cupomSelecionadoId === ''}
                    onChange={() => setCupomSelecionadoId('')}
                  />
                  Sem cupom
                </label>

                {cuponsElegiveis.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-sm hover:border-marca-300"
                  >
                    <input
                      type="radio"
                      name="cupom"
                      className="text-marca-600 focus:ring-marca-500"
                      checked={String(c.id) === cupomSelecionadoId}
                      onChange={() => setCupomSelecionadoId(String(c.id))}
                    />
                    <span className="font-mono font-semibold">{c.codigo}</span>
                    <span className="text-slate-500">
                      {c.tipoDesconto === 'percentual'
                        ? `${c.valorDesconto}%`
                        : `R$${c.valorDesconto}`}
                    </span>
                    {c.venceHoje && (
                      <span className="selo bg-amber-100 text-amber-700">
                        vence hoje!
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {cuponsVencidos.length > 0 && (
              <p className="mt-3 text-xs text-red-500">
                {cuponsVencidos.length} cupom(ns) desta loja estão vencidos e não
                são sugeridos.
              </p>
            )}
          </div>

          {/* Preview da mensagem */}
          <MessagePreview mensagem={mensagem} />
        </div>
      </div>

      {/* ===================== GERENCIADOR DE CUPONS ===================== */}
      <section className="border-t border-slate-200 pt-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <Ticket className="h-5 w-5 text-marca-600" /> Gerenciar cupons
        </h2>
        <CouponManager coupons={coupons} onChange={onCouponsChange} />
      </section>
    </div>
  )
}

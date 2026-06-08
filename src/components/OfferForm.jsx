import { useMemo, useState } from 'react'
import { buscarProdutoMl } from '../lib/mlApi'
import { getEligibleCoupons, estaVencido } from '../lib/couponMatcher'
import {
  buildMessage,
  calcularDescontoPercent,
  formatarPreco,
} from '../lib/messageBuilder'
import { addOffer } from '../lib/db'
import { LOJAS } from '../lib/constants'
import MessagePreview from './MessagePreview'

// =============================================================================
// Cadastro de oferta (semi-automático).
//
// Fluxo:
//  1. Escolhe a loja. Para Mercado Livre, cola a URL e busca os dados na API.
//     Em qualquer falha (CORS/401/rede), cai no preenchimento manual.
//  2. Preenche/ajusta nome, preços, imagem e link de afiliado (colado por você).
//  3. A ferramenta sugere cupons cadastrados elegíveis para o produto.
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

export default function OfferForm({ coupons, onSaved }) {
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
      // Fallback claro: a API não respondeu no navegador (comum por CORS/401).
      const motivo =
        e.message === 'URL_INVALIDA'
          ? 'Não encontrei um ID MLB nessa URL. Confira o link.'
          : 'A API do Mercado Livre não respondeu no navegador (bloqueio de CORS ou autenticação). Preencha os campos manualmente abaixo.'
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
      // Tenta baixar via fetch (funciona quando o host permite CORS).
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

    // Reseta o formulário mantendo a loja escolhida.
    setForm({ ...FORM_VAZIO, loja: form.loja })
    setCupomSelecionadoId('')
    setSalvo(true)
    onSaved?.()

    // FASE 2: ponto de integração do envio (Baileys/Telegram).
    // Aqui, no futuro, em vez de apenas salvar, poderemos enfileirar o disparo
    // automático da `mensagem` para o canal escolhido, reaproveitando buildMessage().
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ===================== COLUNA ESQUERDA: FORMULÁRIO ===================== */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Nova oferta</h2>

        {/* Loja */}
        <div>
          <label className="rotulo">Loja</label>
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
                {carregando ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {aviso && (
              <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                ⚠️ {aviso}
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
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-marca-600"
              checked={form.incluirDesconto}
              onChange={(e) => atualizar('incluirDesconto', e.target.checked)}
            />
            Incluir desconto de{' '}
            <span className="font-semibold text-marca-700">
              -{descontoPercent}%
            </span>{' '}
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
              Baixar
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
          <label className="rotulo">Link de afiliado *</label>
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
          💾 Salvar oferta no histórico
        </button>
      </div>

      {/* ===================== COLUNA DIREITA: CUPONS + PREVIEW ===================== */}
      <div className="space-y-4">
        {/* Sugestão de cupons */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            Cupons elegíveis para esta oferta
          </h3>

          {cuponsElegiveis.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum cupom elegível. Verifique a loja, o preço e (se aplicável) a
              categoria — ou cadastre cupons na aba "Cupons".
            </p>
          ) : (
            <div className="space-y-2">
              {/* Opção: sem cupom */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="cupom"
                  checked={cupomSelecionadoId === ''}
                  onChange={() => setCupomSelecionadoId('')}
                />
                Sem cupom
              </label>

              {cuponsElegiveis.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm"
                >
                  <input
                    type="radio"
                    name="cupom"
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
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
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
  )
}

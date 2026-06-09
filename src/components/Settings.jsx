import { useState } from 'react'
import {
  Lock,
  ShieldCheck,
  Unlock,
  Database,
  Info,
  Trash2,
  FileJson,
  Send,
} from 'lucide-react'
import { clearOffers, clearCoupons } from '../lib/db'
import { baixarArquivo } from '../lib/export'
import { getDestinoTelegram, setDestinoTelegram } from '../lib/telegram'

// =============================================================================
// Tela de Configurações: acesso (login), envio pelo Telegram, dados locais e
// informações do app.
// =============================================================================

export default function Settings({
  offers,
  coupons,
  semSenha,
  telegramConfigurado,
  onDadosAlterados,
}) {
  const [destino, setDestino] = useState(getDestinoTelegram())
  const [destinoSalvo, setDestinoSalvo] = useState(false)

  function salvarDestino() {
    setDestinoTelegram(destino)
    setDestinoSalvo(true)
    setTimeout(() => setDestinoSalvo(false), 2000)
  }

  function exportarBackup() {
    const data = new Date().toISOString().slice(0, 10)
    const conteudo = JSON.stringify({ offers, coupons }, null, 2)
    baixarArquivo(`backup-${data}.json`, conteudo, 'application/json')
  }

  async function limparHistorico() {
    if (!confirm('Apagar TODAS as ofertas do histórico? Isso não pode ser desfeito.'))
      return
    await clearOffers()
    onDadosAlterados?.()
  }

  async function limparCupons() {
    if (!confirm('Apagar TODOS os cupons cadastrados? Isso não pode ser desfeito.'))
      return
    await clearCoupons()
    onDadosAlterados?.()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ---------- Acesso (login por senha de administrador) ---------- */}
      <section className="card">
        <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-800">
          <Lock className="h-5 w-5 text-marca-600" /> Acesso
        </h3>
        {semSenha ? (
          <>
            <p className="text-sm text-slate-500">
              O app está em <strong>modo aberto</strong>: qualquer pessoa com o
              link consegue acessar.
            </p>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
              <Unlock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Para exigir senha, defina a variável <code>APP_PASSWORD</code> na
                Vercel (Settings → Environment Variables) e faça um Redeploy.
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              O acesso está protegido por senha de administrador. Use o botão
              <strong> Sair </strong> no menu lateral para encerrar a sessão.
            </p>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-marca-50 p-3 text-xs text-marca-700">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Protegido por senha · sessão válida por 30 dias.</span>
            </div>
          </>
        )}
      </section>

      {/* ---------- Envio pelo Telegram ---------- */}
      <section className="card">
        <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-800">
          <Send className="h-5 w-5 text-marca-600" /> Envio pelo Telegram
        </h3>

        {telegramConfigurado ? (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-marca-50 p-3 text-xs text-marca-700">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Bot conectado. Defina o destino abaixo e use “Enviar no Telegram”.</span>
          </div>
        ) : (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
            <Unlock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Bot não configurado. Defina <code>TELEGRAM_BOT_TOKEN</code> na
              Vercel e faça Redeploy (passo a passo abaixo).
            </span>
          </div>
        )}

        <label className="rotulo">Canal/grupo de destino</label>
        <div className="flex gap-2">
          <input
            className="campo"
            placeholder="@meucanal ou -100123456789"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
          />
          <button type="button" className="btn-secundario" onClick={salvarDestino}>
            Salvar
          </button>
        </div>
        {destinoSalvo && (
          <p className="mt-1 text-xs font-medium text-marca-700">✓ Destino salvo</p>
        )}

        <details className="mt-3 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium text-slate-600">
            Como configurar (passo a passo)
          </summary>
          <ol className="mt-2 list-inside list-decimal space-y-1">
            <li>
              No Telegram, fale com <strong>@BotFather</strong> → <code>/newbot</code>{' '}
              → copie o <strong>token</strong>.
            </li>
            <li>
              Na Vercel → Settings → Environment Variables → adicione{' '}
              <code>TELEGRAM_BOT_TOKEN</code> → <strong>Redeploy</strong>.
            </li>
            <li>
              Crie um canal/grupo e adicione seu bot como{' '}
              <strong>administrador</strong>.
            </li>
            <li>
              Destino: canal público use <code>@nomedocanal</code>; privado use o
              ID numérico (ex.: <code>-100…</code>) e cole no campo acima.
            </li>
          </ol>
        </details>
      </section>

      {/* ---------- Dados locais ---------- */}
      <section className="card lg:col-span-2">
        <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-800">
          <Database className="h-5 w-5 text-marca-600" /> Dados locais
        </h3>
        <p className="text-sm text-slate-500">
          Seus dados ficam salvos apenas neste navegador (IndexedDB). Faça
          backups com frequência — limpar o navegador apaga tudo.
        </p>

        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-2xl font-bold text-slate-800">
              {offers.length}
            </span>{' '}
            <span className="text-slate-500">ofertas no histórico</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-800">
              {coupons.length}
            </span>{' '}
            <span className="text-slate-500">cupons cadastrados</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-secundario" onClick={exportarBackup}>
            <FileJson className="h-4 w-4" /> Exportar backup (JSON)
          </button>
          <button
            type="button"
            className="btn-perigo"
            onClick={limparHistorico}
            disabled={offers.length === 0}
          >
            <Trash2 className="h-4 w-4" /> Limpar histórico
          </button>
          <button
            type="button"
            className="btn-perigo"
            onClick={limparCupons}
            disabled={coupons.length === 0}
          >
            <Trash2 className="h-4 w-4" /> Limpar cupons
          </button>
        </div>
      </section>

      {/* ---------- Sobre ---------- */}
      <section className="card lg:col-span-2">
        <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-800">
          <Info className="h-5 w-5 text-marca-600" /> Sobre
        </h3>
        <p className="text-sm text-slate-500">
          Gerador de Ofertas de Afiliado — ferramenta para montar mensagens de
          promoção (Mercado Livre, Netshoes, Shopee, Amazon) para WhatsApp,
          Telegram e Instagram. Busca dados do produto via API do Mercado Livre,
          sugere cupons elegíveis e monta a mensagem no template dos grupos.
        </p>
      </section>
    </div>
  )
}

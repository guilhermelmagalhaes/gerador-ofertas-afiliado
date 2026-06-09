import { Lock, Database, Info, Trash2, FileJson, Send } from 'lucide-react'
import { clearOffers, clearCoupons } from '../lib/db'
import { baixarArquivo } from '../lib/export'

// =============================================================================
// Tela de Configurações.
//
// Reúne: acesso (login — próxima etapa), gestão dos dados locais (exportar/
// limpar) e informações do app. À medida que o projeto evoluir (login, envio
// automático), novas seções entram aqui.
// =============================================================================

export default function Settings({ offers, coupons, onDadosAlterados }) {
  // Exporta TUDO (ofertas + cupons) num único arquivo JSON de backup.
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
      {/* ---------- Acesso (login — próxima etapa) ---------- */}
      <section className="card">
        <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-800">
          <Lock className="h-5 w-5 text-marca-600" /> Acesso
        </h3>
        <p className="text-sm text-slate-500">
          O login por senha de administrador (só você acessa para gerar
          mensagens e links) será adicionado na próxima etapa.
        </p>
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          🔒 Planejado: proteção por senha, sem necessidade de banco de dados.
        </div>
      </section>

      {/* ---------- Envio automático (próxima etapa) ---------- */}
      <section className="card">
        <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-800">
          <Send className="h-5 w-5 text-marca-600" /> Envio automático
        </h3>
        <p className="text-sm text-slate-500">
          Por enquanto, a mensagem é gerada para você copiar e colar. O envio
          automático para grupos (Telegram/WhatsApp) é uma etapa futura.
        </p>
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          📨 Telegram roda na Vercel (grátis). WhatsApp para grupos exige um
          servidor sempre ligado.
        </div>
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

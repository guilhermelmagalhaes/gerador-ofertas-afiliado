import { Tag, PlusCircle, History, Settings, X } from 'lucide-react'

// =============================================================================
// Menu lateral de navegação.
//
// - Em telas grandes (lg+): fica fixo à esquerda, sempre visível.
// - Em telas pequenas: vira um painel sobreposto, aberto pelo botão da Topbar.
// =============================================================================

// Itens do menu. Cada um aponta para uma "seção" do app.
const ITENS = [
  { id: 'gerar', rotulo: 'Gerar mensagem', icone: PlusCircle },
  { id: 'historico', rotulo: 'Histórico', icone: History },
  { id: 'config', rotulo: 'Configurações', icone: Settings },
]

export default function Sidebar({ secao, onNavegar, aberto, onFechar }) {
  return (
    <>
      {/* Fundo escurecido no mobile quando o menu está aberto. */}
      {aberto && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/50 lg:hidden"
          onClick={onFechar}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-slate-900 text-slate-100
          transition-transform duration-200 lg:translate-x-0
          ${aberto ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo / título */}
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-marca-600">
              <Tag className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold">Gerador de Ofertas</p>
              <p className="text-xs text-slate-400">de Afiliado</p>
            </div>
          </div>
          {/* Botão de fechar só aparece no mobile. */}
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-1 px-3 py-2">
          {ITENS.map(({ id, rotulo, icone: Icone }) => {
            const ativo = secao === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavegar(id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition
                  ${
                    ativo
                      ? 'bg-marca-600 text-white shadow-suave'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <Icone className="h-5 w-5 shrink-0" />
                {rotulo}
              </button>
            )
          })}
        </nav>

        {/* Rodapé */}
        <div className="border-t border-slate-800 px-5 py-4 text-xs text-slate-500">
          <p>Fase 1 · sem custo</p>
          <p className="mt-0.5">Dados salvos só neste navegador</p>
        </div>
      </aside>
    </>
  )
}

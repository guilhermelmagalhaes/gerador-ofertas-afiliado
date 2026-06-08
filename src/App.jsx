import { useEffect, useState } from 'react'
import { getCoupons, getOffers } from './lib/db'
import OfferForm from './components/OfferForm'
import History from './components/History'

// =============================================================================
// Componente raiz: navegação por abas e estado compartilhado (cupons/ofertas).
//
// Tudo roda no navegador. Os dados ficam no IndexedDB do próprio dispositivo.
// =============================================================================

const ABAS = [
  { id: 'oferta', rotulo: '➕ Nova oferta' },
  { id: 'historico', rotulo: '📜 Histórico' },
]

export default function App() {
  const [aba, setAba] = useState('oferta')
  const [coupons, setCoupons] = useState([])
  const [offers, setOffers] = useState([])

  // Carrega cupons e ofertas do IndexedDB.
  async function recarregarCupons() {
    setCoupons(await getCoupons())
  }
  async function recarregarOfertas() {
    setOffers(await getOffers())
  }

  // Carga inicial ao montar o app.
  useEffect(() => {
    recarregarCupons()
    recarregarOfertas()
  }, [])

  return (
    <div className="min-h-screen">
      {/* Cabeçalho */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <h1 className="text-xl font-bold text-slate-800">
            🏷️ Gerador de Ofertas de Afiliado
          </h1>
          <p className="text-sm text-slate-500">
            Monte mensagens para WhatsApp, Telegram e Instagram — 100% no seu
            navegador.
          </p>
        </div>
      </header>

      {/* Navegação por abas */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl gap-1 px-4">
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                aba === a.id
                  ? 'border-marca-600 text-marca-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      </nav>

      {/* Conteúdo da aba ativa */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {aba === 'oferta' && (
          <OfferForm
            coupons={coupons}
            onSaved={recarregarOfertas}
            onCouponsChange={recarregarCupons}
          />
        )}
        {aba === 'historico' && (
          <History offers={offers} onChange={recarregarOfertas} />
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-400">
        Fase 1 — sem backend, sem custo. Os dados ficam apenas neste navegador.
      </footer>
    </div>
  )
}

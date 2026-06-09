import { useEffect, useState } from 'react'
import { Menu, Loader2 } from 'lucide-react'
import { getCoupons, getOffers } from './lib/db'
import { checarSessao, logout } from './lib/auth'
import Sidebar from './components/Sidebar'
import Login from './components/Login'
import OfferForm from './components/OfferForm'
import History from './components/History'
import Settings from './components/Settings'

// =============================================================================
// Componente raiz: porta de autenticação + layout com menu lateral.
//
// Sem sessão válida → tela de Login. Com sessão (ou em "modo aberto", quando
// não há senha configurada) → o app completo. Tudo roda no navegador; os
// dados ficam no IndexedDB do próprio dispositivo.
// =============================================================================

// Cabeçalho (título + subtítulo) de cada seção.
const CABECALHOS = {
  gerar: {
    titulo: 'Gerar mensagem',
    sub: 'Monte a oferta, escolha o cupom e copie a mensagem pronta.',
  },
  historico: {
    titulo: 'Histórico',
    sub: 'Todas as mensagens já geradas, com filtro e exportação.',
  },
  config: {
    titulo: 'Configurações',
    sub: 'Dados locais, acesso e informações do app.',
  },
}

export default function App() {
  // Estado de autenticação.
  const [auth, setAuth] = useState({
    carregando: true,
    autenticado: false,
    semSenha: false,
  })

  const [secao, setSecao] = useState('gerar')
  const [coupons, setCoupons] = useState([])
  const [offers, setOffers] = useState([])
  const [menuAberto, setMenuAberto] = useState(false)

  // Verifica a sessão no carregamento.
  async function atualizarSessao() {
    const r = await checarSessao()
    setAuth({ carregando: false, ...r })
  }
  useEffect(() => {
    atualizarSessao()
  }, [])

  // Carrega cupons e ofertas do IndexedDB (após autenticar).
  async function recarregarCupons() {
    setCoupons(await getCoupons())
  }
  async function recarregarOfertas() {
    setOffers(await getOffers())
  }
  useEffect(() => {
    if (auth.autenticado) {
      recarregarCupons()
      recarregarOfertas()
    }
  }, [auth.autenticado])

  function navegar(novaSecao) {
    setSecao(novaSecao)
    setMenuAberto(false)
  }

  async function sair() {
    await logout()
    setAuth({ carregando: false, autenticado: false, semSenha: false })
  }

  // --- Estados de renderização ---

  // 1) Carregando a sessão.
  if (auth.carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-marca-600" />
      </div>
    )
  }

  // 2) Não autenticado → tela de login.
  if (!auth.autenticado) {
    return <Login onEntrar={atualizarSessao} />
  }

  // 3) Autenticado → app completo.
  const cabecalho = CABECALHOS[secao]

  return (
    <div className="min-h-screen">
      <Sidebar
        secao={secao}
        onNavegar={navegar}
        aberto={menuAberto}
        onFechar={() => setMenuAberto(false)}
        onSair={sair}
        semSenha={auth.semSenha}
      />

      {/* Área de conteúdo (deslocada para a direita da sidebar fixa em lg+). */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800">
                {cabecalho.titulo}
              </h1>
              <p className="hidden text-sm text-slate-500 sm:block">
                {cabecalho.sub}
              </p>
            </div>
          </div>
        </header>

        {/* Conteúdo da seção ativa */}
        <main className="px-4 py-6 sm:px-6">
          {secao === 'gerar' && (
            <OfferForm
              coupons={coupons}
              onSaved={recarregarOfertas}
              onCouponsChange={recarregarCupons}
            />
          )}
          {secao === 'historico' && (
            <History offers={offers} onChange={recarregarOfertas} />
          )}
          {secao === 'config' && (
            <Settings
              offers={offers}
              coupons={coupons}
              semSenha={auth.semSenha}
              onDadosAlterados={() => {
                recarregarOfertas()
                recarregarCupons()
              }}
            />
          )}
        </main>
      </div>
    </div>
  )
}

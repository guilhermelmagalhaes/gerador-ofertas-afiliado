import { useState } from 'react'
import { Tag, Lock, LogIn, Loader2 } from 'lucide-react'
import { login } from '../lib/auth'

// =============================================================================
// Tela de login (senha de administrador).
//
// Bloqueia o acesso ao app. Ao autenticar com sucesso, chama onEntrar() para
// o App recarregar o estado de sessão e exibir o conteúdo.
// =============================================================================

export default function Login({ onEntrar }) {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await login(senha)
      onEntrar?.()
    } catch (err) {
      setErro(
        err.message === 'SENHA_INVALIDA'
          ? 'Senha incorreta. Tente novamente.'
          : 'Não foi possível entrar. Tente novamente.',
      )
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-marca-600 shadow-lg">
            <Tag className="h-7 w-7 text-white" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-white">
              Gerador de Ofertas de Afiliado
            </h1>
            <p className="text-sm text-slate-400">Acesso restrito</p>
          </div>
        </div>

        {/* Card de login */}
        <form
          onSubmit={enviar}
          className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-cartao"
        >
          <label className="mb-1.5 block text-sm font-medium text-slate-200">
            Senha de acesso
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              autoFocus
              className="w-full rounded-lg border border-slate-600 bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-500/30"
              placeholder="Digite a senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          {erro && <p className="mt-2 text-sm text-red-400">{erro}</p>}

          <button
            type="submit"
            disabled={carregando || !senha}
            className="btn-primario mt-4 w-full"
          >
            {carregando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Seus dados continuam salvos só no seu navegador.
        </p>
      </div>
    </div>
  )
}

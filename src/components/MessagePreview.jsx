import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

// =============================================================================
// Preview ao vivo da mensagem + botão "Copiar mensagem" com feedback visual.
//
// Mostra o texto EXATAMENTE como será colado no WhatsApp (com *, ~, `).
// =============================================================================

export default function MessagePreview({ mensagem }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensagem)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      alert('Não foi possível copiar automaticamente. Selecione e copie manualmente.')
    }
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Preview da mensagem
        </h3>
        <button
          type="button"
          onClick={copiar}
          className={copiado ? 'btn bg-marca-100 text-marca-700' : 'btn-primario'}
          disabled={!mensagem}
        >
          {copiado ? (
            <>
              <Check className="h-4 w-4" /> Copiado!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> Copiar mensagem
            </>
          )}
        </button>
      </div>

      {/* Balão estilo "mensagem de chat" para dar contexto visual. */}
      <div className="rounded-xl bg-marca-50 p-4">
        <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-slate-800">
          {mensagem || 'Preencha os campos para ver o preview...'}
        </pre>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Os símbolos <code>*</code> <code>~</code> <code>`</code> são a formatação
        do WhatsApp (negrito, riscado e monospace).
      </p>
    </div>
  )
}

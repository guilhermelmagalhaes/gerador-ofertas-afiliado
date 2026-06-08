import { useState } from 'react'

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
      // Reseta o feedback depois de 2s.
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Fallback caso a Clipboard API não esteja disponível.
      alert('Não foi possível copiar automaticamente. Selecione e copie manualmente.')
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Preview da mensagem
        </h3>
        <button
          type="button"
          onClick={copiar}
          className={copiado ? 'btn bg-emerald-100 text-emerald-700' : 'btn-primario'}
          disabled={!mensagem}
        >
          {copiado ? '✓ Copiado!' : '📋 Copiar mensagem'}
        </button>
      </div>

      {/* whitespace-pre-wrap preserva as quebras de linha do template. */}
      <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 font-mono text-sm text-slate-800">
        {mensagem || 'Preencha os campos para ver o preview...'}
      </pre>

      <p className="mt-2 text-xs text-slate-400">
        Os símbolos <code>*</code> <code>~</code> <code>`</code> são a formatação
        do WhatsApp (negrito, riscado e monospace).
      </p>
    </div>
  )
}

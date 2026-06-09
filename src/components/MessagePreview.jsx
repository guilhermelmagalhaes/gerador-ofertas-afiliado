import { useState } from 'react'
import { Copy, Check, Image as ImageIcon, Send, Loader2 } from 'lucide-react'
import { enviarTelegram, getDestinoTelegram } from '../lib/telegram'

// =============================================================================
// Preview ao vivo da mensagem + ações: enviar no Telegram, copiar imagem,
// copiar mensagem.
//
// Mostra o texto EXATAMENTE como será colado no WhatsApp (com *, ~, `) e a
// imagem do produto acima, simulando o post (foto + legenda).
// =============================================================================

// Converte um Blob de imagem (jpeg/webp) para PNG, formato mais compatível
// com a área de transferência. Usa a imagem já baixada (blob local), então o
// canvas não fica "tainted".
function blobParaPng(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob falhou'))),
        'image/png',
      )
    }
    img.onerror = reject
    img.src = URL.createObjectURL(blob)
  })
}

export default function MessagePreview({ mensagem, urlImagem, telegramConfigurado }) {
  const [copiado, setCopiado] = useState(false)
  const [imgCopiada, setImgCopiada] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensagem)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      alert('Não foi possível copiar automaticamente. Selecione e copie manualmente.')
    }
  }

  async function copiarImagem() {
    if (!urlImagem) return
    try {
      if (!navigator.clipboard || !window.ClipboardItem) {
        throw new Error('Clipboard de imagem indisponível')
      }
      const resp = await fetch(urlImagem)
      const blob = await resp.blob()
      const png = blob.type === 'image/png' ? blob : await blobParaPng(blob)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
      setImgCopiada(true)
      setTimeout(() => setImgCopiada(false), 2000)
    } catch {
      // Fallback: baixa a imagem para você anexar manualmente.
      try {
        const resp = await fetch(urlImagem)
        const blob = await resp.blob()
        const u = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = u
        a.download = 'oferta.jpg'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(u)
        alert('Não consegui copiar a imagem; baixei o arquivo para você anexar.')
      } catch {
        window.open(urlImagem, '_blank', 'noopener')
      }
    }
  }

  async function enviar() {
    setErroEnvio('')
    if (!getDestinoTelegram()) {
      setErroEnvio('Defina o canal/grupo em Configurações → Telegram.')
      return
    }
    setEnviando(true)
    try {
      await enviarTelegram({ mensagem, urlImagem })
      setEnviado(true)
      setTimeout(() => setEnviado(false), 2500)
    } catch (e) {
      setErroEnvio(e.message || 'Falha ao enviar.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700">
          Preview da mensagem
        </h3>
        <div className="flex flex-wrap gap-2">
          {urlImagem && (
            <button
              type="button"
              onClick={copiarImagem}
              className={
                imgCopiada ? 'btn bg-marca-100 text-marca-700' : 'btn-secundario'
              }
            >
              {imgCopiada ? (
                <>
                  <Check className="h-4 w-4" /> Imagem copiada!
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4" /> Copiar imagem
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={copiar}
            className={copiado ? 'btn bg-marca-100 text-marca-700' : 'btn-secundario'}
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

          {/* Envio automático para o Telegram (só aparece se o bot estiver
              configurado no servidor). */}
          {telegramConfigurado && (
            <button
              type="button"
              onClick={enviar}
              disabled={!mensagem || enviando}
              className={
                enviado
                  ? 'btn bg-marca-100 text-marca-700'
                  : 'btn bg-sky-500 text-white hover:bg-sky-600'
              }
            >
              {enviando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : enviado ? (
                <>
                  <Check className="h-4 w-4" /> Enviado!
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Enviar no Telegram
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {erroEnvio && (
        <p className="mb-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-600">
          {erroEnvio}
        </p>
      )}

      {/* Balão estilo "mensagem de chat" para dar contexto visual. */}
      <div className="overflow-hidden rounded-xl bg-marca-50">
        {urlImagem && (
          <img
            src={urlImagem}
            alt="Imagem do produto"
            className="max-h-72 w-full bg-white object-contain"
            onError={(e) => (e.currentTarget.style.display = 'none')}
            onLoad={(e) => (e.currentTarget.style.display = 'block')}
          />
        )}
        <pre className="whitespace-pre-wrap break-words p-4 font-mono text-sm leading-relaxed text-slate-800">
          {mensagem || 'Preencha os campos para ver o preview...'}
        </pre>
      </div>

      {/* Passo a passo de envio manual no WhatsApp. */}
      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
        <p className="mb-1 font-semibold text-slate-600">
          WhatsApp (manual):
        </p>
        <ol className="list-inside list-decimal space-y-0.5">
          <li>
            <strong>Copiar imagem</strong> → no grupo, cole com{' '}
            <kbd>Ctrl</kbd>+<kbd>V</kbd>
          </li>
          <li>
            <strong>Copiar mensagem</strong> → cole na <strong>legenda</strong>{' '}
            da foto
          </li>
        </ol>
      </div>
    </div>
  )
}

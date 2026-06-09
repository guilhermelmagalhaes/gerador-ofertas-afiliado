// =============================================================================
// Cliente de envio para o Telegram (frontend).
//
// O token do bot fica no servidor (secreto). Aqui só guardamos o DESTINO
// (chat_id / @canal), que não é secreto, no localStorage — assim você troca
// de canal sem precisar de redeploy.
// =============================================================================

const CHAT_KEY = 'telegram_chat_id'

/** Lê o destino salvo (chat_id ou @canal). */
export function getDestinoTelegram() {
  try {
    return localStorage.getItem(CHAT_KEY) || ''
  } catch {
    return ''
  }
}

/** Salva o destino (chat_id ou @canal). */
export function setDestinoTelegram(valor) {
  try {
    localStorage.setItem(CHAT_KEY, valor.trim())
  } catch {
    // ignora (modo privado etc.)
  }
}

/**
 * Envia a oferta para o Telegram via backend.
 * @throws {Error} com mensagem legível em caso de falha.
 */
export async function enviarTelegram({ mensagem, urlImagem }) {
  const chatId = getDestinoTelegram()

  const r = await fetch('/api/telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ mensagem, urlImagem, chatId }),
  })

  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    const erro = new Error(data.detalhe || data.erro || 'Falha ao enviar.')
    erro.codigo = data.erro
    throw erro
  }
  return data
}

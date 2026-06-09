// =============================================================================
// BACKEND (Vercel Serverless Function) — envio da oferta para o Telegram.
//
// Envia a foto do produto + a mensagem (como legenda) para um canal/grupo.
// Usa a Bot API oficial do Telegram (gratuita), então NÃO há risco de
// banimento como no WhatsApp.
//
// Configuração:
//   - TELEGRAM_BOT_TOKEN (env var, obrigatório) — token do bot criado no
//     @BotFather. Fica só no servidor, nunca vai para o navegador.
//   - destino (chat_id): vem do frontend (configurado nas Configurações) ou,
//     como padrão, da env var TELEGRAM_CHAT_ID.
//
// FASE 2: este é o primeiro canal de envio automático. O WhatsApp (Baileys/
// serviço pago) pode entrar depois, reaproveitando a mesma mensagem.
// =============================================================================

import { sessaoValida } from './_auth.js'

// Escapa os caracteres especiais de HTML.
function escaparHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Converte a mensagem (formatação do WhatsApp) para HTML do Telegram:
//   *negrito*  -> <b>   |   ~riscado~ -> <s>   |   `mono` -> <code>
function paraHtml(texto) {
  let t = escaparHtml(texto)
  t = t.replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
  t = t.replace(/~([^~\n]+)~/g, '<s>$1</s>')
  t = t.replace(/`([^`\n]+)`/g, '<code>$1</code>')
  return t
}

// Chama um método da Bot API e lança erro se o Telegram recusar.
async function chamarTelegram(metodo, token, payload) {
  const resp = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await resp.json().catch(() => ({}))
  if (!data.ok) {
    throw new Error(data.description || `Erro Telegram (${metodo})`)
  }
  return data
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'METODO_NAO_PERMITIDO' })
  }
  if (!sessaoValida(req)) {
    return res.status(401).json({ erro: 'NAO_AUTENTICADO' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return res.status(400).json({
      erro: 'SEM_BOT',
      detalhe: 'Configure TELEGRAM_BOT_TOKEN na Vercel.',
    })
  }

  const { mensagem = '', urlImagem = '', chatId } = req.body || {}
  const destino = (chatId || process.env.TELEGRAM_CHAT_ID || '').toString().trim()

  if (!destino) {
    return res.status(400).json({
      erro: 'SEM_DESTINO',
      detalhe: 'Informe o canal/grupo de destino nas Configurações.',
    })
  }
  if (!mensagem.trim()) {
    return res.status(400).json({ erro: 'SEM_MENSAGEM' })
  }

  const html = paraHtml(mensagem)

  try {
    if (urlImagem) {
      // Legenda do sendPhoto tem limite de 1024 caracteres.
      if (html.length <= 1024) {
        await chamarTelegram('sendPhoto', token, {
          chat_id: destino,
          photo: urlImagem,
          caption: html,
          parse_mode: 'HTML',
        })
      } else {
        // Mensagem longa: envia a foto e o texto em seguida.
        await chamarTelegram('sendPhoto', token, {
          chat_id: destino,
          photo: urlImagem,
        })
        await chamarTelegram('sendMessage', token, {
          chat_id: destino,
          text: html,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        })
      }
    } else {
      await chamarTelegram('sendMessage', token, {
        chat_id: destino,
        text: html,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      })
    }
    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(502).json({
      erro: 'FALHA_TELEGRAM',
      detalhe: String(e?.message || e),
    })
  }
}

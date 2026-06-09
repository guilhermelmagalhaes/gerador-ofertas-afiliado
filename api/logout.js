// =============================================================================
// POST /api/logout — apaga o cookie de sessão.
// =============================================================================

import { cookieLimpar } from './_auth.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Set-Cookie', cookieLimpar(req))
  return res.status(200).json({ ok: true })
}

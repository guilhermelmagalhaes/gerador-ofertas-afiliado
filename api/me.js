// =============================================================================
// GET /api/me — informa se a requisição está autenticada.
// `semSenha` indica que o app está em modo aberto (nenhuma senha configurada).
// =============================================================================

import { senhaConfigurada, sessaoValida } from './_auth.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    autenticado: sessaoValida(req),
    semSenha: !senhaConfigurada(),
  })
}

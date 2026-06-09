// =============================================================================
// POST /api/login — recebe { senha } e, se correta, cria a sessão (cookie).
// =============================================================================

import {
  senhaConfigurada,
  senhaCorreta,
  gerarToken,
  cookieSessao,
} from './_auth.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'METODO_NAO_PERMITIDO' })
  }

  // Sem senha configurada: app aberto, login é desnecessário.
  if (!senhaConfigurada()) {
    return res.status(200).json({ ok: true, semSenha: true })
  }

  const senha = req.body?.senha ?? ''
  if (!senhaCorreta(senha)) {
    return res.status(401).json({ erro: 'SENHA_INVALIDA' })
  }

  res.setHeader('Set-Cookie', cookieSessao(gerarToken(), req))
  return res.status(200).json({ ok: true })
}

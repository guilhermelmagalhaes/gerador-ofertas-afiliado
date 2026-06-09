// =============================================================================
// Cliente de autenticação (frontend). Conversa com /api/login, /api/me e
// /api/logout. A senha nunca é guardada no navegador — só trafega no login.
// A sessão é mantida por um cookie HttpOnly definido pelo servidor.
// =============================================================================

/**
 * Consulta o estado de autenticação.
 * @returns {Promise<{autenticado: boolean, semSenha: boolean}>}
 */
export async function checarSessao() {
  try {
    const r = await fetch('/api/me', { credentials: 'include' })
    if (!r.ok) return { autenticado: false, semSenha: false }
    return await r.json()
  } catch {
    // Backend indisponível (ex.: build estático sem /api): trata como aberto
    // para não travar o uso offline.
    return { autenticado: true, semSenha: true }
  }
}

/**
 * Faz login com a senha de administrador.
 * @throws {Error} com message 'SENHA_INVALIDA' (ou outra) em caso de falha.
 */
export async function login(senha) {
  const r = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ senha }),
  })
  if (!r.ok) {
    const dados = await r.json().catch(() => ({}))
    throw new Error(dados.erro || 'FALHA_LOGIN')
  }
  return r.json()
}

/** Encerra a sessão (apaga o cookie no servidor). */
export async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' })
  } catch {
    // ignora — o importante é o frontend voltar para a tela de login
  }
}

// =============================================================================
// Helpers de autenticação (compartilhados pelas Serverless Functions).
//
// Estratégia: senha ÚNICA de administrador, SEM banco de dados.
//   - A senha real fica na env var APP_PASSWORD (no servidor, nunca no browser).
//   - Ao logar, geramos um TOKEN de sessão assinado com HMAC-SHA256 e o
//     guardamos num cookie HttpOnly (inacessível via JavaScript).
//   - As demais funções só validam a assinatura + expiração do token.
//
// O arquivo começa com "_" — assim a Vercel o trata como módulo auxiliar,
// não como uma rota acessível em /api/_auth.
// =============================================================================

import crypto from 'node:crypto'

// Duração da sessão: 30 dias.
const MAX_AGE = 60 * 60 * 24 * 30

// Segredo para assinar o token. Usa SESSION_SECRET se houver; senão, deriva da
// própria senha (assim o usuário só precisa configurar APP_PASSWORD).
function getSecret() {
  return (
    process.env.SESSION_SECRET ||
    process.env.APP_PASSWORD ||
    'dev-inseguro-troque-em-producao'
  )
}

/** Há senha configurada? Se não, o app roda em "modo aberto" (sem login). */
export function senhaConfigurada() {
  return !!process.env.APP_PASSWORD
}

/** Compara a senha enviada com a real, de forma resistente a timing attacks. */
export function senhaCorreta(tentativa) {
  const real = process.env.APP_PASSWORD || ''
  if (!real) return false
  // Faz hash dos dois para garantir buffers de mesmo tamanho no timingSafeEqual.
  const a = crypto.createHash('sha256').update(String(tentativa)).digest()
  const b = crypto.createHash('sha256').update(real).digest()
  return crypto.timingSafeEqual(a, b)
}

/** Gera um token de sessão assinado (corpo.assinatura). */
export function gerarToken() {
  const payload = { exp: Date.now() + MAX_AGE * 1000 }
  const corpo = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const assinatura = crypto
    .createHmac('sha256', getSecret())
    .update(corpo)
    .digest('base64url')
  return `${corpo}.${assinatura}`
}

/** Valida assinatura e expiração de um token. */
export function tokenValido(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false
  const [corpo, assinatura] = token.split('.')
  const esperada = crypto
    .createHmac('sha256', getSecret())
    .update(corpo)
    .digest('base64url')

  const a = Buffer.from(assinatura)
  const b = Buffer.from(esperada)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false

  try {
    const payload = JSON.parse(Buffer.from(corpo, 'base64url').toString())
    return !!payload.exp && Date.now() < payload.exp
  } catch {
    return false
  }
}

/** Lê um cookie pelo nome a partir do cabeçalho da requisição. */
export function lerCookie(req, nome) {
  const raw = req.headers?.cookie || ''
  const par = raw
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(nome + '='))
  return par ? decodeURIComponent(par.slice(nome.length + 1)) : null
}

/**
 * A requisição tem sessão válida?
 * Sem senha configurada => modo aberto (sempre autenticado).
 */
export function sessaoValida(req) {
  if (!senhaConfigurada()) return true
  return tokenValido(lerCookie(req, 'sessao'))
}

// Em https usamos o atributo Secure; em http (localhost) não, senão o
// navegador descarta o cookie.
function ehSeguro(req) {
  const proto = req.headers?.['x-forwarded-proto']
  if (proto) return proto === 'https'
  return !String(req.headers?.host || '').includes('localhost')
}

/** Monta o cabeçalho Set-Cookie que cria a sessão. */
export function cookieSessao(token, req) {
  const partes = [
    `sessao=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE}`,
  ]
  if (ehSeguro(req)) partes.push('Secure')
  return partes.join('; ')
}

/** Monta o cabeçalho Set-Cookie que apaga a sessão (logout). */
export function cookieLimpar(req) {
  const partes = ['sessao=', 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0']
  if (ehSeguro(req)) partes.push('Secure')
  return partes.join('; ')
}

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// -----------------------------------------------------------------------------
// Plugin de desenvolvimento: serve as Serverless Functions de /api durante o
// `npm run dev`. Em produção, a Vercel executa a pasta /api automaticamente;
// localmente, este middleware carrega o MESMO handler e o expõe na rota /api/*.
//
// Suporta qualquer arquivo api/<nome>.js (login, me, logout, ml-produto...),
// lê o corpo JSON em POST/PUT e adapta req/res ao formato esperado pelos
// handlers (req.query, req.body, res.status(), res.json()).
// -----------------------------------------------------------------------------
function apiDevPlugin() {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()
        try {
          const u = new URL(req.url, 'http://localhost')
          // /api/login?x=1 -> "login"  (ignora barras finais)
          const nome = u.pathname.replace(/^\/api\//, '').replace(/\/+$/, '')
          // Bloqueia vazio e módulos auxiliares (ex.: _auth).
          if (!nome || nome.startsWith('_')) return next()

          // Reconstrói req.query (a Vercel faz isso em produção).
          req.query = Object.fromEntries(u.searchParams.entries())

          // Lê o corpo JSON em métodos com body.
          if (req.method === 'POST' || req.method === 'PUT') {
            const chunks = []
            for await (const c of req) chunks.push(c)
            const raw = Buffer.concat(chunks).toString('utf8')
            try {
              req.body = raw ? JSON.parse(raw) : {}
            } catch {
              req.body = {}
            }
          }

          // Helpers res.status()/res.json() usados pelos handlers.
          res.status = (codigo) => {
            res.statusCode = codigo
            return res
          }
          res.json = (obj) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(obj))
            return res
          }

          const mod = await server.ssrLoadModule(`/api/${nome}.js`)
          await mod.default(req, res)
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ erro: 'DEV_API', detalhe: String(e) }))
        }
      })
    },
  }
}

// Configuração do Vite com React + o proxy de /api em desenvolvimento.
export default defineConfig(({ mode }) => {
  // Carrega o .env (sem exigir o prefixo VITE_) para process.env, assim as
  // Serverless Functions enxergam as variáveis durante o dev.
  // Em produção, quem injeta essas variáveis é a Vercel.
  const env = loadEnv(mode, process.cwd(), '')
  for (const chave of [
    'ML_CLIENT_ID',
    'ML_CLIENT_SECRET',
    'ML_ACCESS_TOKEN',
    'APP_PASSWORD',
    'SESSION_SECRET',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
  ]) {
    if (env[chave]) process.env[chave] = env[chave]
  }

  return {
    plugins: [react(), apiDevPlugin()],
  }
})

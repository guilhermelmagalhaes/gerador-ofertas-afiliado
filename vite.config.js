import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// -----------------------------------------------------------------------------
// Plugin de desenvolvimento: serve a Serverless Function de /api durante o
// `npm run dev`. Em produção, a Vercel executa a pasta /api automaticamente;
// localmente, o `vite dev` não conhece /api, então este middleware carrega o
// MESMO handler (api/ml-produto.js) e o expõe na rota /api/ml-produto.
//
// Resultado: a busca de produto do Mercado Livre funciona igual em dev e prod,
// sem precisar de um servidor separado nem do `vercel dev`.
// -----------------------------------------------------------------------------
function apiDevPlugin() {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/ml-produto')) return next()
        try {
          // Reconstroi req.query (a Vercel faz isso automaticamente em produção).
          const u = new URL(req.url, 'http://localhost')
          req.query = Object.fromEntries(u.searchParams.entries())

          // Adiciona os helpers res.status()/res.json() esperados pelo handler.
          res.status = (codigo) => {
            res.statusCode = codigo
            return res
          }
          res.json = (obj) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(obj))
            return res
          }

          // Carrega o handler como módulo ESM e o executa.
          const mod = await server.ssrLoadModule('/api/ml-produto.js')
          await mod.default(req, res)
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ erro: 'DEV_PROXY', detalhe: String(e) }))
        }
      })
    },
  }
}

// Configuração do Vite com React + o proxy de /api em desenvolvimento.
export default defineConfig(({ mode }) => {
  // Carrega o .env (sem exigir o prefixo VITE_) para process.env, assim a
  // Serverless Function de /api enxerga ML_CLIENT_ID/SECRET durante o dev.
  // Em produção, quem injeta essas variáveis é a Vercel.
  const env = loadEnv(mode, process.cwd(), '')
  for (const chave of ['ML_CLIENT_ID', 'ML_CLIENT_SECRET', 'ML_ACCESS_TOKEN']) {
    if (env[chave]) process.env[chave] = env[chave]
  }

  return {
    plugins: [react(), apiDevPlugin()],
  }
})

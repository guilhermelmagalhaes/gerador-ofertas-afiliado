// =============================================================================
// Acesso ao IndexedDB isolado (camada de persistência).
//
// Toda a aplicação fala com o banco APENAS através deste módulo. Isso mantém
// o resto do código desacoplado da tecnologia de armazenamento e facilita
// a Fase 2 (ex.: trocar/estender o schema sem mexer nos componentes).
//
// Usamos a lib `idb`, um wrapper fino baseado em Promises sobre o IndexedDB.
// =============================================================================

import { openDB } from 'idb'

const DB_NOME = 'ofertas-afiliado-db'
const DB_VERSAO = 1

// Abre (ou cria) o banco. O callback `upgrade` roda apenas quando o banco
// é criado pela primeira vez ou quando DB_VERSAO aumenta.
function abrirBanco() {
  return openDB(DB_NOME, DB_VERSAO, {
    upgrade(db) {
      // ----- Store de OFERTAS -----
      if (!db.objectStoreNames.contains('offers')) {
        const offers = db.createObjectStore('offers', {
          keyPath: 'id',
          autoIncrement: true,
        })
        // Índice por loja para filtrar o histórico rapidamente.
        offers.createIndex('loja', 'loja')
        offers.createIndex('criadoEm', 'criadoEm')
      }

      // ----- Store de CUPONS -----
      if (!db.objectStoreNames.contains('coupons')) {
        const coupons = db.createObjectStore('coupons', {
          keyPath: 'id',
          autoIncrement: true,
        })
        coupons.createIndex('loja', 'loja')
      }
    },
  })
}

// ----------------------------------------------------------------------------
// OFERTAS
// ----------------------------------------------------------------------------

/**
 * Salva uma oferta gerada.
 * Campos reservados para a FASE 2 (statusEnvio, canal, enviadoEm) são criados
 * como null aqui — fazem parte do schema, mas não têm uso nesta fase.
 */
export async function addOffer(offer) {
  const db = await abrirBanco()
  const registro = {
    loja: offer.loja,
    nomeProduto: offer.nomeProduto,
    precoDe: offer.precoDe ?? null,
    precoPor: offer.precoPor,
    descontoPercent: offer.descontoPercent ?? null,
    cupomCodigo: offer.cupomCodigo ?? null,
    linkAfiliado: offer.linkAfiliado,
    urlImagem: offer.urlImagem ?? null,
    mensagemGerada: offer.mensagemGerada,
    criadoEm: offer.criadoEm ?? Date.now(),
    // FASE 2: campos reservados para o módulo de envio.
    statusEnvio: null,
    canal: null,
    enviadoEm: null,
  }
  return db.add('offers', registro)
}

/** Retorna todas as ofertas (mais recentes primeiro). */
export async function getOffers() {
  const db = await abrirBanco()
  const todas = await db.getAll('offers')
  return todas.sort((a, b) => b.criadoEm - a.criadoEm)
}

/** Remove uma oferta pelo id. */
export async function deleteOffer(id) {
  const db = await abrirBanco()
  return db.delete('offers', id)
}

// ----------------------------------------------------------------------------
// CUPONS
// ----------------------------------------------------------------------------

/** Cadastra um novo cupom. */
export async function addCoupon(coupon) {
  const db = await abrirBanco()
  const registro = {
    codigo: coupon.codigo,
    loja: coupon.loja,
    tipoDesconto: coupon.tipoDesconto, // 'percentual' | 'fixo'
    valorDesconto: coupon.valorDesconto,
    categoria: coupon.categoria ?? '',
    valorMinimo: coupon.valorMinimo ?? null,
    validade: coupon.validade, // string 'YYYY-MM-DD'
    criadoEm: Date.now(),
  }
  return db.add('coupons', registro)
}

/** Atualiza um cupom existente (precisa conter o id). */
export async function updateCoupon(coupon) {
  const db = await abrirBanco()
  return db.put('coupons', coupon)
}

/** Retorna todos os cupons cadastrados. */
export async function getCoupons() {
  const db = await abrirBanco()
  return db.getAll('coupons')
}

/** Remove um cupom pelo id. */
export async function deleteCoupon(id) {
  const db = await abrirBanco()
  return db.delete('coupons', id)
}

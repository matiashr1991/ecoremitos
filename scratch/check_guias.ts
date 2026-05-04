
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const guias = await prisma.guia.findMany({
    where: { deletedAt: null },
    include: { remitos: { where: { deletedAt: null } } }
  })

  console.log('Total guias:', guias.length)
  
  const sinTitularVigentes = guias.filter(g => !g.titularId && g.estado === 'vigente')
  console.log('Vigentes sin titular:', sinTitularVigentes.length)
  if (sinTitularVigentes.length > 0) {
    console.log('Ejemplos vigentes sin titular:', sinTitularVigentes.slice(0, 5).map(g => g.nrguia))
  }
  
  const conTitularSinRemitosNormal = guias.filter(g => g.titularId && g.remitos.length === 0 && g.tipo === 'normal' && !g.deposito)
  console.log('Normales con titular pero sin remitos:', conTitularSinRemitosNormal.length)
  if (conTitularSinRemitosNormal.length > 0) {
    console.log('Ejemplos normales con titular sin remitos:', conTitularSinRemitosNormal.slice(0, 5).map(g => g.nrguia))
  }

  const depositoSinRemitos = guias.filter(g => g.tipo === 'deposito' || g.deposito)
  console.log('Total depósitos:', depositoSinRemitos.length)
  const depositoConTitular = depositoSinRemitos.filter(g => g.titularId)
  console.log('Depósitos con titular:', depositoConTitular.length)
  const depositoSinTitular = depositoSinRemitos.filter(g => !g.titularId)
  console.log('Depósitos sin titular:', depositoSinTitular.length)

  const enBlancoConTitular = guias.filter(g => g.estado === 'en_blanco' && g.titularId)
  console.log('En blanco con titular:', enBlancoConTitular.length)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

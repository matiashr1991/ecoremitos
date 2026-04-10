import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // Create delegaciones
  const delegaciones = await Promise.all([
    prisma.delegacion.upsert({
      where: { nombre: "Casa Central" },
      update: {},
      create: { nombre: "Casa Central", email: "central@ecoremitos.gob.ar" },
    }),
    prisma.delegacion.upsert({
      where: { nombre: "Delegación Norte" },
      update: {},
      create: { nombre: "Delegación Norte", email: "norte@ecoremitos.gob.ar" },
    }),
    prisma.delegacion.upsert({
      where: { nombre: "Delegación Sur" },
      update: {},
      create: { nombre: "Delegación Sur", email: "sur@ecoremitos.gob.ar" },
    }),
    prisma.delegacion.upsert({
      where: { nombre: "Delegación Oeste" },
      update: {},
      create: { nombre: "Delegación Oeste", email: "oeste@ecoremitos.gob.ar" },
    }),
  ]);
  console.log(`  ✅ ${delegaciones.length} delegaciones creadas`);

  // Create sample titulares
  const titulares = await Promise.all([
    prisma.titular.upsert({
      where: { cuit: "20-12345678-9" },
      update: {},
      create: { razonSocial: "Forestal del Norte S.A.", cuit: "20-12345678-9" },
    }),
    prisma.titular.upsert({
      where: { cuit: "30-98765432-1" },
      update: {},
      create: { razonSocial: "Maderas Argentinas SRL", cuit: "30-98765432-1" },
    }),
    prisma.titular.upsert({
      where: { cuit: "27-11223344-5" },
      update: {},
      create: { razonSocial: "Aserradero El Pino", cuit: "27-11223344-5" },
    }),
  ]);
  console.log(`  ✅ ${titulares.length} titulares creados`);

  console.log("\n✨ Seed completado!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

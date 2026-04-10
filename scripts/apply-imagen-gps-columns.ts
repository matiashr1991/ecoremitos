import "dotenv/config";
import { Client } from "pg";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query(`
    ALTER TABLE "imagenes"
    ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "gps_accuracy" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "gps_captured_at" TIMESTAMP(3);
  `);

  console.log("OK: columnas GPS aplicadas en imagenes");
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});

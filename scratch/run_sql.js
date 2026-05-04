
const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://postgres:131291Mr....@localhost:5432/ecoremitos"
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT 
      g.estado, 
      g.tipo,
      (g.titular_id IS NULL) as sin_titular, 
      (SELECT count(*) FROM remitos r WHERE r.guia_id = g.id AND r.deleted_at IS NULL) as remitos_count,
      count(*) 
    FROM guias g 
    WHERE g.deleted_at IS NULL 
    GROUP BY g.estado, g.tipo, sin_titular, remitos_count
    ORDER BY g.estado, g.tipo;
  `);
  console.table(res.rows);
  await client.end();
}
run();

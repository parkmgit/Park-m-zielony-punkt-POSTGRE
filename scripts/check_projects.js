const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://postgres:er1glTBZMA@localhost:5432/park_m_trees?sslmode=disable' });

async function main() {
  const projects = await p.query(`
    SELECT p.id, p.name, p.project_number, p.location, COUNT(t.id)::int as trees
    FROM projects p
    LEFT JOIN sites s ON s.project_id = p.id
    LEFT JOIN trees t ON t.site_id = s.id
    GROUP BY p.id, p.name, p.project_number, p.location
    ORDER BY trees DESC
  `);
  console.log('=== PROJEKTY ===');
  console.log(JSON.stringify(projects.rows, null, 2));
  await p.end();
}
main().catch(e => { console.error(e.message); p.end(); });

const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://postgres:er1glTBZMA@localhost:5432/park_m_trees?sslmode=disable' });

async function main() {
  // Projekt Białystok = id 1 ("Spacer wśród drzew")
  // Alan Michalik = id 6
  const PROJECT_ID = 1;
  const ALAN_ID = 6;

  const before = await p.query(
    `SELECT COUNT(*)::int as cnt FROM trees t
     JOIN sites s ON t.site_id = s.id
     WHERE s.project_id = $1 AND t.created_by = 1`,
    [PROJECT_ID]
  );
  console.log(`Drzew do przepisania: ${before.rows[0].cnt}`);

  const result = await p.query(
    `UPDATE trees SET created_by = $1
     WHERE site_id IN (SELECT id FROM sites WHERE project_id = $2)
     AND created_by = 1`,
    [ALAN_ID, PROJECT_ID]
  );
  console.log(`Zaktualizowano: ${result.rowCount} drzew → Alan Michalik (id=${ALAN_ID})`);

  // Sprawdź efekt
  const check = await p.query(
    `SELECT u.name, COUNT(t.id)::int as trees
     FROM trees t JOIN users u ON t.created_by = u.id
     WHERE t.site_id IN (SELECT id FROM sites WHERE project_id = $1)
     GROUP BY u.name`,
    [PROJECT_ID]
  );
  console.log('Po aktualizacji:', JSON.stringify(check.rows));

  await p.end();
}
main().catch(e => { console.error(e.message); p.end(); });

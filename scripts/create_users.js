const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: 'postgresql://postgres:er1glTBZMA@localhost:5432/park_m_trees?sslmode=disable'
});

const USERS = [
  { name: 'Konrad Kański',          email: 'konrad.kanski@park-m.pl',          password: 'KoKa2847', role: 'pracownik' },
  { name: 'Aleksandra Kubacka',     email: 'aleksandra.kubacka@park-m.pl',     password: 'AlKu5931', role: 'pracownik' },
  { name: 'Tomasz Mozdyniewicz',    email: 'tomasz.mozdyniewicz@park-m.pl',    password: 'ToMo7264', role: 'pracownik' },
  { name: 'Luiza Syjud',            email: 'luiza.syjud@park-m.pl',            password: 'LuSy3815', role: 'pracownik' },
  { name: 'Sylwia Kumorek',         email: 'sylwia.kumorek@park-m.pl',         password: 'SyKu6492', role: 'pracownik' },
];

async function main() {
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    try {
      await pool.query(
        `INSERT INTO users (name, role, email, password_hash, active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (email) DO UPDATE SET name=$1, role=$2, password_hash=$4, active=true`,
        [u.name, u.role, u.email, hash]
      );
      console.log(`✓ ${u.name} (${u.email}) — hasło: ${u.password}`);
    } catch (e) {
      console.error(`✗ ${u.name}: ${e.message}`);
    }
  }

  // Pokaż wszystkich użytkowników
  const all = await pool.query(`SELECT id, name, email, role, active FROM users ORDER BY id`);
  console.log('\n=== WSZYSCY UŻYTKOWNICY ===');
  all.rows.forEach(r => console.log(`  [${r.id}] ${r.name} | ${r.email} | ${r.role} | aktywny: ${r.active}`));

  await pool.end();
}

main().catch(e => { console.error(e.message); pool.end(); });

import { hashPassword, validatePassword } from './password';
import type { PoolClient } from 'pg';

// PostgreSQL connection pool
let dbClient: any = null;
let isEnding = false;

export async function resetDbClient() {
  if (dbClient && !isEnding) {
    isEnding = true;
    try { await dbClient.end(); } catch {}
    dbClient = null;
    isEnding = false;
  }
}

async function getDbClient() {
  if (!dbClient) {
    console.log('🚀 Initializing PostgreSQL connection');
    const { Pool } = await import('pg');
    
    // Sprawdź czy jest DATABASE_URL (Neon/Vercel) czy osobne zmienne (lokalne)
    const databaseUrl = process.env.DATABASE_URL;
    
    if (databaseUrl) {
      console.log('📊 Using DATABASE_URL connection string');
      const sslDisabled = databaseUrl.includes('sslmode=disable') || databaseUrl.includes('sslmode=no-ssl');
      dbClient = new Pool({
        connectionString: databaseUrl,
        ssl: sslDisabled ? false : { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 120000,
        connectionTimeoutMillis: 120000,
      });
    } else {
      console.log('📊 Using individual DB config variables');
      console.log('DB Config:', {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '5432',
        user: process.env.DB_USER,
        database: process.env.DB_NAME || 'park_m_trees',
        hasPassword: !!process.env.DB_PASSWORD,
      });
      
      dbClient = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'park_m_trees',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 120000,
        connectionTimeoutMillis: 120000,
      });
    }
    
    dbClient.on('error', (err: any) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }
  return dbClient;
}

// Helper function to execute queries
export async function query<T = any>(sqlQuery: string, params?: any[]): Promise<T[]> {
  try {
    const client = await getDbClient();
    
    // Convert ? placeholders to $1, $2, etc. for PostgreSQL
    let pgQuery = sqlQuery;
    let paramIndex = 1;
    while (pgQuery.includes('?')) {
      pgQuery = pgQuery.replace('?', `$${paramIndex++}`);
    }
    
    const result = await client.query(pgQuery, params || []);
    return result.rows as T[];
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

// Helper function for single row queries
export async function queryOne<T = any>(sqlQuery: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sqlQuery, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = await getDbClient();
  const client: PoolClient = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1 as test');
    console.log('✓ Database connection successful');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

// Initialize database schema
export async function initDB() {
  try {
    console.log('Initializing PostgreSQL database schema...');
    
    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'brygadzista', 'pracownik')),
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMP
      )
    `);

    // Projects (Projekty) table
    await query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        project_number VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(500),
        client VARCHAR(255),
        trees_to_plant INTEGER DEFAULT 0,
        trees_planted INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sites (Budowy) table
    await query(`
      CREATE TABLE IF NOT EXISTS sites (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id),
        code VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(500),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Species (Gatunki) table
    await query(`
      CREATE TABLE IF NOT EXISTS species (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        scientific_name VARCHAR(255),
        active BOOLEAN DEFAULT true
      )
    `);

    // Trees table
    await query(`
      CREATE TABLE IF NOT EXISTS trees (
        id SERIAL PRIMARY KEY,
        tree_number VARCHAR(100),
        species_id INTEGER REFERENCES species(id),
        site_id INTEGER NOT NULL REFERENCES sites(id),
        worker_id INTEGER REFERENCES users(id),
        plant_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('posadzone', 'utrzymanie', 'wymiana', 'usuniete')),
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        accuracy DECIMAL(10, 2),
        notes TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tree Actions table
    await query(`
      CREATE TABLE IF NOT EXISTS tree_actions (
        id SERIAL PRIMARY KEY,
        tree_id INTEGER NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('posadzenie', 'podlewanie', 'przyciecie', 'inspekcja', 'wymiana', 'usuniecie')),
        notes TEXT,
        performed_by INTEGER NOT NULL REFERENCES users(id),
        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Shrubs table
    await query(`
      CREATE TABLE IF NOT EXISTS shrubs (
        id SERIAL PRIMARY KEY,
        site_id INTEGER REFERENCES sites(id),
        species_id INTEGER REFERENCES species(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        plant_date DATE NOT NULL,
        worker_id INTEGER REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'posadzone',
        notes TEXT,
        active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Shrub Actions table
    await query(`
      CREATE TABLE IF NOT EXISTS shrub_actions (
        id SERIAL PRIMARY KEY,
        shrub_id INTEGER REFERENCES shrubs(id) ON DELETE CASCADE,
        action_type VARCHAR(100) NOT NULL,
        quantity_affected INTEGER,
        performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        performer_id INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Photos table
    await query(`
      CREATE TABLE IF NOT EXISTS watering_reminders (
        id SERIAL PRIMARY KEY,
        tree_id INTEGER NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
        assigned_user_id INTEGER NOT NULL REFERENCES users(id),
        source_action_id INTEGER REFERENCES tree_actions(id) ON DELETE SET NULL,
        due_at TIMESTAMP NOT NULL,
        remind_before_hours INTEGER NOT NULL DEFAULT 24,
        status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'cancelled')),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('tree', 'tree_action')),
        entity_id INTEGER NOT NULL,
        filename VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        thumbnail_url VARCHAR(500),
        taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        taken_by INTEGER NOT NULL REFERENCES users(id)
      )
    `);

    // Sync Queue for offline support
    await query(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(100) NOT NULL,
        entity_data TEXT NOT NULL,
        action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        synced BOOLEAN DEFAULT false
      )
    `);

    // Insert default data
    await insertDefaultData();
    
    console.log('✓ Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Migrations are handled in the schema creation above

async function insertDefaultData() {
  try {
    const userCount = await query<{ count: string | number }>('SELECT COUNT(*) as count FROM users');

    if (Number(userCount[0].count) === 0) {
      const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
      const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
      const initialAdminName = process.env.INITIAL_ADMIN_NAME?.trim() || 'Administrator';
      const passwordError = validatePassword(initialAdminPassword);

      if (initialAdminPassword && initialAdminEmail && !passwordError) {
        const passwordHash = await hashPassword(initialAdminPassword);
        await query(
          'INSERT INTO users (name, role, email, password_hash) VALUES (?, ?, ?, ?)',
          [initialAdminName, 'admin', initialAdminEmail, passwordHash]
        );
        console.log('Initial administrator account created');
      } else {
        console.warn(
          'Users table is empty. Set INITIAL_ADMIN_EMAIL and a valid INITIAL_ADMIN_PASSWORD before initialization.'
        );
      }
    }

    const speciesCount = await query<{ count: string | number }>('SELECT COUNT(*) as count FROM species');
    if (Number(speciesCount[0].count) === 0) {
      await query('INSERT INTO species (name, scientific_name) VALUES (?, ?)', ['Lipa srebrzysta Brabant', 'Tilia tomentosa Brabant']);
      await query('INSERT INTO species (name, scientific_name) VALUES (?, ?)', ['Wiśnia piłkowana Kanzan', 'Prunus serrulata Kanzan']);
      await query('INSERT INTO species (name, scientific_name) VALUES (?, ?)', ['Grusza drobnoowocowa Chanticleer', 'Pyrus calleryana Chanticleer']);
      console.log('Default species inserted successfully');
    }
  } catch (error) {
    console.error('Error inserting default data:', error);
  }
}

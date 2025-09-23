import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of migration files
    const migrationFiles = [
      '001_create_users_table.sql',
      '002_create_couples_table.sql',
      '003_create_couple_members_table.sql',
      '004_create_invites_table.sql',
      '005_create_sessions_table.sql',
      '006_create_messages_table.sql',
      '007_create_session_feedback_table.sql',
      '008_create_migrations_table.sql',
      '009_setup_rls_policies.sql',
      '010_create_indexes.sql',
    ];

    for (const filename of migrationFiles) {
      // Check if migration already ran
      const result = await client.query(
        'SELECT id FROM migrations WHERE filename = $1',
        [filename]
      );

      if (result.rows.length === 0) {
        console.log(`Running migration: ${filename}`);
        
        try {
          const migrationPath = join(__dirname, 'migrations', filename);
          const migrationSQL = readFileSync(migrationPath, 'utf8');
          
          await client.query(migrationSQL);
          await client.query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [filename]
          );
          
          console.log(`✅ Migration ${filename} completed`);
        } catch (error) {
          console.error(`❌ Migration ${filename} failed:`, error);
          throw error;
        }
      } else {
        console.log(`⏭️  Migration ${filename} already executed`);
      }
    }

    console.log('🎉 All migrations completed successfully');
  } finally {
    client.release();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

export { runMigrations };

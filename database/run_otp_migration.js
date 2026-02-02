require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Use the same connection configuration as the main app
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected to database');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '006_add_login_otp_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔧 Running migration: 006_add_login_otp_table.sql');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully');

    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();

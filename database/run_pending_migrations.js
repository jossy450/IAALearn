const { pool } = require('../server/database/connection');
const fs = require('fs');
const path = require('path');

/**
 * Run pending database migrations
 * This script executes migration files in the migrations folder
 */
async function runPendingMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migrations...');
    
    // Create migrations_log table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations_log (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Get list of already executed migrations
    const { rows: executedMigrations } = await client.query(
      'SELECT migration_name FROM migrations_log ORDER BY executed_at'
    );
    const executedSet = new Set(executedMigrations.map(m => m.migration_name));
    
    // Read all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Execute in alphabetical order
    
    console.log(`📁 Found ${migrationFiles.length} migration files`);
    console.log(`✅ Already executed: ${executedSet.size} migrations`);
    
    let executed = 0;
    let skipped = 0;
    
    for (const file of migrationFiles) {
      if (executedSet.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        skipped++;
        continue;
      }
      
      console.log(`🔧 Running ${file}...`);
      
      try {
        const migrationSQL = fs.readFileSync(
          path.join(migrationsDir, file),
          'utf8'
        );
        
        // Execute migration in a transaction
        await client.query('BEGIN');
        await client.query(migrationSQL);
        await client.query(
          'INSERT INTO migrations_log (migration_name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        
        console.log(`✅ Successfully executed ${file}`);
        executed++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed to execute ${file}:`, error.message);
        throw error;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Executed: ${executed}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📁 Total: ${migrationFiles.length}`);
    console.log('\n✨ Database migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runPendingMigrations()
    .then(() => {
      console.log('✅ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error.message);
      process.exit(1);
    });
}

module.exports = { runPendingMigrations };

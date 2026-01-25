const { pool } = require('./connection');
const fs = require('fs');
const path = require('path');

const migrate = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting database migration...');
    
    // Read and execute schema
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf8'
    );
    
    await client.query(schemaSQL);
    
    console.log('✓ Database migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrate };

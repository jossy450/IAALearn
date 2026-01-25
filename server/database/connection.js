const { Pool } = require('pg');

/**
 * Render Postgres (and many hosted Postgres providers) expose DATABASE_URL.
 * Local development can still use DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD.
 */
const hasDatabaseUrl = !!process.env.DATABASE_URL;

const pool = new Pool(
  hasDatabaseUrl
    ? {
        connectionString: process.env.DATABASE_URL,
        // Render Postgres typically requires SSL in production.
        // Setting rejectUnauthorized=false avoids cert chain issues in managed environments.
        ssl:
          process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'interview_assistant',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

const initializeDatabase = async () => {
  // Skip database connection if in demo mode
  if (process.env.DEMO_MODE === 'true') {
    console.log('📦 Running in DEMO MODE - database not required');
    return false;
  }

  try {
    const client = await pool.connect();
    console.log('✅ Database connection established');
    client.release();
    return true;
  } catch (error) {
    console.warn('⚠️  Database connection failed:', error.message);
    console.log('💡 Tip: Set DEMO_MODE=true to run without database, or configure DATABASE_URL/DB_* env vars');
    return false;
  }
};

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  initializeDatabase,
};

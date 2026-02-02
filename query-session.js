require('dotenv').config();
const { Client } = require('pg');

(async () => {
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    const result = await client.query(`
      SELECT s.id, s.user_id, u.email, s.company_name, s.position
      FROM interview_sessions s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log(JSON.stringify(row, null, 2));
    } else {
      console.log('No sessions found');
    }
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

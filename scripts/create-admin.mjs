import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:root@187.77.179.249:5432/TestDB'
});

try {
  await pool.query(`
    INSERT INTO nexus_accounts (id, username, display_name, role, status, preferences)
    VALUES ('@owner:localhost', 'owner', 'NEXUS Owner', 'ADMIN', 'ACTIVE', '{"readReceipts":true,"presence":true,"contactPolicy":"anyone","presencePolicy":"all"}')
    ON CONFLICT (id) DO UPDATE SET role='ADMIN', status='ACTIVE', display_name='NEXUS Owner'
  `);
  
  await pool.query(`
    INSERT INTO nexus_accounts (id, username, display_name, role, status, preferences)
    VALUES ('@admin:localhost', 'admin', 'Administrator', 'ADMIN', 'ACTIVE', '{"readReceipts":true,"presence":true,"contactPolicy":"anyone","presencePolicy":"all"}')
    ON CONFLICT (id) DO UPDATE SET role='ADMIN', status='ACTIVE', display_name='Administrator'
  `);

  const res = await pool.query("SELECT id, username, display_name, role, status FROM nexus_accounts");
  console.log('Admin accounts registered in database:', res.rows);
} catch (err) {
  console.error('Error creating admin accounts:', err);
} finally {
  await pool.end();
}

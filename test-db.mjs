import pg from 'pg';
const { Client } = pg;

const configs = [
  { host: 'aws-0-ap-southeast-1.pooler.supabase.com', port: 6543, user: 'postgres.akcuegneahoxsispvooa', password: 'j92jSyx7qBQQHLLI', database: 'postgres', connectionTimeoutMillis: 8000 },
  { host: 'aws-0-ap-southeast-2.pooler.supabase.com', port: 6543, user: 'postgres.akcuegneahoxsispvooa', password: 'j92jSyx7qBQQHLLI', database: 'postgres', connectionTimeoutMillis: 8000 },
  { host: 'aws-0-ap-southeast-1.pooler.supabase.com', port: 5432, user: 'postgres.akcuegneahoxsispvooa', password: 'j92jSyx7qBQQHLLI', database: 'postgres', connectionTimeoutMillis: 8000 },
];

async function tryConnect(config, label) {
  const client = new Client(config);
  try {
    await client.connect();
    const res = await client.query('SELECT current_database(), version()');
    console.log('OK: ' + label);
    console.log('DB:', res.rows[0].current_database);
    await client.end();
    return true;
  } catch (e) {
    console.log('FAIL: ' + label + ' -> ' + e.message.split('\n')[0]);
    return false;
  }
}

for (let i = 0; i < configs.length; i++) {
  const labels = ['Session pooler ap-southeast-1', 'Session pooler ap-southeast-2', 'Transaction pooler ap-southeast-1'];
  if (await tryConnect(configs[i], labels[i])) process.exit(0);
}
process.exit(1);

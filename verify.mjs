import { neon } from '@neondatabase/serverless';

async function verify() {
  const sql = neon(process.env.DATABASE_URL);
  const result = await sql`SELECT 1 as result`;
  console.log("Connection successful, result:", result[0].result);
}

verify().catch(console.error);

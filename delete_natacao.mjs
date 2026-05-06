import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  prepare: false,
});

async function deleteNatacao() {
  try {
    // First, find all swimming events
    const events = await sql`
      SELECT id, date, type, description 
      FROM events 
      WHERE LOWER(type) LIKE '%natação%' 
         OR LOWER(type) LIKE '%natacao%'
      ORDER BY date
    `;

    console.log(`Found ${events.length} swimming events:`);
    events.forEach(e => {
      console.log(`  - ID: ${e.id}, Date: ${e.date}, Type: ${e.type}`);
    });

    if (events.length === 0) {
      console.log('No swimming events found.');
      await sql.end();
      return;
    }

    // Delete them
    const deleted = await sql`
      DELETE FROM events 
      WHERE LOWER(type) LIKE '%natação%' 
         OR LOWER(type) LIKE '%natacao%'
      RETURNING id, date, type
    `;

    console.log(`\n✓ Deleted ${deleted.length} swimming events`);
    deleted.forEach(e => {
      console.log(`  - ID: ${e.id}, Date: ${e.date}, Type: ${e.type}`);
    });

    await sql.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteNatacao();

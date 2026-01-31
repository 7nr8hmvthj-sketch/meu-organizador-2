import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { events } from './drizzle/schema.ts';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const swimmingSchedule = {
  0: "20:45",  // Segunda
  1: "11:40",  // Terça
  2: "20:45",  // Quarta
  4: "20:45",  // Sexta
  5: "12:10",  // Sábado
};

const startDate = new Date('2026-01-01');
const endDate = new Date('2026-12-31');
let currentDate = new Date(startDate);

const eventsToInsert = [];

while (currentDate <= endDate) {
  const dayOfWeek = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1; // Convert to Monday=0
  
  if (swimmingSchedule[dayOfWeek]) {
    const time = swimmingSchedule[dayOfWeek];
    eventsToInsert.push({
      userId: 1,
      date: new Date(currentDate),
      type: 'Natação',
      description: `Natação ${time}`,
      isShift: false,
      isPassed: false,
      isCancelled: false,
    });
  }
  
  currentDate.setDate(currentDate.getDate() + 1);
}

console.log(`Inserindo ${eventsToInsert.length} eventos de natação...`);

// Insert in batches of 50
for (let i = 0; i < eventsToInsert.length; i += 50) {
  const batch = eventsToInsert.slice(i, i + 50);
  await db.insert(events).values(batch);
  console.log(`Inseridos ${Math.min(i + 50, eventsToInsert.length)}/${eventsToInsert.length}`);
}

console.log('✅ Eventos de natação adicionados com sucesso!');
await connection.end();

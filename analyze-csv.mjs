import fs from 'fs';
import { parse } from 'csv-parse/sync';

const content = fs.readFileSync('/home/ubuntu/upload/Plantaozinho-Exported-Data.csv', 'utf-8');
const records = parse(content, { columns: true });

// Agrupar por mês
const byMonth = {};
records.forEach(r => {
  if (!r.start_date) return;
  const date = r.start_date.split('T')[0];
  const month = date.substring(0, 7);
  if (!byMonth[month]) byMonth[month] = [];
  byMonth[month].push({
    date,
    title: r.title,
    place: r.place,
    status: r.status,
    notes: r.notes
  });
});

// Exibir resumo
Object.keys(byMonth).sort().forEach(month => {
  const events = byMonth[month];
  const passed = events.filter(e => e.place === 'Passei').length;
  console.log(`\n${month}: ${events.length} eventos (${passed} passados)`);
  
  // Mostrar primeiros 5 de cada mês
  events.slice(0, 5).forEach(e => {
    console.log(`  ${e.date} | ${e.title.substring(0, 40)} | ${e.place}`);
  });
  if (events.length > 5) {
    console.log(`  ... e mais ${events.length - 5}`);
  }
});

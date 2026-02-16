import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

// Helper: Detectar delimitador do CSV
function detectDelimiter(line: string): string {
  const semicolonCount = (line.match(/;/g) || []).length;
  const commaCount = (line.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

// Helper: Converter DD/MM/AAAA para YYYY-MM-DD
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Tentar formato DD/MM/AAAA
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Tentar formato YYYY-MM-DD (já correto)
  const yyyymmddMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmddMatch) {
    return dateStr;
  }
  
  console.error(`[CSV Parser] Data inválida: ${dateStr}`);
  return null;
}

export const comparisonRouter = router({
  analyzeCSV: publicProcedure
    .input(z.object({ csvContent: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const lines = input.csvContent.split("\n").filter(l => l.trim());
        
        if (lines.length < 2) {
          throw new Error("CSV vazio ou sem dados");
        }
        
        // Detectar delimitador automaticamente
        const delimiter = detectDelimiter(lines[0]);
        console.log(`[CSV Parser] Delimitador detectado: "${delimiter}"`);
        
        const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
        console.log(`[CSV Parser] Cabeçalhos: ${headers.join(", ")}`);
        
        // Parse CSV
        const csvEvents: Array<{ date: string; type: string; description?: string; status?: string }> = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(delimiter).map(v => v.trim());
          const event: any = {};
          
          headers.forEach((header, idx) => {
            event[header] = values[idx] || "";
          });
          
          // Converter data
          const parsedDate = parseDate(event.date || event.data);
          if (!parsedDate) {
            console.warn(`[CSV Parser] Linha ${i+1} ignorada: data inválida`);
            continue;
          }
          
          csvEvents.push({
            date: parsedDate,
            type: event.type || event.tipo || event.evento || "",
            description: event.description || event.descricao || event.obs || "",
            status: event.status || event.situacao || "",
          });
        }
        
        console.log(`[CSV Parser] ${csvEvents.length} eventos parseados com sucesso`);
        
        // Get agenda events (userId do contexto ou default 1)
        const userId = ctx.user?.id || 1;
        const agendaEvents = await db.getEventsByUserId(userId);
        console.log(`[CSV Parser] ${agendaEvents.length} eventos na agenda`);
        
        // Compare
        const missingInAgenda: typeof csvEvents = [];
        const statusDifferences: Array<{ id: number; date: string; type: string; csvStatus: string; agendaStatus: string }> = [];
        const onlyInAgenda: Array<{ id: number; date: string; type: string }> = [];
        
        // Find missing in agenda
        for (const csvEvent of csvEvents) {
          const found = agendaEvents.find(
            a => a.date && 
                 new Date(a.date).toISOString().split('T')[0] === csvEvent.date &&
                 a.type.toLowerCase().includes(csvEvent.type.toLowerCase().substring(0, 3))
          );
          
          if (!found) {
            missingInAgenda.push(csvEvent);
          } else if (found.isPassed !== (csvEvent.status === "Passei")) {
            statusDifferences.push({
              id: found.id,
              date: csvEvent.date,
              type: found.type,
              csvStatus: csvEvent.status || "Ativo",
              agendaStatus: found.isPassed ? "Passei" : "Ativo",
            });
          }
        }
        
        // Find only in agenda
        for (const agendaEvent of agendaEvents) {
          const agendaDate = agendaEvent.date ? new Date(agendaEvent.date).toISOString().split('T')[0] : "";
          const found = csvEvents.find(
            c => agendaDate === c.date &&
                 agendaEvent.type.toLowerCase().includes(c.type.toLowerCase().substring(0, 3))
          );
          if (!found && agendaDate) {
            onlyInAgenda.push({
              id: agendaEvent.id,
              date: agendaDate,
              type: agendaEvent.type,
            });
          }
        }
        
        // Generate summary
        const csvSummary: Array<{ month: string; count: number; passed: number }> = [];
        const monthMap = new Map<string, { count: number; passed: number }>();
        
        for (const event of csvEvents) {
          const [year, month] = event.date?.split("-") || [];
          if (year && month) {
            const key = `${month}/${year}`;
            const current = monthMap.get(key) || { count: 0, passed: 0 };
            current.count++;
            if (event.status === "Passei") current.passed++;
            monthMap.set(key, current);
          }
        }
        
        monthMap.forEach((value, key) => {
          csvSummary.push({ month: key, ...value });
        });
        
        console.log(`[CSV Parser] Comparação concluída: ${missingInAgenda.length} faltando, ${statusDifferences.length} divergências, ${onlyInAgenda.length} apenas na agenda`);
        
        return {
          missingInAgenda,
          statusDifferences,
          onlyInAgenda,
          csvSummary: csvSummary.sort((a, b) => a.month.localeCompare(b.month)),
        };
      } catch (error) {
        console.error("[CSV Parser] Erro:", error);
        throw new Error(`Erro ao processar CSV: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
      }
    }),
});

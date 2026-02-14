import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const comparisonRouter = router({
  analyzeCSV: publicProcedure
    .input(z.object({ csvContent: z.string() }))
    .query(async ({ input }) => {
      const lines = input.csvContent.split("\n").filter(l => l.trim());
      const headers = lines[0].split(",").map(h => h.trim());
      
      // Parse CSV
      const csvEvents: Array<{ date: string; type: string; description?: string; status?: string }> = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const event: any = {};
        headers.forEach((header, idx) => {
          event[header.toLowerCase()] = values[idx];
        });
        if (event.date) csvEvents.push(event);
      }

      // Get agenda events
      const agendaEvents = await db.getEventsByUserId(1);

      // Compare
      const missingInAgenda: typeof csvEvents = [];
      const statusDifferences: Array<{ id: number; date: string; type: string; csvStatus: string; agendaStatus: string }> = [];
      const onlyInAgenda: Array<{ id: number; date: string; type: string }> = [];

      // Find missing in agenda
      for (const csvEvent of csvEvents) {
        const found = agendaEvents.find(
          a => a.date && csvEvent.date && 
               new Date(a.date).toISOString().split('T')[0] === csvEvent.date
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
        const found = csvEvents.find(
          c => agendaEvent.date &&
               new Date(agendaEvent.date).toISOString().split('T')[0] === c.date
        );
        if (!found) {
          onlyInAgenda.push({
            id: agendaEvent.id,
            date: agendaEvent.date ? new Date(agendaEvent.date).toISOString().split('T')[0] : "",
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

      return {
        missingInAgenda,
        statusDifferences,
        onlyInAgenda,
        csvSummary: csvSummary.sort(),
      };
    }),
});

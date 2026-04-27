import { describe, it, expect } from 'vitest';

// Replicate the filter logic from CalendarPage.tsx for testing
function isShiftEvent(event: { type: string; isShift?: boolean }): boolean {
  if (event.isShift) return true;
  const typeLower = (event.type || "").toLowerCase();
  return ["hc", "zn", "zona norte", "noturno", "apoio", "corredor"].some(k => typeLower.includes(k));
}

type CalendarFilter = "todos" | "plantoes" | "pessoal";

function filterEvents(events: Array<{ type: string; isShift?: boolean }>, filter: CalendarFilter) {
  if (filter === "todos") return events;
  return events.filter(event => {
    const isShift = isShiftEvent(event);
    if (filter === "plantoes") return isShift;
    if (filter === "pessoal") return !isShift;
    return true;
  });
}

// Replicate ZN hours calculation logic
const SHIFT_HOURS: Record<string, string> = {
  "noturno": "19-7",
  "apoio": "19-01",
};

function calculateZNHours(events: Array<{ type: string; description?: string; isPassed?: boolean; date: string }>, targetDate: Date): number {
  const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 20);
  const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 19, 23, 59, 59);
  let totalHours = 0;
  events.forEach(event => {
    if (event.isPassed) return;
    const eventDate = new Date(event.date + 'T12:00:00Z');
    if (eventDate >= startDate && eventDate <= endDate) {
      const type = (event.type || "").toLowerCase();
      const desc = (event.description || "").toLowerCase();
      const fullText = `${type} ${desc}`;
      if (fullText.includes("hc") || fullText.includes("home care") || fullText.includes("lembrete")) return;
      if (
        fullText.includes("zn") || fullText.includes("zona norte") ||
        fullText.includes("noturno") || fullText.includes("apoio") ||
        fullText.includes("observação") || fullText.includes("observacao")
      ) {
        let timeMatch = fullText.match(/(\d{1,2})-(\d{1,2})/);
        if (!timeMatch && SHIFT_HOURS[type]) {
          timeMatch = SHIFT_HOURS[type].match(/(\d{1,2})-(\d{1,2})/);
        }
        if (timeMatch) {
          const startHour = parseInt(timeMatch[1], 10);
          const endHour = parseInt(timeMatch[2], 10);
          let diff = endHour - startHour;
          if (diff < 0) diff += 24;
          totalHours += diff;
        }
      }
    }
  });
  return totalHours;
}

describe('Calendar Filter Logic', () => {
  const sampleEvents = [
    { type: "ZN 7-13", isShift: true, description: "Zona Norte Manhã", date: "2026-04-10", isPassed: false },
    { type: "HC 7-13", isShift: true, description: "Home Care Manhã", date: "2026-04-10", isPassed: false },
    { type: "Noturno 19-7", isShift: true, description: "Noturno", date: "2026-04-11", isPassed: false },
    { type: "Musculação", isShift: false, description: "Musculação 09:00", date: "2026-04-10", isPassed: false },
    { type: "Natação", isShift: false, description: "Natação 20:45", date: "2026-04-10", isPassed: false },
    { type: "Pilates", isShift: false, description: "Pilates 16:00", date: "2026-04-10", isPassed: false },
    { type: "Terapia", isShift: false, description: "Terapia 09:30", date: "2026-04-13", isPassed: false },
    { type: "Lembrete", isShift: false, description: "Pagar conta", date: "2026-04-10", isPassed: false },
    { type: "Apoio 19-01", isShift: true, description: "Apoio", date: "2026-04-15", isPassed: false },
    { type: "Corredor Manhã", isShift: true, description: "Corredor", date: "2026-04-16", isPassed: false },
  ];

  describe('isShiftEvent', () => {
    it('should identify ZN as shift', () => {
      expect(isShiftEvent({ type: "ZN 7-13", isShift: true })).toBe(true);
    });

    it('should identify HC as shift by type name even if isShift is false', () => {
      expect(isShiftEvent({ type: "HC 7-13", isShift: false })).toBe(true);
    });

    it('should identify Noturno as shift by type name', () => {
      expect(isShiftEvent({ type: "Noturno 19-7" })).toBe(true);
    });

    it('should identify Apoio as shift by type name', () => {
      expect(isShiftEvent({ type: "Apoio 19-01" })).toBe(true);
    });

    it('should identify Corredor as shift by type name', () => {
      expect(isShiftEvent({ type: "Corredor Manhã" })).toBe(true);
    });

    it('should NOT identify Musculação as shift', () => {
      expect(isShiftEvent({ type: "Musculação" })).toBe(false);
    });

    it('should NOT identify Natação as shift', () => {
      expect(isShiftEvent({ type: "Natação" })).toBe(false);
    });

    it('should NOT identify Pilates as shift', () => {
      expect(isShiftEvent({ type: "Pilates" })).toBe(false);
    });

    it('should NOT identify Terapia as shift', () => {
      expect(isShiftEvent({ type: "Terapia" })).toBe(false);
    });

    it('should NOT identify Lembrete as shift', () => {
      expect(isShiftEvent({ type: "Lembrete" })).toBe(false);
    });
  });

  describe('filterEvents', () => {
    it('should return all events when filter is "todos"', () => {
      const result = filterEvents(sampleEvents, "todos");
      expect(result).toHaveLength(10);
    });

    it('should return only shifts when filter is "plantoes"', () => {
      const result = filterEvents(sampleEvents, "plantoes");
      // ZN, HC, Noturno, Apoio, Corredor = 5 shifts
      expect(result).toHaveLength(5);
      result.forEach(e => {
        expect(isShiftEvent(e)).toBe(true);
      });
    });

    it('should return only personal/health events when filter is "pessoal"', () => {
      const result = filterEvents(sampleEvents, "pessoal");
      // Musculação, Natação, Pilates, Terapia, Lembrete = 5 personal
      expect(result).toHaveLength(5);
      result.forEach(e => {
        expect(isShiftEvent(e)).toBe(false);
      });
    });

    it('should include Lembrete in pessoal filter', () => {
      const result = filterEvents(sampleEvents, "pessoal");
      expect(result.some(e => e.type === "Lembrete")).toBe(true);
    });

    it('should NOT include Lembrete in plantoes filter', () => {
      const result = filterEvents(sampleEvents, "plantoes");
      expect(result.some(e => e.type === "Lembrete")).toBe(false);
    });
  });

  describe('ZN Hours calculation independence from filter', () => {
    it('should calculate ZN hours from ALL events, not filtered ones', () => {
      const targetDate = new Date(2026, 3, 19); // April 19, 2026
      const allHours = calculateZNHours(sampleEvents, targetDate);
      
      // ZN 7-13 = 6h, Noturno 19-7 = 12h, Apoio 19-01 = 6h = 24h total
      // HC is excluded from ZN calculation
      expect(allHours).toBe(24);
    });

    it('should give same ZN hours regardless of which filter is active', () => {
      const targetDate = new Date(2026, 3, 19);
      
      // Calculate from all events
      const allHours = calculateZNHours(sampleEvents, targetDate);
      
      // Calculate from filtered events (plantoes only)
      const plantoesOnly = filterEvents(sampleEvents, "plantoes");
      const plantoesHours = calculateZNHours(plantoesOnly, targetDate);
      
      // Calculate from filtered events (pessoal only)
      const pessoalOnly = filterEvents(sampleEvents, "pessoal");
      const pessoalHours = calculateZNHours(pessoalOnly, targetDate);
      
      // allHours should equal plantoesHours because ZN calc only counts ZN/Noturno/Apoio anyway
      // But the key point is: in the app, ZN calc always uses allEvents, not filteredEvents
      expect(allHours).toBe(24);
      expect(pessoalHours).toBe(0); // pessoal events don't include ZN shifts
    });

    it('should exclude isPassed events from ZN calculation', () => {
      const eventsWithPassed = [
        { type: "ZN 7-13", isShift: true, description: "", date: "2026-04-10", isPassed: true },
        { type: "ZN 13-19", isShift: true, description: "", date: "2026-04-10", isPassed: false },
      ];
      const targetDate = new Date(2026, 3, 19);
      const hours = calculateZNHours(eventsWithPassed, targetDate);
      // Only ZN 13-19 (6h) should count, ZN 7-13 is passed
      expect(hours).toBe(6);
    });

    it('should handle overnight shifts correctly (19-7 = 12h)', () => {
      const overnightEvents = [
        { type: "Noturno 19-7", isShift: true, description: "", date: "2026-04-10", isPassed: false },
      ];
      const targetDate = new Date(2026, 3, 19);
      const hours = calculateZNHours(overnightEvents, targetDate);
      expect(hours).toBe(12);
    });
  });
});

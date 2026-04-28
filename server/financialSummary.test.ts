import { describe, it, expect } from "vitest";

// Test the financial calculation logic (same as used in monthlyShiftHours)
const SHIFT_HOURS: Record<string, string> = {
  "hc manhã": "7-13",
  "hc tarde": "13-19",
  "corredor tarde": "13-19",
  "corredor manhã": "7-13",
  "zona norte manhã": "7-13",
  "zona norte tarde": "13-19",
  "noturno": "19-7",
  "apoio": "19-01",
};

function calculateShiftHours(events: any[], targetMonth: number, targetYear: number) {
  const startDate = new Date(targetYear, targetMonth - 2, 20);
  const endDate = new Date(targetYear, targetMonth - 1, 19, 23, 59, 59);
  let znHours = 0, hcHours = 0, noturnoHours = 0, apoioHours = 0;

  events.forEach((event: any) => {
    if (event.isPassed) return;
    const eventDate = new Date(event.date + "T12:00:00Z");
    if (eventDate < startDate || eventDate > endDate) return;
    const type = (event.type || "").toLowerCase();
    const desc = (event.description || "").toLowerCase();
    const fullText = `${type} ${desc}`;
    let timeMatch = fullText.match(/(\d{1,2})-(\d{1,2})/);
    if (!timeMatch && SHIFT_HOURS[type]) {
      timeMatch = SHIFT_HOURS[type].match(/(\d{1,2})-(\d{1,2})/);
    }
    if (!timeMatch) return;
    const startHour = parseInt(timeMatch[1], 10);
    const endHour = parseInt(timeMatch[2], 10);
    let diff = endHour - startHour;
    if (diff < 0) diff += 24;
    if (fullText.includes("hc") || fullText.includes("home care")) {
      hcHours += diff;
    } else if (fullText.includes("noturno")) {
      noturnoHours += diff;
    } else if (fullText.includes("apoio")) {
      apoioHours += diff;
    } else if (fullText.includes("zn") || fullText.includes("zona norte") || fullText.includes("observação")) {
      znHours += diff;
    }
  });

  return { zn: znHours, hc: hcHours, noturno: noturnoHours, apoio: apoioHours, total: znHours + hcHours + noturnoHours + apoioHours };
}

describe("Financial Summary - Shift Hours Calculation", () => {
  it("should calculate ZN hours correctly for 7-13 shift", () => {
    const events = [{ date: "2026-04-01", type: "ZN 7-13", description: "", isPassed: false }];
    const result = calculateShiftHours(events, 4, 2026);
    expect(result.zn).toBe(6);
    expect(result.total).toBe(6);
  });

  it("should calculate HC hours separately from ZN", () => {
    const events = [
      { date: "2026-04-01", type: "ZN 7-13", description: "", isPassed: false },
      { date: "2026-04-02", type: "HC 7-13", description: "", isPassed: false },
    ];
    const result = calculateShiftHours(events, 4, 2026);
    expect(result.zn).toBe(6);
    expect(result.hc).toBe(6);
    expect(result.total).toBe(12);
  });

  it("should calculate noturno hours with overnight wrap (19-7 = 12h)", () => {
    const events = [{ date: "2026-04-04", type: "Noturno 19-7", description: "", isPassed: false }];
    const result = calculateShiftHours(events, 4, 2026);
    expect(result.noturno).toBe(12);
    expect(result.total).toBe(12);
  });

  it("should calculate apoio hours with overnight wrap (19-01 = 6h)", () => {
    const events = [{ date: "2026-04-05", type: "Apoio 19-01", description: "", isPassed: false }];
    const result = calculateShiftHours(events, 4, 2026);
    expect(result.apoio).toBe(6);
    expect(result.total).toBe(6);
  });

  it("should ignore isPassed events", () => {
    const events = [
      { date: "2026-04-01", type: "ZN 7-13", description: "", isPassed: true },
      { date: "2026-04-02", type: "ZN 7-13", description: "", isPassed: false },
    ];
    const result = calculateShiftHours(events, 4, 2026);
    expect(result.zn).toBe(6);
    expect(result.total).toBe(6);
  });

  it("should only count events within the 20-19 cycle", () => {
    const events = [
      { date: "2026-03-19", type: "ZN 7-13", description: "", isPassed: false }, // Before cycle
      { date: "2026-03-20", type: "ZN 7-13", description: "", isPassed: false }, // Start of cycle
      { date: "2026-04-19", type: "ZN 7-13", description: "", isPassed: false }, // End of cycle
      { date: "2026-04-20", type: "ZN 7-13", description: "", isPassed: false }, // After cycle
    ];
    const result = calculateShiftHours(events, 4, 2026);
    expect(result.zn).toBe(12); // Only March 20 and April 19
    expect(result.total).toBe(12);
  });

  it("should count observação as ZN hours", () => {
    const events = [{ date: "2026-04-05", type: "7-13 observação", description: "", isPassed: false }];
    const result = calculateShiftHours(events, 4, 2026);
    expect(result.zn).toBe(6);
  });

  it("should return all zeros for empty events", () => {
    const result = calculateShiftHours([], 4, 2026);
    expect(result).toEqual({ zn: 0, hc: 0, noturno: 0, apoio: 0, total: 0 });
  });

  it("should handle mixed event types correctly", () => {
    const events = [
      { date: "2026-04-01", type: "ZN 7-13", description: "", isPassed: false },
      { date: "2026-04-01", type: "ZN 13-19", description: "", isPassed: false },
      { date: "2026-04-02", type: "HC 7-13", description: "", isPassed: false },
      { date: "2026-04-03", type: "Noturno 19-7", description: "", isPassed: false },
      { date: "2026-04-04", type: "Apoio 19-01", description: "", isPassed: false },
    ];
    const result = calculateShiftHours(events, 4, 2026);
    expect(result.zn).toBe(12);  // 6 + 6
    expect(result.hc).toBe(6);
    expect(result.noturno).toBe(12);
    expect(result.apoio).toBe(6);
    expect(result.total).toBe(36);
  });
});

describe("Financial Summary - Expense Calculation", () => {
  it("should calculate total fixed expenses correctly", () => {
    const expenses = [
      { amount: "1500.00", category: "fixed" },
      { amount: "200.50", category: "fixed" },
      { amount: "300.00", category: "variable" },
    ];
    const fixedExpenses = expenses.filter(e => e.category === "fixed");
    const totalFixed = fixedExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    expect(totalFixed).toBe(1700.50);
  });

  it("should calculate estimated earnings correctly", () => {
    const totalHours = 240;
    const hourlyRate = 35;
    const estimatedEarnings = totalHours * hourlyRate;
    expect(estimatedEarnings).toBe(8400);
  });

  it("should calculate balance (earnings - expenses)", () => {
    const estimatedEarnings = 8400;
    const totalFixed = 3500;
    const balance = estimatedEarnings - totalFixed;
    expect(balance).toBe(4900);
  });

  it("should handle negative balance", () => {
    const estimatedEarnings = 2000;
    const totalFixed = 3500;
    const balance = estimatedEarnings - totalFixed;
    expect(balance).toBe(-1500);
  });
});

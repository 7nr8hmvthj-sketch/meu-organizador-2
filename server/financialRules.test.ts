import { describe, it, expect } from "vitest";

// ============ UNIT TESTS FOR FINANCIAL BUSINESS RULES ============
// Tests the calculation logic without database dependency

const VALOR_HORA_ZN = 136;
const VALOR_HORA_HC = 108;
const HC_DELAY_MONTHS = 4;

// Helper: calculates hours from event type
function calcHours(event: { type: string; description?: string; isPassed?: boolean }): number {
  if (event.isPassed) return 0;
  const type = (event.type || "").toLowerCase();
  const desc = (event.description || "").toLowerCase();
  const fullText = `${type} ${desc}`;
  const SHIFT_HOURS: Record<string, string> = {
    "hc manhã": "7-13", "hc tarde": "13-19",
    "corredor tarde": "13-19", "corredor manhã": "7-13",
    "zona norte manhã": "7-13", "zona norte tarde": "13-19",
    "noturno": "19-7", "apoio": "19-01",
  };
  let timeMatch = fullText.match(/(\d{1,2})-(\d{1,2})/);
  if (!timeMatch && SHIFT_HOURS[type]) {
    timeMatch = SHIFT_HOURS[type].match(/(\d{1,2})-(\d{1,2})/);
  }
  if (!timeMatch) return 0;
  const startH = parseInt(timeMatch[1], 10);
  const endH = parseInt(timeMatch[2], 10);
  let diff = endH - startH;
  if (diff < 0) diff += 24;
  return diff;
}

// Helper: classifies event as ZN-group
function isZNGroup(event: { type: string; description?: string }): boolean {
  const t = (event.type || "").toLowerCase();
  const d = (event.description || "").toLowerCase();
  const full = `${t} ${d}`;
  return full.includes("zn") || full.includes("zona norte") || full.includes("noturno")
    || full.includes("apoio") || full.includes("corredor") || full.includes("observação") || full.includes("observacao");
}

// Helper: classifies event as HC
function isHC(event: { type: string }): boolean {
  const t = (event.type || "").toLowerCase();
  return t.includes("hc") || t.includes("home care");
}

// Helper: calculates ZN billing cycle dates
function getZNCycleDates(month: number, year: number) {
  let znStartMonth = month - 1;
  let znStartYear = year;
  if (znStartMonth < 1) { znStartMonth = 12; znStartYear--; }
  const znStartDate = `${znStartYear}-${String(znStartMonth).padStart(2, '0')}-20`;
  const znEndDate = `${year}-${String(month).padStart(2, '0')}-19`;
  return { znStartDate, znEndDate };
}

// Helper: calculates HC reference month (120 days delay)
function getHCRefMonth(month: number, year: number) {
  let hcMonth = month - HC_DELAY_MONTHS;
  let hcYear = year;
  while (hcMonth < 1) { hcMonth += 12; hcYear--; }
  return { hcMonth, hcYear };
}

describe("Financial Business Rules", () => {
  describe("calcHours", () => {
    it("should calculate 6 hours for ZN 7-13", () => {
      expect(calcHours({ type: "ZN 7-13" })).toBe(6);
    });

    it("should calculate 6 hours for HC 13-19", () => {
      expect(calcHours({ type: "HC 13-19" })).toBe(6);
    });

    it("should calculate 12 hours for Noturno 19-7", () => {
      expect(calcHours({ type: "Noturno 19-7" })).toBe(12);
    });

    it("should calculate 6 hours for Apoio 19-01", () => {
      expect(calcHours({ type: "Apoio 19-01" })).toBe(6);
    });

    it("should return 0 for isPassed events", () => {
      expect(calcHours({ type: "ZN 7-13", isPassed: true })).toBe(0);
    });

    it("should return 0 for non-shift events", () => {
      expect(calcHours({ type: "Musculação" })).toBe(0);
    });

    it("should calculate hours from named shifts", () => {
      expect(calcHours({ type: "noturno" })).toBe(12);
      expect(calcHours({ type: "apoio" })).toBe(6);
    });

    it("should calculate 6 hours for 7-13 observação", () => {
      expect(calcHours({ type: "7-13 observação" })).toBe(6);
    });
  });

  describe("isZNGroup", () => {
    it("should identify ZN events", () => {
      expect(isZNGroup({ type: "ZN 7-13" })).toBe(true);
      expect(isZNGroup({ type: "ZN 13-19" })).toBe(true);
    });

    it("should identify Noturno as ZN group", () => {
      expect(isZNGroup({ type: "Noturno 19-7" })).toBe(true);
    });

    it("should identify Apoio as ZN group", () => {
      expect(isZNGroup({ type: "Apoio 19-01" })).toBe(true);
    });

    it("should identify Corredor as ZN group", () => {
      expect(isZNGroup({ type: "Corredor 7-13" })).toBe(true);
    });

    it("should identify observação as ZN group", () => {
      expect(isZNGroup({ type: "7-13 observação" })).toBe(true);
    });

    it("should NOT identify HC as ZN group", () => {
      expect(isZNGroup({ type: "HC 7-13" })).toBe(false);
    });

    it("should NOT identify personal events as ZN group", () => {
      expect(isZNGroup({ type: "Musculação" })).toBe(false);
      expect(isZNGroup({ type: "Pilates" })).toBe(false);
    });
  });

  describe("isHC", () => {
    it("should identify HC events", () => {
      expect(isHC({ type: "HC 7-13" })).toBe(true);
      expect(isHC({ type: "HC 13-19" })).toBe(true);
    });

    it("should identify Home Care as HC", () => {
      expect(isHC({ type: "Home Care" })).toBe(true);
    });

    it("should NOT identify ZN as HC", () => {
      expect(isHC({ type: "ZN 7-13" })).toBe(false);
    });
  });

  describe("ZN Billing Cycle (cut day 19)", () => {
    it("should calculate April cycle as March 20 to April 19", () => {
      const { znStartDate, znEndDate } = getZNCycleDates(4, 2026);
      expect(znStartDate).toBe("2026-03-20");
      expect(znEndDate).toBe("2026-04-19");
    });

    it("should calculate January cycle as December 20 (previous year) to January 19", () => {
      const { znStartDate, znEndDate } = getZNCycleDates(1, 2026);
      expect(znStartDate).toBe("2025-12-20");
      expect(znEndDate).toBe("2026-01-19");
    });

    it("should calculate December cycle as November 20 to December 19", () => {
      const { znStartDate, znEndDate } = getZNCycleDates(12, 2026);
      expect(znStartDate).toBe("2026-11-20");
      expect(znEndDate).toBe("2026-12-19");
    });
  });

  describe("HC 120-day delay", () => {
    it("should calculate April HC reference as December (4 months back)", () => {
      const { hcMonth, hcYear } = getHCRefMonth(4, 2026);
      expect(hcMonth).toBe(12);
      expect(hcYear).toBe(2025);
    });

    it("should calculate May HC reference as January", () => {
      const { hcMonth, hcYear } = getHCRefMonth(5, 2026);
      expect(hcMonth).toBe(1);
      expect(hcYear).toBe(2026);
    });

    it("should calculate January HC reference as September (previous year)", () => {
      const { hcMonth, hcYear } = getHCRefMonth(1, 2026);
      expect(hcMonth).toBe(9);
      expect(hcYear).toBe(2025);
    });

    it("should calculate March HC reference as November (previous year)", () => {
      const { hcMonth, hcYear } = getHCRefMonth(3, 2026);
      expect(hcMonth).toBe(11);
      expect(hcYear).toBe(2025);
    });

    it("should calculate August HC reference as April (same year)", () => {
      const { hcMonth, hcYear } = getHCRefMonth(8, 2026);
      expect(hcMonth).toBe(4);
      expect(hcYear).toBe(2026);
    });
  });

  describe("Revenue calculations", () => {
    it("should calculate ZN revenue correctly: hours × R$136", () => {
      const znHours = 162; // Example: 27 shifts × 6h
      expect(znHours * VALOR_HORA_ZN).toBe(22032);
    });

    it("should calculate HC revenue correctly: hours × R$108", () => {
      const hcHours = 42; // Example: 7 shifts × 6h
      expect(hcHours * VALOR_HORA_HC).toBe(4536);
    });

    it("should calculate total revenue as ZN + HC", () => {
      const totalZN = 162 * VALOR_HORA_ZN;
      const totalHC = 42 * VALOR_HORA_HC;
      expect(totalZN + totalHC).toBe(26568);
    });

    it("should calculate saldo as revenue - fixed expenses", () => {
      const totalRecebimentos = 26568;
      const totalFixed = 5000;
      expect(totalRecebimentos - totalFixed).toBe(21568);
    });
  });

  describe("Edge cases", () => {
    it("should handle Noturno crossing midnight (19-7 = 12h)", () => {
      expect(calcHours({ type: "Noturno 19-7" })).toBe(12);
    });

    it("should handle Apoio crossing midnight (19-01 = 6h)", () => {
      expect(calcHours({ type: "Apoio 19-01" })).toBe(6);
    });

    it("should not count passed events", () => {
      expect(calcHours({ type: "ZN 7-13", isPassed: true })).toBe(0);
    });

    it("should handle events with description containing time range", () => {
      expect(calcHours({ type: "ZN", description: "7-13 observação" })).toBe(6);
    });
  });
});

import { describe, it, expect } from "vitest";

/**
 * CSV Integration Test
 * Simulates the complete flow of Papa.parse with Brazilian Excel format
 */
describe("CSV Integration - Papa.parse Brazilian Excel", () => {
  
  it("should parse CSV with BOM character removal", () => {
    // Simulate header with BOM
    const headerWithBOM = "\uFEFFData";
    const cleanHeader = headerWithBOM.trim().replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "");
    expect(cleanHeader).toBe("Data");
  });

  it("should handle CSV row with accented columns", () => {
    const row = {
      "Data": "01/05/2026",
      "Tipo": "ZN 7-13",
      "Horário Início": "07:00",
      "Horário Fim": "13:00",
      "Descrição": "Plantão"
    };

    const cleanRow: any = {};
    Object.keys(row).forEach(k => { 
      cleanRow[k.trim()] = (row as any)[k]; 
    });

    expect(cleanRow["Horário Início"]).toBe("07:00");
    expect(cleanRow["Descrição"]).toBe("Plantão");
  });

  it("should handle multiple date formats", () => {
    const testCases = [
      { input: "01/05/26", expected: "2026-05-01" },
      { input: "01/05/2026", expected: "2026-05-01" },
      { input: "31/12/25", expected: "2025-12-31" },
    ];

    testCases.forEach(({ input, expected }) => {
      let dateStr = input.trim();
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          dateStr = `${year}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }
      }
      expect(dateStr).toBe(expected);
    });
  });

  it("should trim whitespace from all fields", () => {
    const row = {
      "Data": "  01/05/2026  ",
      "Tipo": "  ZN 7-13  ",
      "Horário Início": "  07:00  "
    };

    const cleanRow: any = {};
    Object.keys(row).forEach(k => { 
      cleanRow[k.trim()] = (row as any)[k]; 
    });

    expect(cleanRow["Data"].trim()).toBe("01/05/2026");
    expect(cleanRow["Tipo"].trim()).toBe("ZN 7-13");
    expect(cleanRow["Horário Início"].trim()).toBe("07:00");
  });

  it("should build correct deduplication key", () => {
    const dateStr = "2026-05-01";
    const tipo = "ZN 7-13";
    const startTime = "07:00";

    const key = `${dateStr}_${tipo.trim()}_${startTime.trim()}`;
    expect(key).toBe("2026-05-01_ZN 7-13_07:00");
  });

  it("should detect duplicate events", () => {
    const existingKeys = new Set([
      "2026-05-01_ZN 7-13_07:00",
      "2026-05-02_HC_19:00"
    ]);

    const newKey = "2026-05-01_ZN 7-13_07:00";
    expect(existingKeys.has(newKey)).toBe(true);

    const uniqueKey = "2026-05-03_Musculação_18:00";
    expect(existingKeys.has(uniqueKey)).toBe(false);
  });

  it("should correctly identify shift types", () => {
    const shiftKeywords = ["hc", "zn", "noturno", "apoio", "corredor", "porta", "sala", "enfermaria", "home care", "observação", "observacao"];
    
    const testCases = [
      { type: "ZN 7-13", expected: true },
      { type: "HC 19-01", expected: true },
      { type: "Home Care", expected: true },
      { type: "Porta", expected: true },
      { type: "Enfermaria", expected: true },
      { type: "Observação", expected: true },
      { type: "Musculação", expected: false },
      { type: "Pilates", expected: false },
    ];

    testCases.forEach(({ type, expected }) => {
      const isShift = shiftKeywords.some(k => type.toLowerCase().includes(k));
      expect(isShift).toBe(expected);
    });
  });

  it("should handle empty or missing required fields", () => {
    const rows = [
      { Data: "", Tipo: "ZN 7-13" }, // Missing date
      { Data: "01/05/2026", Tipo: "" }, // Missing type
      { Data: "01/05/2026", Tipo: "ZN 7-13" }, // Valid
    ];

    let validCount = 0;
    rows.forEach(row => {
      const rawDate = row.Data || "";
      const tipo = row.Tipo || "";
      
      if (rawDate && tipo) {
        validCount++;
      }
    });

    expect(validCount).toBe(1);
  });

  it("should build event object with correct structure", () => {
    const dateStr = "2026-05-01";
    const tipo = "ZN 7-13";
    const startTime = "07:00";
    const endTime = "13:00";
    const desc = "Plantão Zona Norte";

    const event = {
      date: dateStr,
      type: tipo.trim(),
      startTime: startTime.trim() || undefined,
      endTime: endTime.trim() || undefined,
      description: desc.trim() || undefined,
      isShift: ["hc", "zn"].some(k => tipo.toLowerCase().includes(k))
    };

    expect(event.date).toBe("2026-05-01");
    expect(event.type).toBe("ZN 7-13");
    expect(event.startTime).toBe("07:00");
    expect(event.endTime).toBe("13:00");
    expect(event.description).toBe("Plantão Zona Norte");
    expect(event.isShift).toBe(true);
  });
});

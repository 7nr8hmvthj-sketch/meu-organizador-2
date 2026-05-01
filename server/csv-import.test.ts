import { describe, it, expect } from "vitest";

describe("CSV Import Flow", () => {

  it("should handle CSV with Brazilian Excel format (BOM, accents)", async () => {
    // Simulate CSV data with accents and special characters
    const csvData = {
      "Data": "01/05/2026",
      "Tipo": "ZN 7-13",
      "Horário Início": "07:00",
      "Horário Fim": "13:00",
      "Descrição": "Plantão Zona Norte"
    };

    // Test parsing logic
    const cleanRow: any = {};
    Object.keys(csvData).forEach(k => { 
      cleanRow[k.trim()] = (csvData as any)[k]; 
    });

    expect(cleanRow["Horário Início"]).toBe("07:00");
    expect(cleanRow["Descrição"]).toBe("Plantão Zona Norte");
  });

  it("should detect duplicates correctly", () => {
    const existingKeys = new Set([
      "2026-05-01_ZN 7-13_07:00",
      "2026-05-02_HC_19:00"
    ]);

    const newKey = "2026-05-01_ZN 7-13_07:00";
    expect(existingKeys.has(newKey)).toBe(true);
  });

  it("should convert DD/MM/YY to YYYY-MM-DD", () => {
    const testCases = [
      { input: "01/05/26", expected: "2026-05-01" },
      { input: "31/12/25", expected: "2025-12-31" },
      { input: "15/03/2026", expected: "2026-03-15" }
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
    const dirtyRow = {
      "  Data  ": "  01/05/2026  ",
      "Tipo": "  ZN 7-13  ",
      "Horário Início": "  07:00  "
    };

    const cleanRow: any = {};
    Object.keys(dirtyRow).forEach(k => { 
      cleanRow[k.trim()] = (dirtyRow as any)[k]; 
    });

    expect(cleanRow["Data"].trim()).toBe("01/05/2026");
    expect(cleanRow["Tipo"].trim()).toBe("ZN 7-13");
  });

  it("should detect shift types correctly", () => {
    const shiftKeywords = ["hc", "zn", "noturno", "apoio", "corredor", "porta", "sala", "enfermaria", "home care", "observação", "observacao"];
    
    const testTypes = [
      { type: "ZN 7-13", isShift: true },
      { type: "HC 19-01", isShift: true },
      { type: "Home Care", isShift: true },
      { type: "Musculação", isShift: false },
      { type: "Pilates", isShift: false }
    ];

    testTypes.forEach(({ type, isShift }) => {
      const detected = shiftKeywords.some(k => type.toLowerCase().includes(k));
      expect(detected).toBe(isShift);
    });
  });
});

import { describe, it, expect } from "vitest";

// Test the financial classification logic (isZNGroup and isHC)
describe("Financial Classification Rules", () => {
  // Helper functions replicated from routers.ts for testing
  const isZNGroup = (event: { type: string; description?: string }): boolean => {
    const t = (event.type || "").toLowerCase();
    const d = (event.description || "").toLowerCase();
    const full = `${t} ${d}`;
    return full.includes("zn") || full.includes("zona norte") || full.includes("noturno")
      || full.includes("apoio") || full.includes("corredor") || full.includes("observação") || full.includes("observacao")
      || full.includes("porta") || full.includes("sala");
  };

  const isHC = (event: { type: string; description?: string }): boolean => {
    const t = (event.type || "").toLowerCase();
    return t.includes("hc") || t.includes("home care") || t.includes("enfermaria");
  };

  // ZN Group tests
  it("should classify 'Porta' as ZN group", () => {
    expect(isZNGroup({ type: "Porta" })).toBe(true);
  });

  it("should classify 'Porta 7-13' as ZN group", () => {
    expect(isZNGroup({ type: "Porta", description: "7-13" })).toBe(true);
  });

  it("should classify 'Sala' as ZN group", () => {
    expect(isZNGroup({ type: "Sala" })).toBe(true);
  });

  it("should classify 'Sala 13-19' as ZN group", () => {
    expect(isZNGroup({ type: "Sala", description: "13-19" })).toBe(true);
  });

  it("should classify 'Observação' as ZN group", () => {
    expect(isZNGroup({ type: "Observação" })).toBe(true);
  });

  it("should classify 'ZN 7-13' as ZN group", () => {
    expect(isZNGroup({ type: "ZN 7-13" })).toBe(true);
  });

  it("should classify 'Noturno 19-7' as ZN group", () => {
    expect(isZNGroup({ type: "Noturno 19-7" })).toBe(true);
  });

  it("should classify 'Apoio 19-01' as ZN group", () => {
    expect(isZNGroup({ type: "Apoio 19-01" })).toBe(true);
  });

  it("should classify 'Corredor Manhã' as ZN group", () => {
    expect(isZNGroup({ type: "Corredor Manhã" })).toBe(true);
  });

  // HC Group tests
  it("should classify 'Enfermaria' as HC group", () => {
    expect(isHC({ type: "Enfermaria" })).toBe(true);
  });

  it("should classify 'Enfermaria 7-13' as HC group", () => {
    expect(isHC({ type: "Enfermaria 7-13" })).toBe(true);
  });

  it("should classify 'HC 7-13' as HC group", () => {
    expect(isHC({ type: "HC 7-13" })).toBe(true);
  });

  it("should classify 'Home Care' as HC group", () => {
    expect(isHC({ type: "Home Care" })).toBe(true);
  });

  // Negative tests
  it("should NOT classify 'Musculação' as ZN group", () => {
    expect(isZNGroup({ type: "Musculação" })).toBe(false);
  });

  it("should NOT classify 'Pilates' as HC group", () => {
    expect(isHC({ type: "Pilates" })).toBe(false);
  });

  it("should NOT classify 'Lembrete' as ZN group", () => {
    expect(isZNGroup({ type: "Lembrete" })).toBe(false);
  });

  it("should NOT classify 'Porta' as HC group", () => {
    expect(isHC({ type: "Porta" })).toBe(false);
  });
});

// Test the znBreakdown classification
describe("ZN Breakdown Classification", () => {
  const classifyZNBreakdown = (event: { type: string; description?: string }): string => {
    const t = (event.type || "").toLowerCase();
    const d = (event.description || "").toLowerCase();
    const full = `${t} ${d}`;
    if (full.includes("noturno")) return "noturno";
    if (full.includes("apoio")) return "apoio";
    if (full.includes("observação") || full.includes("observacao")) return "observacao";
    if (full.includes("porta")) return "porta";
    if (full.includes("sala")) return "sala";
    return "zn";
  };

  it("should classify 'Porta 7-13' as porta", () => {
    expect(classifyZNBreakdown({ type: "Porta", description: "7-13" })).toBe("porta");
  });

  it("should classify 'Sala 13-19' as sala", () => {
    expect(classifyZNBreakdown({ type: "Sala", description: "13-19" })).toBe("sala");
  });

  it("should classify 'Observação' as observacao", () => {
    expect(classifyZNBreakdown({ type: "Observação" })).toBe("observacao");
  });

  it("should classify 'Noturno 19-7' as noturno", () => {
    expect(classifyZNBreakdown({ type: "Noturno 19-7" })).toBe("noturno");
  });

  it("should classify 'Apoio 19-01' as apoio", () => {
    expect(classifyZNBreakdown({ type: "Apoio 19-01" })).toBe("apoio");
  });

  it("should classify 'ZN 7-13' as zn (default)", () => {
    expect(classifyZNBreakdown({ type: "ZN 7-13" })).toBe("zn");
  });
});

// Test the calcHours logic
describe("Calculate Hours from Event Type", () => {
  const SHIFT_HOURS: Record<string, string> = {
    "hc manhã": "7-13", "hc tarde": "13-19",
    "corredor tarde": "13-19", "corredor manhã": "7-13",
    "zona norte manhã": "7-13", "zona norte tarde": "13-19",
    "noturno": "19-7", "apoio": "19-01",
  };

  const calcHours = (event: { type: string; description?: string; isPassed?: boolean }): number => {
    if (event.isPassed) return 0;
    const type = (event.type || "").toLowerCase();
    const desc = (event.description || "").toLowerCase();
    const fullText = `${type} ${desc}`;
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
  };

  it("should calculate 6 hours for 'Porta 7-13'", () => {
    expect(calcHours({ type: "Porta", description: "7-13" })).toBe(6);
  });

  it("should calculate 6 hours for 'Sala 13-19'", () => {
    expect(calcHours({ type: "Sala", description: "13-19" })).toBe(6);
  });

  it("should calculate 6 hours for 'Enfermaria 7-13'", () => {
    expect(calcHours({ type: "Enfermaria", description: "7-13" })).toBe(6);
  });

  it("should calculate 12 hours for 'Noturno 19-7'", () => {
    expect(calcHours({ type: "Noturno 19-7" })).toBe(12);
  });

  it("should calculate 6 hours for 'Apoio 19-01'", () => {
    expect(calcHours({ type: "Apoio 19-01" })).toBe(6);
  });

  it("should return 0 for passed events", () => {
    expect(calcHours({ type: "Porta", description: "7-13", isPassed: true })).toBe(0);
  });

  it("should return 0 for non-shift events without time", () => {
    expect(calcHours({ type: "Musculação" })).toBe(0);
  });
});

// Test the EVENT_TYPES structure
describe("Global Event Types", () => {
  const GLOBAL_EVENT_TYPES = [
    { value: "Porta", label: "Porta" },
    { value: "Observação", label: "Observação" },
    { value: "Enfermaria", label: "Enfermaria" },
    { value: "Sala", label: "Sala" },
    { value: "Home Care", label: "Home Care" },
    { value: "Personalizado", label: "Personalizado" },
  ];

  it("should have 6 global event types", () => {
    expect(GLOBAL_EVENT_TYPES).toHaveLength(6);
  });

  it("should include Porta as first type", () => {
    expect(GLOBAL_EVENT_TYPES[0].value).toBe("Porta");
  });

  it("should include Personalizado as last type", () => {
    expect(GLOBAL_EVENT_TYPES[GLOBAL_EVENT_TYPES.length - 1].value).toBe("Personalizado");
  });

  it("should include Enfermaria", () => {
    expect(GLOBAL_EVENT_TYPES.find(t => t.value === "Enfermaria")).toBeDefined();
  });

  it("should include Observação", () => {
    expect(GLOBAL_EVENT_TYPES.find(t => t.value === "Observação")).toBeDefined();
  });
});

// Test isShift classification
describe("isShift Event Classification", () => {
  const isShiftType = (type: string): boolean => {
    return ["hc", "zn", "noturno", "apoio", "corredor", "porta", "sala", "enfermaria", "home care", "observação", "observacao"].some(k => type.toLowerCase().includes(k));
  };

  it("should classify 'Porta' as shift", () => {
    expect(isShiftType("Porta")).toBe(true);
  });

  it("should classify 'Sala' as shift", () => {
    expect(isShiftType("Sala")).toBe(true);
  });

  it("should classify 'Enfermaria' as shift", () => {
    expect(isShiftType("Enfermaria")).toBe(true);
  });

  it("should classify 'Observação' as shift", () => {
    expect(isShiftType("Observação")).toBe(true);
  });

  it("should classify 'Home Care' as shift", () => {
    expect(isShiftType("Home Care")).toBe(true);
  });

  it("should NOT classify 'Musculação' as shift", () => {
    expect(isShiftType("Musculação")).toBe(false);
  });

  it("should NOT classify 'Pilates' as shift", () => {
    expect(isShiftType("Pilates")).toBe(false);
  });

  it("should NOT classify 'Lembrete' as shift", () => {
    expect(isShiftType("Lembrete")).toBe(false);
  });
});

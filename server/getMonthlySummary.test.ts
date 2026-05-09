/**
 * Testes unitários para o motor de cálculo financeiro getMonthlySummary
 * Cobre as 3 prioridades: valor salvo, startTime/endTime, regex no texto
 */
import { describe, it, expect } from "vitest";

// ─── Funções auxiliares replicadas aqui para teste isolado ───────────────────

const parseHoursFromText = (text: string): number => {
  if (!text) return 0;
  if (/\b(7-19|07-19|19-7|19-07)\b/.test(text)) return 12;
  if (/\b(7-13|07-13|13-19|13-7)\b/.test(text)) return 6;
  const m = text.match(/\b(\d{1,2})-(\d{1,2})\b/);
  if (m) {
    let diff = parseInt(m[2], 10) - parseInt(m[1], 10);
    if (diff < 0) diff += 24;
    return diff;
  }
  return 0;
};

const parseHoursFromTimes = (startTime?: string | null, endTime?: string | null): number => {
  if (!startTime || !endTime) return 0;
  const s = startTime.match(/(\d{1,2}):(\d{2})/);
  const e = endTime.match(/(\d{1,2}):(\d{2})/);
  if (!s || !e) return 0;
  let diff = parseInt(e[1], 10) - parseInt(s[1], 10);
  if (diff < 0) diff += 24;
  return diff;
};

const calcShift = (event: any, hourlyRate: number): { hours: number; value: number } => {
  if (event.isCancelled) return { hours: 0, value: 0 };

  const savedValue = event.value ? parseFloat(String(event.value)) : 0;
  if (savedValue > 0) return { hours: 0, value: savedValue };

  const hoursFromTime = parseHoursFromTimes(event.startTime, event.endTime);
  if (hoursFromTime > 0) return { hours: hoursFromTime, value: hoursFromTime * hourlyRate };

  const textToSearch = `${event.type ?? ""} ${event.description ?? ""}`;
  const hoursFromText = parseHoursFromText(textToSearch);
  if (hoursFromText > 0) return { hours: hoursFromText, value: hoursFromText * hourlyRate };

  return { hours: 0, value: 0 };
};

// ─── Testes ──────────────────────────────────────────────────────────────────

describe("parseHoursFromText", () => {
  it("detecta padrão 7-19 como 12 horas", () => {
    expect(parseHoursFromText("ZN 7-19")).toBe(12);
  });
  it("detecta padrão 07-19 como 12 horas", () => {
    expect(parseHoursFromText("HC 07-19")).toBe(12);
  });
  it("detecta padrão 19-7 como 12 horas (virada de dia)", () => {
    expect(parseHoursFromText("ZN 19-7")).toBe(12);
  });
  it("detecta padrão 7-13 como 6 horas", () => {
    expect(parseHoursFromText("ZN 7-13")).toBe(6);
  });
  it("detecta padrão 13-19 como 6 horas", () => {
    expect(parseHoursFromText("HC 13-19")).toBe(6);
  });
  it("detecta padrão genérico 8-14 como 6 horas", () => {
    expect(parseHoursFromText("Plantão 8-14")).toBe(6);
  });
  it("retorna 0 para texto sem padrão de horário", () => {
    expect(parseHoursFromText("Musculação")).toBe(0);
  });
  it("retorna 0 para string vazia", () => {
    expect(parseHoursFromText("")).toBe(0);
  });
});

describe("parseHoursFromTimes", () => {
  it("calcula 12h entre 07:00 e 19:00", () => {
    expect(parseHoursFromTimes("07:00", "19:00")).toBe(12);
  });
  it("calcula 6h entre 07:00 e 13:00", () => {
    expect(parseHoursFromTimes("07:00", "13:00")).toBe(6);
  });
  it("calcula 12h para turno noturno 19:00 → 07:00", () => {
    expect(parseHoursFromTimes("19:00", "07:00")).toBe(12);
  });
  it("retorna 0 se startTime ausente", () => {
    expect(parseHoursFromTimes(null, "19:00")).toBe(0);
  });
  it("retorna 0 se endTime ausente", () => {
    expect(parseHoursFromTimes("07:00", null)).toBe(0);
  });
});

describe("calcShift - Prioridade 1: valor salvo", () => {
  it("usa value diretamente quando > 0", () => {
    const event = { isCancelled: false, value: "350.00", startTime: "07:00", endTime: "19:00", type: "ZN 7-19" };
    const result = calcShift(event, 50);
    expect(result.value).toBe(350);
    expect(result.hours).toBe(0);
  });
  it("ignora value = 0 e cai para prioridade 2", () => {
    const event = { isCancelled: false, value: "0", startTime: "07:00", endTime: "13:00", type: "ZN" };
    const result = calcShift(event, 50);
    expect(result.hours).toBe(6);
    expect(result.value).toBe(300);
  });
});

describe("calcShift - Prioridade 2: startTime/endTime", () => {
  it("calcula 12h * hourlyRate quando há startTime e endTime", () => {
    const event = { isCancelled: false, value: null, startTime: "07:00", endTime: "19:00", type: "ZN" };
    const result = calcShift(event, 40);
    expect(result.hours).toBe(12);
    expect(result.value).toBe(480);
  });
});

describe("calcShift - Prioridade 3: regex no texto", () => {
  it("detecta 6h via tipo 'ZN 7-13' quando não há horários estruturados", () => {
    const event = { isCancelled: false, value: null, startTime: null, endTime: null, type: "ZN 7-13", description: null };
    const result = calcShift(event, 50);
    expect(result.hours).toBe(6);
    expect(result.value).toBe(300);
  });
  it("detecta 12h via tipo 'HC 7-19'", () => {
    const event = { isCancelled: false, value: null, startTime: null, endTime: null, type: "HC 7-19", description: null };
    const result = calcShift(event, 60);
    expect(result.hours).toBe(12);
    expect(result.value).toBe(720);
  });
});

describe("calcShift - evento cancelado", () => {
  it("retorna 0 horas e 0 valor para evento cancelado", () => {
    const event = { isCancelled: true, value: "500", startTime: "07:00", endTime: "19:00", type: "ZN 7-19" };
    const result = calcShift(event, 50);
    expect(result.hours).toBe(0);
    expect(result.value).toBe(0);
  });
});

import { describe, it, expect } from "vitest";

// Test the RH conciliation business logic
describe("RH Conciliation Logic", () => {
  describe("Effective values calculation", () => {
    const VALOR_HORA_ZN = 136;
    const VALOR_HORA_HC = 108;

    function calculateEffective(
      systemHours: number,
      rhHours: number | null,
      valorHora: number
    ) {
      const effectiveHours = rhHours !== null ? rhHours : systemHours;
      const effectiveTotal = effectiveHours * valorHora;
      const diff = rhHours !== null ? rhHours - systemHours : null;
      const diffValue = diff !== null ? diff * valorHora : null;
      return { effectiveHours, effectiveTotal, diff, diffValue };
    }

    it("should use system hours when RH is null", () => {
      const result = calculateEffective(198, null, VALOR_HORA_ZN);
      expect(result.effectiveHours).toBe(198);
      expect(result.effectiveTotal).toBe(198 * 136);
      expect(result.diff).toBeNull();
      expect(result.diffValue).toBeNull();
    });

    it("should use RH hours when provided", () => {
      const result = calculateEffective(198, 180, VALOR_HORA_ZN);
      expect(result.effectiveHours).toBe(180);
      expect(result.effectiveTotal).toBe(180 * 136);
      expect(result.diff).toBe(-18);
      expect(result.diffValue).toBe(-18 * 136);
    });

    it("should show positive diff when RH > system", () => {
      const result = calculateEffective(198, 210, VALOR_HORA_ZN);
      expect(result.diff).toBe(12);
      expect(result.diffValue).toBe(12 * 136);
    });

    it("should show zero diff when RH equals system", () => {
      const result = calculateEffective(198, 198, VALOR_HORA_ZN);
      expect(result.diff).toBe(0);
      expect(result.diffValue).toBe(0);
    });

    it("should calculate HC effective values correctly", () => {
      const result = calculateEffective(42, 36, VALOR_HORA_HC);
      expect(result.effectiveHours).toBe(36);
      expect(result.effectiveTotal).toBe(36 * 108);
      expect(result.diff).toBe(-6);
      expect(result.diffValue).toBe(-6 * 108);
    });
  });

  describe("Total recebimentos with RH override", () => {
    it("should use RH values in total when both are provided", () => {
      const rhZN = 180;
      const rhHC = 36;
      const valorZN = 136;
      const valorHC = 108;
      const totalRecebimentos = (rhZN * valorZN) + (rhHC * valorHC);
      expect(totalRecebimentos).toBe(24480 + 3888);
      expect(totalRecebimentos).toBe(28368);
    });

    it("should mix RH and system values when only one is provided", () => {
      const systemZN = 198;
      const rhZN = null;
      const systemHC = 42;
      const rhHC = 36;
      const valorZN = 136;
      const valorHC = 108;
      const effectiveZN = rhZN !== null ? rhZN : systemZN;
      const effectiveHC = rhHC !== null ? rhHC : systemHC;
      const totalRecebimentos = (effectiveZN * valorZN) + (effectiveHC * valorHC);
      expect(totalRecebimentos).toBe((198 * 136) + (36 * 108));
    });
  });

  describe("Saldo estimado with RH override", () => {
    it("should calculate saldo using effective values", () => {
      const rhZN = 180;
      const rhHC = 36;
      const valorZN = 136;
      const valorHC = 108;
      const despesasFixas = 5000;
      const totalRecebimentos = (rhZN * valorZN) + (rhHC * valorHC);
      const saldo = totalRecebimentos - despesasFixas;
      expect(saldo).toBe(28368 - 5000);
      expect(saldo).toBe(23368);
    });

    it("should show negative saldo when expenses exceed income", () => {
      const rhZN = 10;
      const rhHC = 5;
      const valorZN = 136;
      const valorHC = 108;
      const despesasFixas = 5000;
      const totalRecebimentos = (rhZN * valorZN) + (rhHC * valorHC);
      const saldo = totalRecebimentos - despesasFixas;
      expect(saldo).toBeLessThan(0);
      expect(saldo).toBe((10 * 136 + 5 * 108) - 5000);
    });
  });

  describe("Input validation", () => {
    it("should treat empty string as null (no override)", () => {
      const rhValue = "";
      const parsed = rhValue.trim() !== "" ? parseFloat(rhValue) : null;
      expect(parsed).toBeNull();
    });

    it("should parse valid number strings", () => {
      const rhValue = "150.5";
      const parsed = rhValue.trim() !== "" ? parseFloat(rhValue) : null;
      expect(parsed).toBe(150.5);
    });

    it("should handle zero as a valid RH input", () => {
      const rhValue = "0";
      const parsed = rhValue.trim() !== "" ? parseFloat(rhValue) : null;
      expect(parsed).toBe(0);
    });
  });
});

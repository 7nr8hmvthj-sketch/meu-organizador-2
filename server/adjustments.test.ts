import { describe, it, expect } from "vitest";

// Test the adjustment logic independently
describe("Workplace Adjustments Logic", () => {
  // Simulate the adjustment calculation logic from getMonthlySummary
  const applyAdjustments = (
    rawHours: number,
    hourlyRate: number,
    hoursAdjustment: number
  ) => {
    const totalHours = rawHours + hoursAdjustment;
    const totalValue = totalHours * hourlyRate;
    return { totalHours, totalValue };
  };

  it("should add positive adjustment to raw hours", () => {
    const result = applyAdjustments(100, 50, 12);
    expect(result.totalHours).toBe(112);
    expect(result.totalValue).toBe(5600);
  });

  it("should subtract negative adjustment from raw hours", () => {
    const result = applyAdjustments(144, 50, -12);
    expect(result.totalHours).toBe(132);
    expect(result.totalValue).toBe(6600);
  });

  it("should handle zero adjustment", () => {
    const result = applyAdjustments(100, 50, 0);
    expect(result.totalHours).toBe(100);
    expect(result.totalValue).toBe(5000);
  });

  it("should handle zero raw hours with positive adjustment", () => {
    const result = applyAdjustments(0, 50, 6);
    expect(result.totalHours).toBe(6);
    expect(result.totalValue).toBe(300);
  });

  it("should handle large negative adjustment (more than raw hours)", () => {
    const result = applyAdjustments(10, 50, -20);
    expect(result.totalHours).toBe(-10);
    expect(result.totalValue).toBe(-500);
  });

  it("should handle fractional adjustments", () => {
    const result = applyAdjustments(100, 45.5, -6.5);
    expect(result.totalHours).toBe(93.5);
    expect(result.totalValue).toBeCloseTo(4254.25);
  });
});

describe("Cycle End Day Detection", () => {
  // Simulate the logic used in CalendarPage for detecting closing days
  const getClosingWorkplaces = (
    dayNumber: number,
    workplaces: Array<{ id: number; name: string; cycleEndDay: number }>
  ) => {
    return workplaces.filter((wp) => wp.cycleEndDay === dayNumber);
  };

  it("should detect workplace closing on matching day", () => {
    const workplaces = [
      { id: 1, name: "ZN", cycleEndDay: 20 },
      { id: 2, name: "HC", cycleEndDay: 25 },
    ];
    const result = getClosingWorkplaces(20, workplaces);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("ZN");
  });

  it("should detect multiple workplaces closing on same day", () => {
    const workplaces = [
      { id: 1, name: "ZN", cycleEndDay: 20 },
      { id: 2, name: "HC", cycleEndDay: 20 },
    ];
    const result = getClosingWorkplaces(20, workplaces);
    expect(result).toHaveLength(2);
  });

  it("should return empty array when no workplace closes on that day", () => {
    const workplaces = [
      { id: 1, name: "ZN", cycleEndDay: 20 },
      { id: 2, name: "HC", cycleEndDay: 25 },
    ];
    const result = getClosingWorkplaces(15, workplaces);
    expect(result).toHaveLength(0);
  });

  it("should handle day 31 (end of month)", () => {
    const workplaces = [
      { id: 1, name: "ZN", cycleEndDay: 31 },
    ];
    const result = getClosingWorkplaces(31, workplaces);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("ZN");
  });

  it("should handle day 1 (start of month)", () => {
    const workplaces = [
      { id: 1, name: "ZN", cycleEndDay: 1 },
    ];
    const result = getClosingWorkplaces(1, workplaces);
    expect(result).toHaveLength(1);
  });
});

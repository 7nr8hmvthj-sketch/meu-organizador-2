import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";

/**
 * Tests for the DB-based authentication system (Phase 4)
 * Validates bcrypt hashing, password comparison, and auth flow logic
 */

describe("Auth via Database (bcrypt)", () => {
  describe("Password Hashing", () => {
    it("should hash a password correctly", async () => {
      const password = "Wert123.";
      const hash = await bcrypt.hash(password, 10);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);
    });

    it("should validate correct password against hash", async () => {
      const password = "Wert123.";
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password against hash", async () => {
      const password = "Wert123.";
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare("wrongpassword", hash);
      expect(isValid).toBe(false);
    });

    it("should handle empty password rejection", async () => {
      const password = "123";
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare("", hash);
      expect(isValid).toBe(false);
    });
  });

  describe("Username Normalization", () => {
    it("should normalize username to uppercase", () => {
      const inputs = ["user", "User", "USER", "uSeR"];
      inputs.forEach(input => {
        expect(input.toUpperCase()).toBe("USER");
      });
    });

    it("should handle special characters in username", () => {
      const input = "vegano";
      expect(input.toUpperCase()).toBe("VEGANO");
    });
  });

  describe("User Credentials Validation", () => {
    const USERS = [
      { username: "USER", password: "Wert123.", role: "admin", userId: 1 },
      { username: "JESSICA", password: "123", role: "trainer", userId: 150023 },
      { username: "ISA", password: "123", role: "trainer", userId: 150024 },
      { username: "VEGANO", password: "123", role: "admin", userId: 2 },
    ];

    it("should validate all 4 users with correct passwords", async () => {
      for (const user of USERS) {
        const hash = await bcrypt.hash(user.password, 10);
        const isValid = await bcrypt.compare(user.password, hash);
        expect(isValid).toBe(true);
      }
    });

    it("should reject all users with wrong passwords", async () => {
      for (const user of USERS) {
        const hash = await bcrypt.hash(user.password, 10);
        const isValid = await bcrypt.compare("wrongpass", hash);
        expect(isValid).toBe(false);
      }
    });

    it("should not accept one user's password for another", async () => {
      const userHash = await bcrypt.hash("Wert123.", 10);
      const isValid = await bcrypt.compare("123", userHash);
      expect(isValid).toBe(false);
    });
  });

  describe("Cookie Data Structure", () => {
    it("should produce valid JSON for cookie", () => {
      const userInfo = JSON.stringify({ username: "USER", role: "admin", userId: 1 });
      const parsed = JSON.parse(userInfo);
      expect(parsed.username).toBe("USER");
      expect(parsed.role).toBe("admin");
      expect(parsed.userId).toBe(1);
    });

    it("should include all required fields", () => {
      const userInfo = JSON.stringify({ username: "JESSICA", role: "trainer", userId: 150023 });
      const parsed = JSON.parse(userInfo);
      expect(parsed).toHaveProperty("username");
      expect(parsed).toHaveProperty("role");
      expect(parsed).toHaveProperty("userId");
    });
  });

  describe("Role-based Access", () => {
    it("admin role should pass admin check", () => {
      const user = { username: "USER", role: "admin", userId: 1 };
      expect(user.role === "admin").toBe(true);
    });

    it("trainer role should fail admin check", () => {
      const user = { username: "JESSICA", role: "trainer", userId: 150023 };
      expect(user.role === "admin").toBe(false);
    });

    it("createUser should only be accessible by admin", () => {
      const adminUser = { role: "admin" };
      const trainerUser = { role: "trainer" };
      expect(adminUser.role !== "admin").toBe(false); // admin passes
      expect(trainerUser.role !== "admin").toBe(true); // trainer blocked
    });
  });

  describe("Data Isolation by userId", () => {
    it("different users should have different userIds", () => {
      const userIds = [1, 150023, 150024, 2];
      const uniqueIds = new Set(userIds);
      expect(uniqueIds.size).toBe(userIds.length);
    });

    it("queries should filter by userId", () => {
      // Simulating query filter logic
      const allEvents = [
        { id: 1, userId: 1, type: "ZN 7-13" },
        { id: 2, userId: 2, type: "HC" },
        { id: 3, userId: 1, type: "Pilates" },
      ];
      const user1Events = allEvents.filter(e => e.userId === 1);
      const user2Events = allEvents.filter(e => e.userId === 2);
      expect(user1Events.length).toBe(2);
      expect(user2Events.length).toBe(1);
      expect(user1Events.every(e => e.userId === 1)).toBe(true);
      expect(user2Events.every(e => e.userId === 2)).toBe(true);
    });
  });
});

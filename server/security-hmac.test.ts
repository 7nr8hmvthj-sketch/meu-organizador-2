import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";

// Replicate the HMAC functions from routers.ts
const SECRET = process.env.JWT_SECRET || "chave_super_secreta_padrao_123";

function signCookie(data: any) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

function verifyCookie(cookieValue: string) {
  try {
    const decoded = decodeURIComponent(cookieValue);
    const [payload, signature] = decoded.split(".");
    if (!payload || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", SECRET)
      .update(payload)
      .digest("hex");
    if (signature !== expectedSignature) return null;

    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

describe("HMAC Cookie Security", () => {
  it("should sign and verify a valid cookie", () => {
    const userData = { username: "USER", role: "admin", userId: 1 };
    const signed = signCookie(userData);

    expect(signed).toContain(".");
    const verified = verifyCookie(signed);
    expect(verified).toEqual(userData);
  });

  it("should reject a tampered cookie payload", () => {
    const userData = { username: "USER", role: "admin", userId: 1 };
    const signed = signCookie(userData);
    const [payload, signature] = signed.split(".");

    // Tamper with payload
    const tamperedPayload = Buffer.from("hacked").toString("base64");
    const tamperedCookie = `${tamperedPayload}.${signature}`;

    const verified = verifyCookie(tamperedCookie);
    expect(verified).toBeNull();
  });

  it("should reject a tampered signature", () => {
    const userData = { username: "USER", role: "admin", userId: 1 };
    const signed = signCookie(userData);
    const [payload] = signed.split(".");

    // Tamper with signature
    const tamperedCookie = `${payload}.fakesignature123456789`;

    const verified = verifyCookie(tamperedCookie);
    expect(verified).toBeNull();
  });

  it("should reject a cookie with missing signature", () => {
    const payload = Buffer.from(
      JSON.stringify({ username: "USER", role: "admin", userId: 1 })
    ).toString("base64");

    const verified = verifyCookie(payload);
    expect(verified).toBeNull();
  });

  it("should reject a cookie with invalid base64", () => {
    const verified = verifyCookie("!!!invalid!!!.fakesig");
    expect(verified).toBeNull();
  });

  it("should handle URL-encoded cookies", () => {
    const userData = { username: "USER", role: "admin", userId: 1 };
    const signed = signCookie(userData);
    const encoded = encodeURIComponent(signed);

    const verified = verifyCookie(encoded);
    expect(verified).toEqual(userData);
  });

  it("should not allow role escalation via cookie tampering", () => {
    const userData = { username: "JESSICA", role: "trainer", userId: 150023 };
    const signed = signCookie(userData);

    // Attacker tries to change role to admin
    const [payload] = signed.split(".");
    const hackedData = {
      username: "JESSICA",
      role: "admin",
      userId: 150023,
    };
    const hackedPayload = Buffer.from(JSON.stringify(hackedData)).toString(
      "base64"
    );
    const hackedCookie = `${hackedPayload}.fakesignature`;

    const verified = verifyCookie(hackedCookie);
    expect(verified).toBeNull(); // Should be rejected
  });

  it("should not allow userId escalation via cookie tampering", () => {
    const userData = { username: "JESSICA", role: "trainer", userId: 150023 };
    const signed = signCookie(userData);

    // Attacker tries to change userId to 1 (admin)
    const hackedData = { username: "JESSICA", role: "trainer", userId: 1 };
    const hackedPayload = Buffer.from(JSON.stringify(hackedData)).toString(
      "base64"
    );
    const hackedCookie = `${hackedPayload}.fakesignature`;

    const verified = verifyCookie(hackedCookie);
    expect(verified).toBeNull(); // Should be rejected
  });
});

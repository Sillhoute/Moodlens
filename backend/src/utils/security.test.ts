import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  buatToken,
  verifikasiToken,
} from "./security";

describe("Security Utilities", () => {
  it("harus meng-hash password dan memverifikasinya dengan benar", async () => {
    const rawPassword = "PasswordRahasia123";
    const hashed = await hashPassword(rawPassword);

    expect(hashed).not.toBe(rawPassword);

    const isValid = await verifyPassword(rawPassword, hashed);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword("PasswordSalah", hashed);
    expect(isInvalid).toBe(false);
  });

  it("harus membuat dan memverifikasi token JWT", () => {
    const payload = { userId: 1, username: "testuser" };
    const { token } = buatToken(payload.userId, payload.username);

    expect(token).toBeDefined();

    const decoded = verifikasiToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.username).toBe(payload.username);
  });
});

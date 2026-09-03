import { describe, it, expect } from "vitest"
import { encryptToken, decryptToken } from "@/lib/crypto"

describe("AES-256-GCM Cryptographic Security Suite", () => {
  it("successfully encrypts and decrypts a sensitive token", () => {
    const originalToken = "ya29.a0AfH6SMB_secret_google_oauth_refresh_token_xyz123"
    const encrypted = encryptToken(originalToken)

    expect(encrypted).not.toBe(originalToken)
    expect(encrypted.split(":")).toHaveLength(3) // iv:authTag:ciphertext

    const decrypted = decryptToken(encrypted)
    expect(decrypted).toBe(originalToken)
  })

  it("produces unique ciphertexts for the same plaintext due to random IV", () => {
    const text = "repeatable_token_value"
    const enc1 = encryptToken(text)
    const enc2 = encryptToken(text)

    expect(enc1).not.toBe(enc2)
    expect(decryptToken(enc1)).toBe(text)
    expect(decryptToken(enc2)).toBe(text)
  })

  it("detects ciphertext tampering and fails securely", () => {
    const originalToken = "super_secret_payload"
    const encrypted = encryptToken(originalToken)
    const [iv, authTag, ciphertext] = encrypted.split(":")

    // Tamper with last character of ciphertext
    const tamperedCipher = ciphertext.slice(0, -2) + (ciphertext.slice(-2) === "00" ? "ff" : "00")
    const tamperedPayload = `${iv}:${authTag}:${tamperedCipher}`

    expect(() => decryptToken(tamperedPayload)).toThrow()
  })

  it("detects authentication tag tampering and fails securely", () => {
    const originalToken = "super_secret_payload"
    const encrypted = encryptToken(originalToken)
    const [iv, , ciphertext] = encrypted.split(":")

    // Tamper with auth tag
    const tamperedTag = "00".repeat(16)
    const tamperedPayload = `${iv}:${tamperedTag}:${ciphertext}`

    expect(() => decryptToken(tamperedPayload)).toThrow()
  })

  it("handles empty strings gracefully", () => {
    expect(encryptToken("")).toBe("")
    expect(decryptToken("")).toBe("")
  })
})

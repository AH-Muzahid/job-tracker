import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12 // Standard recommended IV length for GCM
const AUTH_TAG_LENGTH = 16

/**
 * Derives a consistent 32-byte cryptographic key from environment secrets.
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    "careertrack-default-dev-secret-key-32b"

  return crypto.createHash("sha256").update(secret).digest()
}

/**
 * Encrypts a sensitive string (e.g. OAuth access/refresh token) using AES-256-GCM.
 * Output format: `ivHex:authTagHex:ciphertextHex`
 */
export function encryptToken(text: string): string {
  if (!text) return ""

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag().toString("hex")
  const ivHex = iv.toString("hex")

  return `${ivHex}:${authTag}:${encrypted}`
}

/**
 * Decrypts an AES-256-GCM encrypted token.
 * Throws an error if authentication tag verification fails (detecting tampering).
 */
export function decryptToken(encryptedText: string): string {
  if (!encryptedText) return ""

  // Format: ivHex:authTagHex:ciphertextHex
  const parts = encryptedText.split(":")
  if (parts.length !== 3) {
    // If not in encrypted format (e.g. legacy plain text during dev transition), return as-is
    return encryptedText
  }

  const [ivHex, authTagHex, ciphertextHex] = parts
  const key = getEncryptionKey()
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

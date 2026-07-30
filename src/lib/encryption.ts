import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const SALT_LENGTH = 16

function getKey(salt: Buffer): Buffer {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET
  if (!secret) throw new Error("AI_KEY_ENCRYPTION_SECRET is not set")
  return crypto.scryptSync(secret, salt, 32)
}

/**
 * Encrypts text using AES-256-GCM with a random salt and IV.
 * Output format: salt:iv:authTag:ciphertext (all hex-encoded)
 */
export function encrypt(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const key = getKey(salt)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  const tag = cipher.getAuthTag().toString("hex")
  return `${salt.toString("hex")}:${iv.toString("hex")}:${tag}:${encrypted}`
}

/**
 * Decrypts text encrypted by the encrypt() function.
 * Supports both legacy 3-part format (static salt) and new 4-part format (random salt).
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":")

  let salt: Buffer
  let ivHex: string
  let tagHex: string
  let data: string

  if (parts.length === 4) {
    // New format: salt:iv:tag:data
    ;[, ivHex, tagHex, data] = parts
    salt = Buffer.from(parts[0], "hex")
  } else if (parts.length === 3) {
    // Legacy format: iv:tag:data (static "salt" string)
    ;[ivHex, tagHex, data] = parts
    const secret = process.env.AI_KEY_ENCRYPTION_SECRET
    if (!secret) throw new Error("AI_KEY_ENCRYPTION_SECRET is not set")
    salt = Buffer.from("salt") // backward compat with old static salt
  } else {
    throw new Error("Invalid encrypted format")
  }

  const key = getKey(salt)
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  let decrypted = decipher.update(data, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

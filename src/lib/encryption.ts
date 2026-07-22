import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16

function getKey(): Buffer {
  const secret = process.env.AI_KEY_ENCRYPTION_SECRET
  if (!secret) throw new Error("AI_KEY_ENCRYPTION_SECRET is not set")
  return crypto.scryptSync(secret, "salt", 32)
}

export function encrypt(text: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  const tag = cipher.getAuthTag().toString("hex")
  return `${iv.toString("hex")}:${tag}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  const key = getKey()
  const parts = encryptedText.split(":")
  if (parts.length !== 3) throw new Error("Invalid encrypted format")
  const [ivHex, tagHex, data] = parts
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  let decrypted = decipher.update(data, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

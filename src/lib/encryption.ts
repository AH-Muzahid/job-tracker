import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const SALT_LENGTH = 16

function getKey(salt: Buffer, secretOverride?: string): Buffer {
  const secret =
    secretOverride ||
    process.env.AI_KEY_ENCRYPTION_SECRET ||
    process.env.ENCRYPTION_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    "careertrack-default-ai-key-secret-32b"

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

function tryDecryptWithSecret(parts: string[], secret: string): string | null {
  try {
    let salt: Buffer
    let ivHex: string
    let tagHex: string
    let data: string

    if (parts.length === 4) {
      ;[, ivHex, tagHex, data] = parts
      salt = Buffer.from(parts[0], "hex")
    } else if (parts.length === 3) {
      ;[ivHex, tagHex, data] = parts
      salt = Buffer.from("salt")
    } else {
      return null
    }

    const key = crypto.scryptSync(secret, salt, 32)
    const iv = Buffer.from(ivHex, "hex")
    const tag = Buffer.from(tagHex, "hex")
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    let decrypted = decipher.update(data, "hex", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
  } catch {
    return null
  }
}

/**
 * Decrypts text encrypted by the encrypt() function.
 * Supports both legacy 3-part format (static salt) and new 4-part format (random salt),
 * testing candidate environment secrets in case of secret rotation.
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":")
  if (parts.length !== 3 && parts.length !== 4) {
    throw new Error("Invalid encrypted format")
  }

  const candidateSecrets = [
    process.env.AI_KEY_ENCRYPTION_SECRET,
    process.env.ENCRYPTION_SECRET,
    process.env.AUTH_SECRET,
    process.env.CLERK_SECRET_KEY,
    "careertrack-default-ai-key-secret-32b",
  ].filter(Boolean) as string[]

  for (const secret of candidateSecrets) {
    const result = tryDecryptWithSecret(parts, secret)
    if (result !== null) {
      return result
    }
  }

  throw new Error("unable to authenticate data")
}

import { createHash } from "node:crypto"
import { getRedisClient } from "@/lib/redis"

const localReceipts = new Map<string, { result?: unknown; expires: number }>()
export function sideEffectKey(userId: string, payload: unknown) {
  return `ai:delivery:${userId}:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`
}

/** Reserve before send; ambiguous/provider-crash receipts remain pending rather than resending. */
export async function deduplicateDelivery<T>(key: string, send: () => Promise<T>): Promise<T> {
  const redis = getRedisClient()
  const pending = { state: "pending" }
  if (!redis) {
    if (process.env.NODE_ENV === "production") throw new Error("Delivery deduplication storage unavailable")
    for (const [id, value] of localReceipts) if (value.expires < Date.now()) localReceipts.delete(id)
    const prior = localReceipts.get(key)
    if (prior) {
      if (prior.result !== undefined) return prior.result as T
      throw new Error("Delivery is already processing. Check sent mail before retrying.")
    }
    if (localReceipts.size >= 1000) throw new Error("Delivery cache capacity exceeded")
    localReceipts.set(key, { expires: Date.now() + 86400000 })
    const result = await send()
    localReceipts.set(key, { result, expires: Date.now() + 86400000 })
    return result
  }
  const reserved = await redis.set(key, pending, { nx: true, ex: 86400 })
  if (!reserved) {
    const prior = await redis.get<{ state: string; result?: T }>(key)
    if (prior?.state === "settled" && prior.result !== undefined) return prior.result
    throw new Error("Delivery is already processing. Check sent mail before retrying.")
  }
  const result = await send()
  await redis.set(key, { state: "settled", result }, { ex: 86400 })
  return result
}

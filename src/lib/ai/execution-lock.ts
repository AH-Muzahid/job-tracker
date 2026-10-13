import { prisma } from "@/lib/prisma"

export class ExecutionBusyError extends Error {
  constructor() { super("Another action is running. Wait for its result before retrying."); this.name = "ExecutionBusyError" }
}

/** Transaction-scoped advisory lock: atomic across workers and released on disconnect. */
export async function withExecutionLock<T>(key: string, task: () => Promise<T>, timeout = 15000): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const locks = await tx.$queryRaw<Array<{ acquired: boolean }>>`SELECT pg_try_advisory_xact_lock(hashtextextended(${key}, 0)) AS acquired`
    if (!locks[0]?.acquired) throw new ExecutionBusyError()
    return task()
  }, { timeout, maxWait: 5000 })
}

/** Hold the same DB transaction until an HTTP stream's server-side work settles. */
export async function acquireAgentLease(key: string) {
  const controller = new AbortController()
  let unlock!: () => void
  let ready!: () => void
  let fail!: (error: unknown) => void
  const held = new Promise<void>((resolve) => { unlock = resolve })
  const acquired = new Promise<void>((resolve, reject) => { ready = resolve; fail = reject })
  const transaction = withExecutionLock(key, async () => { ready(); await held }, 150000)
  // Handle transaction failure even if it happens after acquisition.
  void transaction.catch((error) => { controller.abort(error); fail(error) })
  await acquired
  return Object.assign(async () => { unlock(); await transaction }, { signal: controller.signal })
}

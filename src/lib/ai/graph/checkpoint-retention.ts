import { prisma } from "@/lib/prisma"

/** Called only under the owning user's execution lease after a settled turn. */
export async function pruneSettledThread(userId: string, sessionId: string) {
  const threadId = `user:${userId}:session:${sessionId}`
  await prisma.$transaction(async (tx) => {
    // Retain two snapshots per namespace: latest resume state and its immediate parent.
    await tx.$executeRaw`DELETE FROM checkpoints WHERE thread_id = ${threadId} AND (checkpoint_ns, checkpoint_id) NOT IN (
      SELECT checkpoint_ns, checkpoint_id FROM (
        SELECT checkpoint_ns, checkpoint_id, row_number() OVER (PARTITION BY checkpoint_ns ORDER BY checkpoint_id DESC) AS position
        FROM checkpoints WHERE thread_id = ${threadId}
      ) retained WHERE position <= 2
    )`
    // Keep writes for retained checkpoints; latest snapshot can reference parent task writes.
    await tx.$executeRaw`DELETE FROM checkpoint_writes writes WHERE writes.thread_id = ${threadId} AND NOT EXISTS (
      SELECT 1 FROM checkpoints cp WHERE cp.thread_id = writes.thread_id AND cp.checkpoint_ns = writes.checkpoint_ns AND cp.checkpoint_id = writes.checkpoint_id
    )`
    // Shared version blobs remain while referenced by either retained snapshot.
    await tx.$executeRaw`DELETE FROM checkpoint_blobs blobs WHERE blobs.thread_id = ${threadId} AND NOT EXISTS (
      SELECT 1 FROM checkpoints cp, LATERAL jsonb_each_text(cp.checkpoint -> 'channel_versions') versions
      WHERE cp.thread_id = blobs.thread_id AND cp.checkpoint_ns = blobs.checkpoint_ns AND versions.key = blobs.channel AND versions.value = blobs.version
    )`
  }, { timeout: 10000 })
}

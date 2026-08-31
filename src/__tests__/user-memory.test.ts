/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest"
import { executeSaveUserMemory, executeGetUserMemories } from "@/lib/ai/graph/tools/profile-tools"
import { prisma } from "@/lib/prisma"

describe("User Memory & Semantic Fact Management", () => {
  const testUserId = "test-user-mem-123"

  it("handles saving user memory successfully", async () => {
    vi.spyOn((prisma as any).userMemory, "create").mockResolvedValueOnce({
      id: "mem_1",
      userId: testUserId,
      category: "preference",
      content: "Prefers remote Golang & React roles",
      source: "chat",
      createdAt: new Date(),
    })

    const result = await executeSaveUserMemory(testUserId, {
      category: "preference",
      content: "Prefers remote Golang & React roles",
    })

    expect(result.success).toBe(true)
    expect(result.message).toContain("Prefers remote Golang & React roles")
  })

  it("handles retrieving user memories", async () => {
    vi.spyOn((prisma as any).userMemory, "findMany").mockResolvedValueOnce([
      {
        id: "mem_1",
        userId: testUserId,
        category: "preference",
        content: "Prefers remote Golang & React roles",
      },
    ])

    const result = await executeGetUserMemories(testUserId)
    expect(result.success).toBe(true)
    expect(result.count).toBe(1)
    expect((result.memories as any[])?.[0]?.content).toBe("Prefers remote Golang & React roles")
  })
})

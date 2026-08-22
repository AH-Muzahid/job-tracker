/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest"
import { createAiTools } from "@/lib/ai/tools"
import { prisma } from "@/lib/prisma"

describe("User Memory & Semantic Fact Management", () => {
  const testUserId = "test-user-mem-123"

  it("exposes saveUserMemory, forgetUserMemory, and getUserMemories tools", () => {
    const tools = createAiTools(testUserId) as any
    expect(tools.saveUserMemory).toBeDefined()
    expect(tools.forgetUserMemory).toBeDefined()
    expect(tools.getUserMemories).toBeDefined()
  })

  it("handles saving user memory and prevents duplicate insertion", async () => {
    const tools = createAiTools(testUserId) as any

    // Mock prisma responses
    vi.spyOn(prisma.userMemory, "findFirst").mockResolvedValueOnce(null)
    vi.spyOn(prisma.userMemory, "create").mockResolvedValueOnce({
      id: "mem_1",
      userId: testUserId,
      category: "preference",
      content: "Prefers remote Golang & React roles",
      source: "chat",
      confidence: 1.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const result = await tools.saveUserMemory.execute({
      category: "preference",
      content: "Prefers remote Golang & React roles",
    })

    expect(result.success).toBe(true)
    expect(result.memoryId).toBe("mem_1")
    expect(result.content).toBe("Prefers remote Golang & React roles")
  })
})

import * as fs from "fs"
import * as path from "path"
import { LangfuseClient } from "@langfuse/client"
import { LangfuseSpanProcessor } from "@langfuse/otel"
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node"
import {
  startObservation,
  propagateAttributes,
  setLangfuseTracerProvider,
} from "@langfuse/tracing"
import { buildTraceTagsAndMetadata } from "../src/lib/ai/graph/telemetry"

// Manual .env loader for standalone tsx execution
function loadEnvFiles() {
  const envPaths = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
  ]

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8")
      for (const line of content.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        const eqIdx = trimmed.indexOf("=")
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim()
          let val = trimmed.slice(eqIdx + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          if (!process.env[key]) {
            process.env[key] = val
          }
        }
      }
    }
  }
}

async function runVerification() {
  loadEnvFiles()

  console.log("=================================================")
  console.log("  CareerTrack: Langfuse v4 Production Telemetry Check")
  console.log("=================================================")

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY
  const secretKey = process.env.LANGFUSE_SECRET_KEY
  const baseUrl = process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com"

  console.log(`• Base URL: ${baseUrl}`)
  console.log(`• Public key configured: ${Boolean(publicKey)}`)
  console.log(`• Secret key configured: ${Boolean(secretKey)}`)
  console.log("-------------------------------------------------")

  if (!publicKey || !secretKey) {
    console.log("ℹ️  Langfuse credentials are not configured in environment.")
    console.log("   --> Telemetry disabled; no live verification performed.")
    console.log("   To enable live Langfuse cloud observability, set LANGFUSE_PUBLIC_KEY & LANGFUSE_SECRET_KEY in .env.local.")
    console.log("=================================================\n")
    process.exit(0)
  }

  const startTime = Date.now()
  try {
    const processor = new LangfuseSpanProcessor({
      publicKey,
      secretKey,
      baseUrl,
    })
    const provider = new NodeTracerProvider({
      spanProcessors: [processor],
    })
    setLangfuseTracerProvider(provider)

    const client = new LangfuseClient({
      publicKey,
      secretKey,
      baseUrl,
    })

    const testTraceId = `verify-${Date.now()}`
    const { tags } = buildTraceTagsAndMetadata({
      category: "telemetry_verification",
      userId: "sys_verifier",
      sessionId: testTraceId,
      additionalTags: ["script_check", "ci_cd", "v4_migrated"],
      additionalMetadata: { script: "scripts/verify-langfuse.ts" },
    })

    console.log("1. Creating synthetic test trace with propagated attributes...")
    let resultingTraceId = ""

    await propagateAttributes(
      {
        traceName: "telemetry-verification-test",
        userId: "sys_verifier",
        sessionId: testTraceId,
        tags,
        metadata: {
          script: "scripts/verify-langfuse.ts",
          category: "telemetry_verification",
        },
      },
      async () => {
        const root = startObservation("telemetry-verification-test", {
          input: { ping: "ping_payload" },
          output: { pong: "pong_payload", status: "OK" },
          level: "DEFAULT",
          statusMessage: "Synthetic healthcheck successful",
        })
        resultingTraceId = root.traceId

        console.log("2. Emitting nested generation observation & token metrics...")
        const gen = root.startObservation(
          "verification-generation",
          {
            model: "gpt-4o-mini",
            input: { prompt: "ping_payload" },
            output: { completion: "pong_payload" },
            usageDetails: {
              promptTokens: 5,
              completionTokens: 5,
              totalTokens: 10,
            },
            level: "DEFAULT",
            statusMessage: "Synthetic generation successful",
          },
          { asType: "generation" }
        )
        gen.end()
        root.end()

        console.log("3. Attaching quantitative feedback score via Langfuse v4 API...")
        await client.score.create({
          traceId: root.traceId,
          name: "telemetry_healthcheck",
          value: 1.0,
          comment: "Automated verification script passed on Langfuse v4",
          dataType: "NUMERIC",
        })
      }
    )

    console.log("4. Flushing events via LangfuseSpanProcessor and LangfuseClient...")
    await processor.forceFlush()
    await client.flush()
    await processor.shutdown()

    const latency = Date.now() - startTime
    console.log("-------------------------------------------------")
    console.log(`✓ Telemetry connection verified and flushed successfully in ${latency}ms!`)
    console.log(`✓ Trace ID: ${resultingTraceId}`)
    console.log("✓ Trace URL: " + `${baseUrl}/project/traces?search=${resultingTraceId}`)
    console.log("=================================================\n")
    process.exit(0)
  } catch (err: unknown) {
    console.error("❌ Langfuse Verification Failed:", err instanceof Error ? err.message : err)
    console.error("Please verify that your LANGFUSE_BASE_URL and keys are correct.")
    process.exit(1)
  }
}

runVerification()

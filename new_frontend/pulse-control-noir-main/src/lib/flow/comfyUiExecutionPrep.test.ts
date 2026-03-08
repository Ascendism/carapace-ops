import { describe, expect, it } from "vitest";
import { buildComfyExecutionPrep } from "@/lib/flow/comfyUiExecutionPrep";

describe("buildComfyExecutionPrep", () => {
  it("returns ready when dynamic adapter has no hard errors", () => {
    const result = buildComfyExecutionPrep({
      nodeId: "node-ready",
      contractParams: [{ key: "prompt", required: true, type: "string" }],
      runtimeParams: [{ key: "prompt", type: "string" }],
    });

    expect(result.status).toBe("ready");
    expect(result.errors).toEqual([]);
    expect(result.normalizedParamMap).toEqual({ prompt: "prompt" });
    expect(result.outputPipeline).toMatchObject({
      outputRoot: "artifacts/comfyui",
      watchStrategy: "watch_then_scan",
      scanStrategy: "recursive",
      discoveryMode: "manifest_then_glob",
    });
    expect(result.outputPipeline.runFolderPath).toMatch(/^artifacts\/comfyui\/\d{4}-\d{2}-\d{2}\/run\/node-ready$/);
  });

  it("returns blocked when required params are unresolved", () => {
    const result = buildComfyExecutionPrep({
      nodeId: "node-blocked",
      contractParams: [{ key: "steps", required: true, type: "number" }],
      runtimeParams: [{ key: "prompt", type: "string" }],
    });

    expect(result.status).toBe("blocked");
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]?.contractKey).toBe("steps");
  });

  it("stays ready when only adapter warnings are emitted", () => {
    const result = buildComfyExecutionPrep({
      nodeId: "node-warning",
      contractParams: [{ key: "prompt", required: true, type: "string", aliases: ["text"] }],
      runtimeParams: [{ key: "text", type: "string" }],
    });

    expect(result.status).toBe("ready");
    expect(result.errors).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.code).toBe("alias_match");
    expect(result.normalizedParamMap).toEqual({ prompt: "text" });
  });

  it("supports explicit output root + run id wiring for deterministic runtime discovery payloads", () => {
    const result = buildComfyExecutionPrep(
      {
        nodeId: "node-output",
        contractParams: [{ key: "prompt", required: true, type: "string" }],
        runtimeParams: [{ key: "prompt", type: "string" }],
      },
      {
        outputRoot: "artifacts/comfy-output",
        runDate: "2026-03-08",
        runId: "run_20260308",
      }
    );

    expect(result.outputPipeline.outputRoot).toBe("artifacts/comfy-output");
    expect(result.outputPipeline.runFolderPath).toBe("artifacts/comfy-output/2026-03-08/run_20260308/node-output");
  });
});

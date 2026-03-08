import { describe, expect, it } from "vitest";
import { adaptComfyDynamicInputs } from "./comfyUiDynamicInputAdapter";

describe("adaptComfyDynamicInputs", () => {
  it("maps exact contract keys without warnings", () => {
    const result = adaptComfyDynamicInputs({
      nodeId: "node-exact",
      contractParams: [{ key: "prompt", required: true, type: "string" }],
      runtimeParams: [{ key: "prompt", type: "string" }],
    });

    expect(result.normalizedParamMap).toEqual({ prompt: "prompt" });
    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("emits alias_match warning when alias is used", () => {
    const result = adaptComfyDynamicInputs({
      nodeId: "node-alias",
      contractParams: [{ key: "negative_prompt", required: true, type: "string", aliases: ["neg"] }],
      runtimeParams: [{ key: "neg", type: "string" }],
    });

    expect(result.normalizedParamMap).toEqual({ negative_prompt: "neg" });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "alias_match",
        contractKey: "negative_prompt",
        runtimeKey: "neg",
      }),
    ]);
  });

  it("emits default_fallback warning for non-required params with defaults", () => {
    const result = adaptComfyDynamicInputs({
      nodeId: "node-default",
      contractParams: [{ key: "seed", required: false, type: "number", defaultValue: 0 }],
      runtimeParams: [],
    });

    expect(result.normalizedParamMap).toEqual({});
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "default_fallback",
        contractKey: "seed",
      }),
    ]);
  });

  it("blocks unresolved required params when no compatible runtime key exists", () => {
    const result = adaptComfyDynamicInputs({
      nodeId: "node-hard-fail",
      contractParams: [{ key: "steps", required: true, type: "number" }],
      runtimeParams: [{ key: "prompt", type: "string" }],
    });

    expect(result.normalizedParamMap).toEqual({});
    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "required_unresolved",
        contractKey: "steps",
      }),
    ]);
  });

  it("honors user override mapping when target runtime key is compatible", () => {
    const result = adaptComfyDynamicInputs({
      nodeId: "node-override",
      contractParams: [{ key: "prompt", required: true, type: "string" }],
      runtimeParams: [
        { key: "text", type: "string" },
        { key: "prompt", type: "string" },
      ],
      userOverrides: { prompt: "text" },
    });

    expect(result.normalizedParamMap).toEqual({ prompt: "text" });
    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("emits override_ignored warning and falls back when override key is invalid", () => {
    const result = adaptComfyDynamicInputs({
      nodeId: "node-override-ignored",
      contractParams: [{ key: "prompt", required: true, type: "string" }],
      runtimeParams: [{ key: "prompt", type: "string" }],
      userOverrides: { prompt: "missing_key" },
    });

    expect(result.normalizedParamMap).toEqual({ prompt: "prompt" });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "override_ignored",
        contractKey: "prompt",
        runtimeKey: "missing_key",
      }),
    ]);
  });

  it("does not use ambiguous fuzzy matches for required params", () => {
    const result = adaptComfyDynamicInputs({
      nodeId: "node-fuzzy-ambiguous",
      contractParams: [{ key: "sampler", required: true, type: "string" }],
      runtimeParams: [
        { key: "sampler_name", type: "string" },
        { key: "scheduler", type: "string" },
      ],
    });

    expect(result.normalizedParamMap).toEqual({});
    expect(result.warnings).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "required_unresolved",
        contractKey: "sampler",
      }),
    ]);
  });

  it("does not reuse an already-consumed runtime key through aliases", () => {
    const result = adaptComfyDynamicInputs({
      nodeId: "node-1",
      contractParams: [
        { key: "prompt", required: true, type: "string" },
        { key: "negative_prompt", required: true, type: "string", aliases: ["prompt"] },
      ],
      runtimeParams: [{ key: "prompt", type: "string" }],
    });

    expect(result.normalizedParamMap).toEqual({ prompt: "prompt" });
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: "required_unresolved",
        contractKey: "negative_prompt",
      }),
    ]);
  });
});

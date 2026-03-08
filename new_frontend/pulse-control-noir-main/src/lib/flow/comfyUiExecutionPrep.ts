import {
  adaptComfyDynamicInputs,
  type ComfyAdapterInput,
  type ComfyAdapterError,
  type ComfyAdapterWarning,
} from "@/lib/flow/comfyUiDynamicInputAdapter";

export type ComfyOutputPipelineInput = {
  outputRoot?: string;
  runDate?: string;
  runId?: string;
  nodeId?: string;
};

export type ComfyOutputPipelineContract = {
  outputRoot: string;
  runFolderPath: string;
  watchStrategy: "watch_then_scan";
  scanStrategy: "recursive";
  discoveryMode: "manifest_then_glob";
};

export type ComfyExecutionPrepResult = {
  status: "ready" | "blocked";
  normalizedParamMap: Record<string, string>;
  warnings: ComfyAdapterWarning[];
  errors: ComfyAdapterError[];
  outputPipeline: ComfyOutputPipelineContract;
};

function sanitizePathToken(value: string, fallback: string): string {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function buildOutputPipelineContract(input?: ComfyOutputPipelineInput): ComfyOutputPipelineContract {
  const outputRoot = String(input?.outputRoot || "artifacts/comfyui").trim() || "artifacts/comfyui";
  const normalizedRoot = outputRoot.replace(/[\\/]+$/g, "");
  const runDate = sanitizePathToken(String(input?.runDate || new Date().toISOString().slice(0, 10)), "date");
  const runId = sanitizePathToken(String(input?.runId || "run"), "run");
  const nodeId = sanitizePathToken(String(input?.nodeId || "node"), "node");
  return {
    outputRoot,
    runFolderPath: `${normalizedRoot}/${runDate}/${runId}/${nodeId}`,
    watchStrategy: "watch_then_scan",
    scanStrategy: "recursive",
    discoveryMode: "manifest_then_glob",
  };
}

export function buildComfyExecutionPrep(
  input: ComfyAdapterInput,
  outputInput?: ComfyOutputPipelineInput
): ComfyExecutionPrepResult {
  const adapted = adaptComfyDynamicInputs(input);
  return {
    status: adapted.errors.length > 0 ? "blocked" : "ready",
    normalizedParamMap: adapted.normalizedParamMap,
    warnings: adapted.warnings,
    errors: adapted.errors,
    outputPipeline: buildOutputPipelineContract({
      nodeId: input?.nodeId,
      ...outputInput,
    }),
  };
}

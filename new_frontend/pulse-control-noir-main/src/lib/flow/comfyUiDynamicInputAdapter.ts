export type ComfyValueType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "any";

export type ComfyContractParam = {
  key: string;
  required?: boolean;
  type?: ComfyValueType;
  aliases?: string[];
  defaultValue?: unknown;
};

export type ComfyRuntimeParam = {
  key: string;
  type?: ComfyValueType;
};

export type ComfyAdapterInput = {
  nodeId: string;
  contractParams: ComfyContractParam[];
  runtimeParams: ComfyRuntimeParam[];
  userOverrides?: Record<string, string>;
};

export type ComfyAdapterWarningCode =
  | "alias_match"
  | "fuzzy_type_match"
  | "default_fallback"
  | "override_ignored";

export type ComfyAdapterErrorCode = "required_unresolved";

export type ComfyAdapterWarning = {
  code: ComfyAdapterWarningCode;
  nodeId: string;
  contractKey: string;
  runtimeKey?: string;
  message: string;
};

export type ComfyAdapterError = {
  code: ComfyAdapterErrorCode;
  nodeId: string;
  contractKey: string;
  message: string;
};

export type ComfyDynamicInputAdapterResult = {
  normalizedParamMap: Record<string, string>;
  warnings: ComfyAdapterWarning[];
  errors: ComfyAdapterError[];
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function hasDefaultValue(param: ComfyContractParam): boolean {
  return Object.prototype.hasOwnProperty.call(param, "defaultValue");
}

function typeCompatible(expected: ComfyValueType | undefined, actual: ComfyValueType | undefined): boolean {
  if (!expected || expected === "any") return true;
  if (!actual || actual === "any") return true;
  return expected === actual;
}

export function adaptComfyDynamicInputs(
  input: ComfyAdapterInput
): ComfyDynamicInputAdapterResult {
  const warnings: ComfyAdapterWarning[] = [];
  const errors: ComfyAdapterError[] = [];
  const normalizedParamMap: Record<string, string> = {};

  const runtimeByKey = new Map<string, ComfyRuntimeParam>();
  for (const runtime of input.runtimeParams) {
    runtimeByKey.set(normalizeKey(runtime.key), runtime);
  }

  const consumedRuntimeKeys = new Set<string>();

  for (const contractParam of input.contractParams) {
    const contractKeyNorm = normalizeKey(contractParam.key);

    // 0) explicit user override (must exist in runtime)
    const overrideCandidate = input.userOverrides?.[contractParam.key];
    if (overrideCandidate) {
      const overrideNorm = normalizeKey(overrideCandidate);
      const overrideRuntime = runtimeByKey.get(overrideNorm);
      if (
        overrideRuntime &&
        !consumedRuntimeKeys.has(overrideNorm) &&
        typeCompatible(contractParam.type, overrideRuntime.type)
      ) {
        normalizedParamMap[contractParam.key] = overrideRuntime.key;
        consumedRuntimeKeys.add(overrideNorm);
        continue;
      }

      warnings.push({
        code: "override_ignored",
        nodeId: input.nodeId,
        contractKey: contractParam.key,
        runtimeKey: overrideCandidate,
        message: `Ignored override '${contractParam.key} -> ${overrideCandidate}' because runtime key was missing, already used, or type-incompatible.`,
      });
    }

    // 1) exact key match
    const exact = runtimeByKey.get(contractKeyNorm);
    if (
      exact &&
      !consumedRuntimeKeys.has(contractKeyNorm) &&
      typeCompatible(contractParam.type, exact.type)
    ) {
      normalizedParamMap[contractParam.key] = exact.key;
      consumedRuntimeKeys.add(contractKeyNorm);
      continue;
    }

    // 2) alias match
    const aliases = contractParam.aliases ?? [];
    let aliasMatched = false;
    for (const alias of aliases) {
      const aliasNorm = normalizeKey(alias);
      const aliasRuntime = runtimeByKey.get(aliasNorm);
      if (
        !aliasRuntime ||
        consumedRuntimeKeys.has(aliasNorm) ||
        !typeCompatible(contractParam.type, aliasRuntime.type)
      ) {
        continue;
      }
      normalizedParamMap[contractParam.key] = aliasRuntime.key;
      consumedRuntimeKeys.add(aliasNorm);
      warnings.push({
        code: "alias_match",
        nodeId: input.nodeId,
        contractKey: contractParam.key,
        runtimeKey: aliasRuntime.key,
        message: `Mapped '${contractParam.key}' via alias '${aliasRuntime.key}'.`,
      });
      aliasMatched = true;
      break;
    }
    if (aliasMatched) continue;

    // 3) type-compatible fuzzy fallback (single unambiguous runtime candidate)
    const fuzzyCandidates = input.runtimeParams.filter((runtime) => {
      const runtimeNorm = normalizeKey(runtime.key);
      if (consumedRuntimeKeys.has(runtimeNorm)) return false;
      if (!typeCompatible(contractParam.type, runtime.type)) return false;
      return true;
    });

    if (fuzzyCandidates.length === 1) {
      const candidate = fuzzyCandidates[0];
      normalizedParamMap[contractParam.key] = candidate.key;
      consumedRuntimeKeys.add(normalizeKey(candidate.key));
      warnings.push({
        code: "fuzzy_type_match",
        nodeId: input.nodeId,
        contractKey: contractParam.key,
        runtimeKey: candidate.key,
        message: `Mapped '${contractParam.key}' to '${candidate.key}' by type-compatible fuzzy fallback.`,
      });
      continue;
    }

    // 4) default fallback for non-required params
    if (!contractParam.required && hasDefaultValue(contractParam)) {
      warnings.push({
        code: "default_fallback",
        nodeId: input.nodeId,
        contractKey: contractParam.key,
        message: `No runtime mapping for '${contractParam.key}'; using contract default value.`,
      });
      continue;
    }

    // 5) hard fail for unresolved required params
    if (contractParam.required) {
      errors.push({
        code: "required_unresolved",
        nodeId: input.nodeId,
        contractKey: contractParam.key,
        message: `Required param '${contractParam.key}' could not be resolved.`,
      });
    }
  }

  return {
    normalizedParamMap,
    warnings,
    errors,
  };
}

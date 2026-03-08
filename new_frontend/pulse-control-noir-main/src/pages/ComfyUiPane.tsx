import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ElectronTitleBar from "@/components/ElectronTitleBar";
import { Button } from "@/components/ui/button";

type WorkflowFieldType = "text" | "textarea" | "number" | "select" | "image";

type WorkflowField = {
  key: string;
  label: string;
  type: WorkflowFieldType;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: string | number;
  options?: Array<{ value: string; label: string }>;
};

type WorkflowSchema = {
  id: string;
  label: string;
  description: string;
  fields: WorkflowField[];
};

const WORKFLOW_SCHEMAS: WorkflowSchema[] = [
  {
    id: "txt2img",
    label: "Text to Image",
    description: "Generate an image from a text prompt.",
    fields: [
      { key: "prompt", label: "Prompt", type: "textarea", required: true, placeholder: "cinematic portrait, soft lighting" },
      { key: "negativePrompt", label: "Negative prompt", type: "textarea", placeholder: "blurry, artifacts" },
      { key: "width", label: "Width", type: "number", defaultValue: 1024, min: 256, max: 2048, step: 64 },
      { key: "height", label: "Height", type: "number", defaultValue: 1024, min: 256, max: 2048, step: 64 },
      { key: "steps", label: "Steps", type: "number", defaultValue: 28, min: 1, max: 120 },
      {
        key: "sampler",
        label: "Sampler",
        type: "select",
        defaultValue: "dpmpp_2m",
        options: [
          { value: "dpmpp_2m", label: "DPM++ 2M" },
          { value: "euler", label: "Euler" },
          { value: "euler_a", label: "Euler a" },
        ],
      },
    ],
  },
  {
    id: "img2vid",
    label: "Image to Video",
    description: "Start from a source image and synthesize a short motion clip.",
    fields: [
      { key: "sourceImage", label: "Source image", type: "image", required: true },
      { key: "prompt", label: "Motion prompt", type: "textarea", required: true, placeholder: "camera push-in, subtle wind movement" },
      { key: "frames", label: "Frames", type: "number", defaultValue: 49, min: 8, max: 180 },
      { key: "fps", label: "FPS", type: "number", defaultValue: 12, min: 6, max: 60 },
      { key: "motionBucket", label: "Motion bucket", type: "number", defaultValue: 127, min: 1, max: 255 },
      {
        key: "outputFormat",
        label: "Output format",
        type: "select",
        defaultValue: "mp4",
        options: [
          { value: "mp4", label: "MP4" },
          { value: "webm", label: "WebM" },
          { value: "gif", label: "GIF" },
        ],
      },
    ],
  },
];

export default function ComfyUiPane() {
  const location = useLocation();
  const routeParams = new URLSearchParams(location.search);
  const isStandalone = routeParams.get("standalone") === "1";
  const workflowFromRoute = routeParams.get("workflow") || "";
  const initialWorkflow = WORKFLOW_SCHEMAS.some((schema) => schema.id === workflowFromRoute)
    ? workflowFromRoute
    : WORKFLOW_SCHEMAS[0].id;

  const [selectedWorkflowId, setSelectedWorkflowId] = useState(initialWorkflow);
  const schema = useMemo(
    () => WORKFLOW_SCHEMAS.find((item) => item.id === selectedWorkflowId) || WORKFLOW_SCHEMAS[0],
    [selectedWorkflowId]
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [imageNames, setImageNames] = useState<Record<string, string>>({});

  const setValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const payloadPreview = useMemo(() => {
    const payload: Record<string, unknown> = { workflowId: schema.id };
    for (const field of schema.fields) {
      const raw = values[field.key] ?? "";
      if (!raw && field.defaultValue !== undefined) {
        payload[field.key] = field.defaultValue;
        continue;
      }
      if (!raw) continue;
      if (field.type === "number") {
        const parsed = Number(raw);
        payload[field.key] = Number.isFinite(parsed) ? parsed : raw;
      } else {
        payload[field.key] = raw;
      }
    }
    return payload;
  }, [schema, values]);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {isStandalone ? <ElectronTitleBar title="ComfyUI Pane" /> : null}
      <div className="flex-1 overflow-auto scrollbar-sleek p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <h1 className="text-lg font-semibold">ComfyUI Dedicated Pane</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manual workflow selection with schema-driven input rendering.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-3">
            <label className="text-sm font-medium">Workflow</label>
            <select
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
              value={selectedWorkflowId}
              onChange={(event) => {
                setSelectedWorkflowId(event.target.value);
                setValues({});
                setImageNames({});
              }}
            >
              {WORKFLOW_SCHEMAS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{schema.description}</p>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-4">
            {schema.fields.map((field) => {
              const current = values[field.key] ?? (field.defaultValue != null ? String(field.defaultValue) : "");
              return (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required ? <span className="text-rose-400 ml-1">*</span> : null}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      className="w-full min-h-24 rounded-md border border-border/60 bg-background px-3 py-2 text-sm scrollbar-sleek"
                      placeholder={field.placeholder}
                      value={current}
                      onChange={(event) => setValue(field.key, event.target.value)}
                    />
                  ) : field.type === "select" ? (
                    <select
                      className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                      value={current}
                      onChange={(event) => setValue(field.key, event.target.value)}
                    >
                      {(field.options || []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "image" ? (
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full text-sm"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            setValue(field.key, "");
                            setImageNames((prev) => ({ ...prev, [field.key]: "" }));
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            setValue(field.key, String(reader.result || ""));
                            setImageNames((prev) => ({ ...prev, [field.key]: file.name }));
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      {imageNames[field.key] ? (
                        <p className="text-xs text-muted-foreground">Selected: {imageNames[field.key]}</p>
                      ) : null}
                    </div>
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                      placeholder={field.placeholder}
                      value={current}
                      onChange={(event) => setValue(field.key, event.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Generated input payload</h2>
              <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(payloadPreview, null, 2))}>
                Copy JSON
              </Button>
            </div>
            <pre className="text-xs bg-background/70 border border-border/50 rounded-md p-3 overflow-auto scrollbar-sleek max-h-72">
              {JSON.stringify(payloadPreview, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

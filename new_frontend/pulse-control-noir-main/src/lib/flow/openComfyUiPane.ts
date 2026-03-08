import { sendWindowFling, WINDOW_FLING_MODES, WINDOW_FLING_TARGETS } from "@/lib/windowFling";

type OpenComfyUiPaneOptions = {
  source: string;
  navigate?: (to: string) => void;
  routeQuery?: Record<string, string | number | boolean | null | undefined>;
  flingOptions?: Record<string, unknown>;
};

function buildComfyUiPaneRoute(routeQuery?: OpenComfyUiPaneOptions["routeQuery"]): string {
  const query = new URLSearchParams({ standalone: "1" });
  for (const [key, value] of Object.entries(routeQuery || {})) {
    if (value == null) continue;
    query.set(key, String(value));
  }
  return `/comfyui-pane?${query.toString()}`;
}

export async function openComfyUiPane(options: OpenComfyUiPaneOptions): Promise<void> {
  const route = buildComfyUiPaneRoute(options.routeQuery);
  const flung = sendWindowFling({
    target: WINDOW_FLING_TARGETS.COMFYUI_PANE,
    mode: WINDOW_FLING_MODES.FOCUS_OR_OPEN,
    source: options.source,
    options: {
      ...(options.flingOptions || {}),
      route,
    },
  });
  if (flung) return;

  try {
    if (typeof window.carapace?.openComfyUiPane === "function") {
      await Promise.resolve(window.carapace.openComfyUiPane({ route }));
      return;
    }
  } catch {
    // fall through
  }

  if (typeof options.navigate === "function") {
    options.navigate(route);
    return;
  }
  window.location.href = route;
}

export { buildComfyUiPaneRoute };

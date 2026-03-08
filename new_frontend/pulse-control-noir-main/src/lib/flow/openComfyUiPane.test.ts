import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildComfyUiPaneRoute, openComfyUiPane } from "@/lib/flow/openComfyUiPane";

const { sendWindowFlingMock } = vi.hoisted(() => ({
  sendWindowFlingMock: vi.fn(() => true),
}));

vi.mock("@/lib/windowFling", () => ({
  sendWindowFling: sendWindowFlingMock,
  WINDOW_FLING_MODES: { FOCUS_OR_OPEN: "focus-or-open" },
  WINDOW_FLING_TARGETS: { COMFYUI_PANE: "comfyui-pane" },
}));

describe("openComfyUiPane", () => {
  beforeEach(() => {
    sendWindowFlingMock.mockClear();
  });

  it("builds route with standalone and extra query", () => {
    expect(buildComfyUiPaneRoute({ workflow: "img2vid", quality: "high" })).toBe(
      "/comfyui-pane?standalone=1&workflow=img2vid&quality=high"
    );
  });

  it("uses window fling contract target", async () => {
    await openComfyUiPane({ source: "test", routeQuery: { workflow: "img2vid" } });

    expect(sendWindowFlingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        target: "comfyui-pane",
        options: expect.objectContaining({
          route: "/comfyui-pane?standalone=1&workflow=img2vid",
        }),
      })
    );
  });
});

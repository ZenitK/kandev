import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), search: "sessionId=s1" }));
vi.mock("@/lib/routing/client-router", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(router.search),
}));
vi.mock("@/components/state-provider", () => ({
  useAppStore: (sel: (s: { tasks: { activeTaskId: string } }) => unknown) =>
    sel({ tasks: { activeTaskId: "current" } }),
}));

import { useOpenTaskGraph } from "./use-open-task-graph";

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
});

describe("useOpenTaskGraph", () => {
  it("navigates to another task with the graph requested", () => {
    renderHook(() => useOpenTaskGraph()).result.current("other");
    expect(router.push).toHaveBeenCalledWith("/t/other?panel=task-graph");
  });

  it("requests the graph on the current task without losing its query", () => {
    renderHook(() => useOpenTaskGraph()).result.current("current");
    expect(router.replace).toHaveBeenCalledWith("/t/current?sessionId=s1&panel=task-graph");
    expect(router.push).not.toHaveBeenCalled();
  });
});

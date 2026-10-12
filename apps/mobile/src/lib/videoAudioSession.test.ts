import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  platform: { OS: "ios" as "ios" | "android" },
  release: vi.fn(async (): Promise<void> => {}),
}));
vi.mock("react-native", () => ({ Platform: mocks.platform }));
vi.mock("expo", () => ({
  requireOptionalNativeModule: () => ({ releaseVideoAudioSession: mocks.release }),
}));

let session: typeof import("./videoAudioSession");

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  mocks.platform.OS = "ios";
  mocks.release.mockClear().mockResolvedValue(undefined);
  session = await import("./videoAudioSession");
});

afterEach(() => vi.useRealTimers());

describe("video audio session", () => {
  it("releases the session only when the last playing player stops", () => {
    session.videoPlaybackStarted();
    session.videoPlaybackStarted();
    session.videoPlaybackStopped();
    vi.advanceTimersByTime(1_000);
    expect(mocks.release).not.toHaveBeenCalled();
    session.videoPlaybackStopped();
    expect(mocks.release).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending release when playback restarts", () => {
    session.videoPlaybackStarted();
    session.videoPlaybackStopped();
    session.videoPlaybackStarted();
    vi.advanceTimersByTime(1_000);
    expect(mocks.release).not.toHaveBeenCalled();
    session.videoPlaybackStopped();
    vi.advanceTimersByTime(1_000);
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it("ignores unmatched stops and still releases on a later cycle", () => {
    session.videoPlaybackStopped();
    session.videoPlaybackStopped();
    vi.advanceTimersByTime(1_000);
    expect(mocks.release).not.toHaveBeenCalled();
    session.videoPlaybackStarted();
    session.videoPlaybackStopped();
    vi.advanceTimersByTime(1_000);
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it("leaves the session alone off iOS", () => {
    mocks.platform.OS = "android";
    session.videoPlaybackStarted();
    session.videoPlaybackStopped();
    vi.advanceTimersByTime(1_000);
    expect(mocks.release).not.toHaveBeenCalled();
  });

  it("keeps counting after a failed release", () => {
    mocks.release.mockRejectedValueOnce(new Error("session busy"));
    session.videoPlaybackStarted();
    session.videoPlaybackStopped();
    vi.advanceTimersByTime(1_000);
    session.videoPlaybackStarted();
    session.videoPlaybackStopped();
    vi.advanceTimersByTime(1_000);
    expect(mocks.release).toHaveBeenCalledTimes(2);
  });

  it("tracks overlapping fullscreen presentations for inline pausing", () => {
    const listener = vi.fn();
    const unsubscribe = session.subscribeFullscreenVideo(listener);
    expect(session.isFullscreenVideoOpen()).toBe(false);
    session.fullscreenVideoOpened();
    session.fullscreenVideoOpened();
    session.fullscreenVideoClosed();
    expect(session.isFullscreenVideoOpen()).toBe(true);
    session.fullscreenVideoClosed();
    session.fullscreenVideoClosed();
    expect(session.isFullscreenVideoOpen()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
  });
});

import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

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
  mocks.platform.OS = "ios";
  mocks.release.mockClear().mockResolvedValue(undefined);
  session = await import("./videoAudioSession");
});

describe("video audio session", () => {
  it("releases the session only when the last playing player stops", () => {
    session.videoPlaybackStarted();
    session.videoPlaybackStarted();
    session.videoPlaybackStopped();
    expect(mocks.release).not.toHaveBeenCalled();
    session.videoPlaybackStopped();
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it("ignores unmatched stops and still releases on a later cycle", () => {
    session.videoPlaybackStopped();
    session.videoPlaybackStopped();
    expect(mocks.release).not.toHaveBeenCalled();
    session.videoPlaybackStarted();
    session.videoPlaybackStopped();
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });

  it("leaves the session alone off iOS", () => {
    mocks.platform.OS = "android";
    session.videoPlaybackStarted();
    session.videoPlaybackStopped();
    expect(mocks.release).not.toHaveBeenCalled();
  });

  it("keeps counting after a failed release", () => {
    mocks.release.mockRejectedValueOnce(new Error("session busy"));
    session.videoPlaybackStarted();
    session.videoPlaybackStopped();
    session.videoPlaybackStarted();
    session.videoPlaybackStopped();
    expect(mocks.release).toHaveBeenCalledTimes(2);
  });
});

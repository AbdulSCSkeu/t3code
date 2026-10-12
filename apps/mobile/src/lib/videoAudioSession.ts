import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

interface VideoAudioSessionControls {
  releaseVideoAudioSession(): Promise<void>;
}

// A player that starts right after another stops must not lose the session
// to the pending release, so the native call is deferred and rechecked.
const RELEASE_DELAY_MS = 100;

let playingCount = 0;
let releaseTimer: ReturnType<typeof setTimeout> | undefined;
let nativeControls: VideoAudioSessionControls | null | undefined;

/** Pairs with `videoPlaybackStopped` for each inline player that starts playing. */
export function videoPlaybackStarted(): void {
  playingCount += 1;
  clearTimeout(releaseTimer);
  releaseTimer = undefined;
}

/**
 * expo-video activates the playback session but never deactivates it, so iOS
 * never tells interrupted apps (Spotify, Podcasts) they may resume. The last
 * player to stop releases the session through the native controls module.
 */
export function videoPlaybackStopped(): void {
  if (playingCount === 0) return;
  playingCount -= 1;
  if (playingCount > 0 || Platform.OS !== "ios") return;
  clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    releaseTimer = undefined;
    if (playingCount > 0) return;
    nativeControls ??= requireOptionalNativeModule<VideoAudioSessionControls>("T3NativeControls");
    void nativeControls?.releaseVideoAudioSession().catch(() => undefined);
  }, RELEASE_DELAY_MS);
}

let fullscreenCount = 0;
const fullscreenListeners = new Set<() => void>();

function emitFullscreenChange(): void {
  for (const listener of fullscreenListeners) listener();
}

/** Pairs with `fullscreenVideoClosed` while the native fullscreen player is open. */
export function fullscreenVideoOpened(): void {
  fullscreenCount += 1;
  emitFullscreenChange();
}

export function fullscreenVideoClosed(): void {
  if (fullscreenCount === 0) return;
  fullscreenCount -= 1;
  emitFullscreenChange();
}

/** `useSyncExternalStore` source: inline players pause while fullscreen owns playback. */
export function subscribeFullscreenVideo(listener: () => void): () => void {
  fullscreenListeners.add(listener);
  return () => {
    fullscreenListeners.delete(listener);
  };
}

export function isFullscreenVideoOpen(): boolean {
  return fullscreenCount > 0;
}

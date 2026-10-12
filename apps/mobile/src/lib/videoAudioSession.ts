import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

interface VideoAudioSessionControls {
  releaseVideoAudioSession(): Promise<void>;
}

let playingCount = 0;
let nativeControls: VideoAudioSessionControls | null | undefined;

/** Pairs with `videoPlaybackStopped` for each inline player that starts playing. */
export function videoPlaybackStarted(): void {
  playingCount += 1;
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
  nativeControls ??= requireOptionalNativeModule<VideoAudioSessionControls>("T3NativeControls");
  void nativeControls?.releaseVideoAudioSession().catch(() => undefined);
}

import { Composition } from "remotion";
import { PogoPlatformPromo } from "./pogo-platform-promo";

export const VIDEO_FPS = 30;
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_DURATION_FRAMES = 810;

export const RemotionRoot = () => {
  return (
    <Composition
      id="PogoPlatformPromo"
      component={PogoPlatformPromo}
      durationInFrames={VIDEO_DURATION_FRAMES}
      fps={VIDEO_FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
    />
  );
};

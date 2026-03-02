import { Composition } from "remotion";
import { PromoComposition } from "./PromoComposition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ElementSnapperPromo"
        component={PromoComposition}
        durationInFrames={705} // ~23 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};

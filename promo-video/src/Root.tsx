import { Composition } from "remotion";
import { PromoComposition } from "./PromoComposition";
import {
  Screenshot1Hero,
  Screenshot2Scroll,
  Screenshot3Settings,
  Screenshot4Clipboard,
  StorePromoTile,
} from "./StoreScreenshots";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ElementSnapperPromo"
        component={PromoComposition}
        durationInFrames={727} // ~24 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Screenshot1Hero"
        component={Screenshot1Hero}
        durationInFrames={1}
        fps={30}
        width={1280}
        height={800}
      />
      <Composition
        id="Screenshot2Scroll"
        component={Screenshot2Scroll}
        durationInFrames={1}
        fps={30}
        width={1280}
        height={800}
      />
      <Composition
        id="Screenshot3Settings"
        component={Screenshot3Settings}
        durationInFrames={1}
        fps={30}
        width={1280}
        height={800}
      />
      <Composition
        id="Screenshot4Clipboard"
        component={Screenshot4Clipboard}
        durationInFrames={1}
        fps={30}
        width={1280}
        height={800}
      />
      <Composition
        id="StorePromoTile"
        component={StorePromoTile}
        durationInFrames={1}
        fps={30}
        width={440}
        height={280}
      />
    </>
  );
};

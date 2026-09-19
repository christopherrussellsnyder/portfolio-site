import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { FeaturesVideo } from "./FeaturesVideo";
import { InterfaceVideo } from "./InterfaceVideo";
import { InterfaceVideoV2 } from "./InterfaceVideoV2";
import { InterfaceVideoV3 } from "./InterfaceVideoV3";
import { InterfaceVideoV4 } from "./InterfaceVideoV4";
import { DemoTour, DEMO_TOUR_DURATION } from "./DemoTour";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="main" component={MainVideo} durationInFrames={483} fps={30} width={1920} height={1080} />
    <Composition id="features" component={FeaturesVideo} durationInFrames={820} fps={30} width={1920} height={1080} />
    <Composition id="interface" component={InterfaceVideo} durationInFrames={837} fps={30} width={1920} height={1080} />
    {/* V2: 80+160+150+140+140+130=800 - (15+22+22+22+20)=101 = 699 */}
    <Composition id="interface-v2" component={InterfaceVideoV2} durationInFrames={699} fps={30} width={1920} height={1080} />
    {/* V3: 80+170+170+150+140+130=840 - 101 = 739 */}
    <Composition id="interface-v3" component={InterfaceVideoV3} durationInFrames={739} fps={30} width={1920} height={1080} />
    {/* V4: 80+140+140+150+150+140+130=930 - (15+22+22+22+22+20)=123 = 807 */}
    <Composition id="interface-v4" component={InterfaceVideoV4} durationInFrames={807} fps={30} width={1920} height={1080} />
    <Composition id="demo-tour" component={DemoTour} durationInFrames={DEMO_TOUR_DURATION} fps={30} width={1280} height={720} />
  </>
);

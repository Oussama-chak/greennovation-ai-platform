import type { WallBook } from "../types";
import { Candle } from "./Candle";
import { Ladder } from "./Ladder";
import { Lanterns } from "./Lanterns";
import { Rug } from "./Rug";
import { Wall } from "./Wall";
import { NookStage } from "./stages/NookStage";

type Props = {
  books: WallBook[];
  stage: 1 | 2 | 3;
  candleLevel: number;
  reducedMotion?: boolean;
};

export function Room({ books, stage, candleLevel, reducedMotion }: Props) {
  return (
    <group>
      {/* Stage 1 always; later stages expand around it */}
      <NookStage />
      <Rug />
      <Lanterns reducedMotion={reducedMotion} />
      <Ladder />
      <Candle level={candleLevel} reducedMotion={reducedMotion} />
      <Wall books={books} reducedMotion={reducedMotion} />

      {/* Stage placeholders (wired in steps 7–8) */}
      {stage >= 2 && null}
      {stage >= 3 && null}
    </group>
  );
}

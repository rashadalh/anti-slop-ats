import human from "../fixtures/packs/human_slow_fill.json" with { type: "json" };
import bot from "../fixtures/packs/bot_burst.json" with { type: "json" };
import ai from "../fixtures/packs/human_ai_essays.json" with { type: "json" };
import placeholder from "../fixtures/packs/placeholder_bot.json" with { type: "json" };
import { scoreApplication } from "../packages/scorer/src/index.ts";
import type { ReplayPack } from "../packages/scorer/src/types.ts";

const packs: ReplayPack[] = [human, bot, ai, placeholder] as ReplayPack[];

let failed = false;
for (const pack of packs) {
  const det = await scoreApplication(pack.input);
  if (det.label !== pack.expected_label) {
    console.error(
      `${pack.id}: expected label ${pack.expected_label}, got ${det.label} (p=${det.probability})`,
    );
    failed = true;
  } else {
    console.log(`${pack.id}: ok label=${det.label} p=${det.probability.toFixed(3)}`);
  }
}
process.exit(failed ? 1 : 0);

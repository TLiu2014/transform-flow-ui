// Regenerates the schema-only `*.ai.json` companions from each `*.ui.json`.
// Mirrors `toAISchema` from the lib: drops `version`, `pipeline`, `layout`,
// per-stage `color`, and per-stage `displayType`.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const samplesDir = join(here, "..", "samples");

let count = 0;
for (const f of readdirSync(samplesDir)) {
  if (!f.endsWith(".ui.json")) continue;
  const ui = JSON.parse(readFileSync(join(samplesDir, f), "utf8"));
  const ai = {
    datasets: ui.datasets,
    stages: ui.stages.map(({ color, displayType, ...rest }) => rest),
  };
  const outName = f.replace(/\.ui\.json$/, ".ai.json");
  writeFileSync(
    join(samplesDir, outName),
    JSON.stringify(ai, null, 2) + "\n",
  );
  count++;
}
console.log(`Regenerated ${count} .ai.json file(s) in ${samplesDir}`);

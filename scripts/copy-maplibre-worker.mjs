// MapLibre v6 resolves its web worker relative to its own bundle URL, which
// breaks once Turbopack renames chunks. Ship the worker (and the shared chunk
// it imports) as static files instead; TourMap points setWorkerUrl() at them.
import { copyFileSync, existsSync, mkdirSync } from "fs";

const src = "node_modules/maplibre-gl/dist";
const dest = "public/maplibre";
if (!existsSync(src)) process.exit(0);
mkdirSync(dest, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(`${src}/${f}`, `${dest}/${f}`);
console.log("maplibre worker copied to public/maplibre");

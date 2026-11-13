import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = new URL("../src/", import.meta.url);

export async function resolve(specifier, context, next) {
  let target = specifier;
  if (specifier.startsWith("@/")) target = new URL(specifier.slice(2), SRC).href;
  else if (specifier.startsWith(".") && context.parentURL) target = new URL(specifier, context.parentURL).href;
  else return next(specifier, context);
  const path = fileURLToPath(target);
  for (const candidate of [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`]) {
    if (existsSync(candidate) && !candidate.endsWith("/")) {
      try {
        return next(pathToFileURL(candidate).href, context);
      } catch {
        /* try next candidate */
      }
    }
  }
  return next(specifier, context);
}

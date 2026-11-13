// Resolves the "@/…" alias and extensionless imports for `node --test` (no extra dependencies).
import { register } from "node:module";

register("./resolve.mjs", import.meta.url);

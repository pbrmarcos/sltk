// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// BUILD_TARGET=node → emite bundle Node SSR em `.output/` (preset nitro `node-server`)
// para self-host (Coolify/Docker). Sem essa flag, mantém o default da Lovable
// (cloudflare-module) usado na publicação oficial.
const buildTarget = process.env.BUILD_TARGET;

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  ...(buildTarget === "node"
    ? {
        nitro: {
          preset: "node-server",
          output: {
            dir: ".output",
            serverDir: ".output/server",
            publicDir: ".output/public",
          },
        },
      }
    : {}),
});

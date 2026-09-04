// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

// BUILD_TARGET=node → emite bundle Node SSR em `.output/` (preset nitro `node-server`)
// para self-host (Coolify/Docker). Sem essa flag, mantém o default da Lovable
// (cloudflare-module) usado na publicação oficial.
const buildTarget = process.env.BUILD_TARGET;

// @lovable.dev/mcp-js compares its routesDir against a POSIX-style project
// root without normalizing separators, so it throws on Windows (see
// node_modules/@lovable.dev/mcp-js/dist/stacks/tanstack/vite.js assertContains).
// The MCP routes only serve Lovable's own editor tooling — safe to skip
// outside Linux (Lovable's sandbox and the Coolify/Docker build are both Linux).
const mcpPlugins = process.platform === "win32" ? [] : [mcpPlugin()];

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: { plugins: mcpPlugins },
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

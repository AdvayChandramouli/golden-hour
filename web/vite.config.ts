import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(webRoot, "../data");

function serveRepoData(): Plugin {
  return {
    name: "serve-repo-data",
    configureServer(server) {
      server.middlewares.use("/data", (req, res, next) => {
        if (!req.url) {
          next();
          return;
        }
        const relative = path
          .normalize(req.url.split("?")[0] ?? "")
          .replace(/^[/\\]+/, "");
        const file = path.resolve(dataDir, relative);
        if (
          !file.startsWith(dataDir + path.sep) ||
          !fs.existsSync(file) ||
          !fs.statSync(file).isFile()
        ) {
          next();
          return;
        }
        const type = file.endsWith(".geojson")
          ? "application/geo+json; charset=utf-8"
          : "application/json; charset=utf-8";
        res.setHeader("Content-Type", type);
        fs.createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      const dest = path.resolve(webRoot, "dist/data");
      fs.mkdirSync(dest, { recursive: true });
      const geojson = path.join(dataDir, "spots.geojson");
      if (fs.existsSync(geojson)) {
        fs.copyFileSync(geojson, path.join(dest, "spots.geojson"));
      }
    },
  };
}

export default defineConfig({
  plugins: [serveRepoData()],
});

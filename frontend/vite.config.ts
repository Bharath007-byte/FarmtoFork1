import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import type { Connect } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const heroMp4 = path.join(rootDir, "public/hero-hd.mp4");

function serveHeroVideo(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = req.url?.split("?")[0];
    if (url !== "/hero-hd.mp4" && url !== "/hero-hd.m4v") {
      next();
      return;
    }
    if (!fs.existsSync(heroMp4)) {
      next();
      return;
    }
    const st = fs.statSync(heroMp4);
    const range = req.headers.range;
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");
    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      const start = match?.[1] ? Number(match[1]) : 0;
      const end = match?.[2] ? Number(match[2]) : st.size - 1;
      res.statusCode = 206;
      res.setHeader("Content-Range", `bytes ${start}-${end}/${st.size}`);
      res.setHeader("Content-Length", String(end - start + 1));
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      fs.createReadStream(heroMp4, { start, end }).pipe(res);
      return;
    }
    res.setHeader("Content-Length", String(st.size));
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(heroMp4).pipe(res);
  };
}

export default defineConfig({
  plugins: [
    {
      name: "serve-hero-hd",
      configureServer(server) {
        server.middlewares.use(serveHeroVideo());
      },
      configurePreviewServer(server) {
        server.middlewares.use(serveHeroVideo());
      },
    },
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("error", (_err, _req, res) => {
            const r = res as { writeHead?: (c: number, h: object) => void; end?: (s: string) => void; headersSent?: boolean };
            if (r.headersSent) return;
            r.writeHead?.(503, { "Content-Type": "application/json" });
            r.end?.(
              JSON.stringify({
                error:
                  "API offline. Start PostgreSQL, then from /server run npm run dev (port 8787).",
              })
            );
          });
        },
      },
      "/uploads": { target: "http://127.0.0.1:8787", changeOrigin: true },
      "/socket.io": { target: "http://127.0.0.1:8787", ws: true, changeOrigin: true },
    },
  },
});

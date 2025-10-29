import { join } from "path";

const root = join(import.meta.dir, "src");

const server = Bun.serve({
  port: 3000,
  // Static-Server für ./src
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // Path Traversal verhindern
    if (pathname.includes("..")) {
      return new Response("Not found", { status: 404 });
    }

    // Root -> index.html
    if (pathname === "/") pathname = "/index.html";

    const filePath = join(root, pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    // Optional: SPA-Fallback (falls du später Routen hast)
    // return new Response(Bun.file(join(root, "index.html")));

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Server running on ${server.url}`);

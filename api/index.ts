export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname === "/" ? "/src/index.html" : `/src${url.pathname}`;

    try {
      // Liefere statische Dateien aus /src
      const file = Bun.file(`.${path}`);
      if (await file.exists()) {
        const ext = path.split(".").pop()?.toLowerCase();
        const types: Record<string, string> = {
          html: "text/html",
          css: "text/css",
          js: "application/javascript",
          json: "application/json",
        };
        return new Response(await file.text(), {
          headers: { "Content-Type": types[ext!] || "text/plain" },
        });
      }

      return new Response("Not found", { status: 404 });
    } catch {
      return new Response("Error", { status: 500 });
    }
  },
};

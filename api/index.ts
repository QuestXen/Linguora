// api/index.ts
export const config = {
  runtime: "edge",
};

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname === "/" ? "/index.html" : url.pathname;
  const fileUrl = new URL(`../src${path}`, import.meta.url);

  try {
    const file = await fetch(fileUrl);
    if (file.ok) return file;
    return new Response("Not found", { status: 404 });
  } catch {
    return new Response("Error", { status: 500 });
  }
}

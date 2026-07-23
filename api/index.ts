import startServer from "../server";

let cachedApp: any = null;

export default async function handler(req: any, res: any) {
  try {
    if (!cachedApp) {
      cachedApp = await startServer();
    }

    // Ensure req.url has /api prefix if missing (Vercel rewrite normalization)
    if (req.url && !req.url.startsWith("/api")) {
      req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
    }

    return cachedApp(req, res);
  } catch (err: any) {
    console.error("Lỗi Vercel API Handler:", err);
    return res.status(500).json({ 
      error: "Lỗi máy chủ backend: " + (err?.message || String(err)) 
    });
  }
}

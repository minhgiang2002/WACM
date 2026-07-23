import startServer from "../server";

let cachedApp: any = null;

export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    cachedApp = await startServer();
  }

  // Preserve requested route for Express matching when running on Vercel
  if (req.query && req.query.path) {
    const rawPath = Array.isArray(req.query.path) ? req.query.path.join("/") : req.query.path;
    req.url = rawPath.startsWith("/") ? `/api${rawPath}` : `/api/${rawPath}`;
  } else if (req.headers && req.headers["x-forwarded-uri"]) {
    req.url = req.headers["x-forwarded-uri"] as string;
  } else if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }

  return cachedApp(req, res);
}

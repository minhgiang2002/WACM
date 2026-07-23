import startServer from "../server";

let cachedApp: any = null;

export default async function handler(req: any, res: any) {
  try {
    if (!cachedApp) {
      cachedApp = await startServer({ listen: false });
    }

    // Reconstruct requested API URL from Vercel rewrite parameter
    let targetPath = req.url || "/api";

    if (req.query && req.query.path) {
      const rawPathParam = req.query.path;
      const pathStr = Array.isArray(rawPathParam) ? rawPathParam.join("/") : String(rawPathParam);
      
      // Clean up 'path' parameter from req.query so Express routes get clean query params
      const { path: _, ...restQuery } = req.query;
      req.query = restQuery;

      const qParams = new URLSearchParams();
      for (const [k, v] of Object.entries(restQuery)) {
        if (Array.isArray(v)) {
          v.forEach(val => qParams.append(k, String(val)));
        } else if (v !== undefined && v !== null) {
          qParams.append(k, String(v));
        }
      }
      const queryString = qParams.toString();
      targetPath = `/api/${pathStr.replace(/^\/+/, "")}${queryString ? `?${queryString}` : ""}`;
    } else if (req.headers && req.headers["x-forwarded-uri"]) {
      targetPath = req.headers["x-forwarded-uri"] as string;
    } else if (req.headers && req.headers["x-matched-path"] && req.headers["x-matched-path"] !== "/api/index") {
      targetPath = req.headers["x-matched-path"] as string;
    }

    if (!targetPath.startsWith("/api")) {
      targetPath = `/api${targetPath.startsWith("/") ? "" : "/"}${targetPath}`;
    }

    req.url = targetPath;
    req.originalUrl = targetPath;
    delete req._parsedUrl;
    delete req._parsedUrlAndQuery;

    return cachedApp(req, res);
  } catch (err: any) {
    console.error("Lỗi Vercel API Handler:", err);
    return res.status(500).json({ 
      error: "Lỗi máy chủ backend: " + (err?.message || String(err)) 
    });
  }
}

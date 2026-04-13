import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename);

// In-memory data store
interface UserData {
  ip: string;
  userAgent: string;
  lastSeen: number;
  requestCount: number;
  limit: number;
}
const users = new Map<string, UserData>();
let adminCredentials = { username: 'admin', password: 'password' };
let adminToken = crypto.randomBytes(16).toString('hex');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Tracking and Rate Limiting Middleware
  app.use((req, res, next) => {
    // Skip static files and vite internal
    if (req.path.startsWith('/@') || req.path.startsWith('/src') || req.path.startsWith('/node_modules') || req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
      return next();
    }
    
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (Array.isArray(ip)) ip = ip[0];
    const userAgent = req.headers['user-agent'] || 'unknown';
    const key = ip as string;

    if (!users.has(key)) {
      users.set(key, { ip: key, userAgent, lastSeen: Date.now(), requestCount: 0, limit: 100 });
    }
    
    const user = users.get(key)!;
    user.lastSeen = Date.now();
    user.userAgent = userAgent;
    
    // Only count API requests towards the limit (exclude admin API)
    if (req.path.startsWith('/api/') && !req.path.startsWith('/api/admin')) {
      user.requestCount++;
      if (user.limit > 0 && user.requestCount > user.limit) {
        return res.status(429).json({ error: "Limit request tercapai. Silakan hubungi admin." });
      }
    }
    
    next();
  });

  // Admin API Routes
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    if (username === adminCredentials.username && password === adminCredentials.password) {
      res.json({ success: true, token: adminToken });
    } else {
      res.status(401).json({ success: false, error: "Username atau password salah" });
    }
  });

  // Middleware to check admin token
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token === adminToken) {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  app.get("/api/admin/users", requireAdmin, (req, res) => {
    // Clean up old users (not seen in 24 hours)
    const now = Date.now();
    for (const [key, user] of users.entries()) {
      if (now - user.lastSeen > 24 * 60 * 60 * 1000) {
        users.delete(key);
      }
    }
    res.json(Array.from(users.values()));
  });

  app.post("/api/admin/users/limit", requireAdmin, (req, res) => {
    const { ip, limit } = req.body;
    if (users.has(ip)) {
      users.get(ip)!.limit = Number(limit);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.post("/api/admin/users/delete", requireAdmin, (req, res) => {
    const { ip } = req.body;
    if (users.has(ip)) {
      users.delete(ip);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.post("/api/admin/settings", requireAdmin, (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
      adminCredentials = { username, password };
      // Generate new token to force re-login
      adminToken = crypto.randomBytes(16).toString('hex');
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Username and password are required" });
    }
  });

  // API Routes
  app.get("/api/gimage", async (req, res) => {
    const { query, apikey } = req.query;
    
    if (!query || !apikey) {
      return res.status(400).json({ error: "Query and apikey are required" });
    }

    try {
      const targetUrl = `https://api.ferdev.my.id/search/gimage?query=${encodeURIComponent(query as string)}&apikey=${encodeURIComponent(apikey as string)}`;
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Filter Data: Tambahkan logika untuk mendeteksi video
      if (data.success && Array.isArray(data.result)) {
        data.result = data.result.map((item: any) => {
          const urlStr = (item.url || "").toLowerCase();
          const isVideo = urlStr.includes("tiktok") || urlStr.includes("video");
          return {
            ...item,
            is_video: isVideo
          };
        });
      }

      res.json(data);
    } catch (error: any) {
      console.error("Error fetching gimage results:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Tokopedia API Route
  app.get("/api/tokopedia", async (req, res) => {
    const { query, apikey } = req.query;
    
    if (!query || !apikey) {
      return res.status(400).json({ error: "Query and apikey are required" });
    }

    try {
      const targetUrl = `https://api.ferdev.my.id/search/tokopedia?query=${encodeURIComponent(query as string)}&apikey=${encodeURIComponent(apikey as string)}`;
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching tokopedia results:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // TikTok Search API Route
  app.get("/api/search-tiktok", async (req, res) => {
    const { query, apikey } = req.query;
    
    if (!query || !apikey) {
      return res.status(400).json({ error: "Query and apikey are required" });
    }

    try {
      const targetUrl = `https://api.ferdev.my.id/search/tiktok?query=${encodeURIComponent(query as string)}&apikey=${encodeURIComponent(apikey as string)}`;
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      });

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching TikTok search results:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Downloader API Route
  app.get("/api/downloader", async (req, res) => {
    const { link, apikey } = req.query;
    
    if (!link || !apikey) {
      return res.status(400).json({ error: "Link and apikey are required" });
    }

    try {
      // First try allinone endpoint
      let targetUrl = `https://api.ferdev.my.id/downloader/allinone?link=${encodeURIComponent(link as string)}&apikey=${encodeURIComponent(apikey as string)}`;
      let response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json"
        }
      });

      let data = await response.json();

      // If allinone fails and it's a tiktok link, try the tiktok specific endpoint
      const linkStr = link as string;
      if (!data.success && (linkStr.includes('tiktok.com') || linkStr.includes('vt.tiktok.com'))) {
        targetUrl = `https://api.ferdev.my.id/downloader/tiktok?link=${encodeURIComponent(linkStr)}&apikey=${encodeURIComponent(apikey as string)}`;
        response = await fetch(targetUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json"
          }
        });
        data = await response.json();
      }

      res.json(data);
    } catch (error: any) {
      console.error("Error fetching downloader results:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Image Proxy Route
  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;
    
    if (!imageUrl) {
      return res.status(400).send("Missing image URL");
    }

    try {
      let finalImageUrl = imageUrl;

      // Handle TikTok api/img URLs
      if (imageUrl.includes('tiktok.com/api/img/') && imageUrl.includes('itemId=')) {
        const match = imageUrl.match(/itemId=(\d+)/);
        if (match && match[1]) {
          const itemId = match[1];
          const oembedUrl = `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@user/video/${itemId}`;
          try {
            const oembedRes = await fetch(oembedUrl);
            if (oembedRes.ok) {
              const oembedData = await oembedRes.json();
              if (oembedData && oembedData.thumbnail_url) {
                finalImageUrl = oembedData.thumbnail_url;
                // Redirect to the real CDN URL which doesn't have CORS issues
                return res.redirect(finalImageUrl);
              }
            }
          } catch (e) {
            console.error("Error fetching oembed for TikTok image:", e);
          }
        }
      }

      const response = await fetch(finalImageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.tiktok.com/"
        }
      });

      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error("Error proxying image:", error);
      res.status(500).send(error.message);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

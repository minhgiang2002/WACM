import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { diffLines } from "diff";

// Interfaces
interface Target {
  id: string;
  name: string;
  url: string;
  type: 'css' | 'js' | 'html' | 'webpage';
  userAgent: string;
  headers: string; // JSON string
  lastScanned: string | null;
  lastHash: string | null;
  status: 'active' | 'paused';
  error: string | null;
  createdAt: string;
}

interface Scan {
  id: string;
  targetId: string;
  timestamp: string;
  hash: string;
  content: string; // Beautified/formatted content
  isChange: boolean;
  addedLines: number;
  deletedLines: number;
  status: 'success' | 'failed';
  errorMessage: string | null;
  aiAnalysis?: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    summary: string;
    details: string;
    analyzedAt: string;
  } | null;
}

interface Settings {
  telegramToken: string;
  telegramChatId: string;
  slackWebhook: string;
  enableAutoAI: boolean;
  scanIntervalHours: number;
}

interface DB {
  targets: Target[];
  scans: Scan[];
  settings: Settings;
  logs: { timestamp: string; message: string; type: 'info' | 'warn' | 'error' }[];
}

const DB_PATH = process.env.VERCEL ? "/tmp/db.json" : path.join(process.cwd(), "db.json");

// Helper class for database management
class DbHelper {
  private static defaultDb: DB = {
    targets: [
      {
        id: "target-1",
        name: "Tailwind CSS CDN Stylesheet",
        url: "https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css",
        type: "css",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebAssetChangeMonitor/1.0",
        headers: "{}",
        lastScanned: null,
        lastHash: null,
        status: "active",
        error: null,
        createdAt: new Date().toISOString()
      },
      {
        id: "target-2",
        name: "Lucide Icons CDN Script",
        url: "https://unpkg.com/lucide@0.244.0/dist/umd/lucide.min.js",
        type: "js",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebAssetChangeMonitor/1.0",
        headers: "{}",
        lastScanned: null,
        lastHash: null,
        status: "active",
        error: null,
        createdAt: new Date().toISOString()
      }
    ],
    scans: [],
    settings: {
      telegramToken: "",
      telegramChatId: "",
      slackWebhook: "",
      enableAutoAI: false,
      scanIntervalHours: 12
    },
    logs: [
      {
        timestamp: new Date().toISOString(),
        message: "Hệ thống khởi tạo cơ sở dữ liệu giám sát tài nguyên thành công.",
        type: "info"
      }
    ]
  };

  static read(): DB {
    try {
      if (!fs.existsSync(DB_PATH)) {
        const seedPath = path.join(process.cwd(), "db.json");
        if (process.env.VERCEL && fs.existsSync(seedPath)) {
          try {
            fs.copyFileSync(seedPath, DB_PATH);
          } catch (e) {
            DbHelper.write(DbHelper.defaultDb);
            return JSON.parse(JSON.stringify(DbHelper.defaultDb));
          }
        } else {
          DbHelper.write(DbHelper.defaultDb);
          return JSON.parse(JSON.stringify(DbHelper.defaultDb));
        }
      }
      const data = fs.readFileSync(DB_PATH, "utf8");
      if (!data || !data.trim()) {
        DbHelper.write(DbHelper.defaultDb);
        return JSON.parse(JSON.stringify(DbHelper.defaultDb));
      }
      const db = JSON.parse(data);
      // Ensure arrays and objects exist
      if (!Array.isArray(db.targets)) db.targets = [];
      if (!Array.isArray(db.scans)) db.scans = [];
      if (!db.settings) db.settings = { ...DbHelper.defaultDb.settings };
      if (!Array.isArray(db.logs)) db.logs = [];
      return db;
    } catch (e) {
      console.error("Lỗi đọc file db.json, khởi tạo lại mặc định:", e);
      return JSON.parse(JSON.stringify(DbHelper.defaultDb));
    }
  }

  static write(db: DB) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
    } catch (e) {
      console.error("Lỗi ghi file db.json:", e);
    }
  }

  static addLog(message: string, type: 'info' | 'warn' | 'error' = 'info') {
    const db = DbHelper.read();
    db.logs.unshift({
      timestamp: new Date().toISOString(),
      message,
      type
    });
    // Keep logs size reasonable (e.g. 100 max)
    if (db.logs.length > 100) {
      db.logs = db.logs.slice(0, 100);
    }
    DbHelper.write(db);
  }
}

// Code formatter to keep diffs beautiful and avoid false alerts
function formatCode(content: string, type: string): string {
  if (!content) return "";
  try {
    if (type === 'css') {
      return content
        .replace(/\s+/g, ' ')
        .replace(/\{/g, ' {\n  ')
        .replace(/\}/g, '\n}\n')
        .replace(/;/g, ';\n  ')
        .replace(/\s*,\s*/g, ', ')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
    } else if (type === 'js') {
      return content
        .replace(/([;{}])/g, '$1\n')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
    } else if (type === 'html' || type === 'webpage') {
      // Basic formatting formatting for HTML tags
      return content
        .replace(/(<[a-zA-Z0-9="'-:\s/]+>)/g, '\n$1\n')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
    }
  } catch (err) {
    console.error("Lỗi định dạng mã:", err);
  }
  return content;
}

// Notification alerting helper
async function sendNotification(settings: Settings, targetName: string, targetUrl: string, added: number, deleted: number) {
  const messageText = `⚠️ [WACM] PHÁT HIỆN THAY ĐỔI TÀI NGUYÊN WEB!\n\n` +
    `• Mục tiêu: *${targetName}*\n` +
    `• URL: ${targetUrl}\n` +
    `• Biến đổi: Dòng thêm (+${added}), Dòng xóa (-${deleted})\n` +
    `• Thời gian: ${new Date().toLocaleString("vi-VN")}\n\n` +
    `Vui lòng truy cập trang quản trị để xem chi tiết so sánh và phân tích bảo mật AI.`;

  // Send to Telegram
  if (settings.telegramToken && settings.telegramChatId) {
    try {
      const telegramUrl = `https://api.telegram.org/bot${settings.telegramToken}/sendMessage`;
      await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text: messageText,
          parse_mode: 'Markdown'
        })
      });
      DbHelper.addLog(`Đã gửi cảnh báo Telegram thành công cho mục tiêu "${targetName}"`);
    } catch (err: any) {
      DbHelper.addLog(`Lỗi gửi cảnh báo Telegram: ${err.message}`, 'error');
    }
  }

  // Send to Slack
  if (settings.slackWebhook) {
    try {
      await fetch(settings.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `⚠️ *[WACM] PHÁT HIỆN THAY ĐỔI TÀI NGUYÊN WEB!*\n\n• *Mục tiêu:* ${targetName}\n• *URL:* ${targetUrl}\n• *Biến đổi:* +${added} dòng mới / -${deleted} dòng cũ\n• *Thời gian:* ${new Date().toLocaleString("vi-VN")}\n\n_Truy cập trang quản trị để xem chi tiết so sánh & phân tích bảo mật._`
        })
      });
      DbHelper.addLog(`Đã gửi cảnh báo Slack thành công cho mục tiêu "${targetName}"`);
    } catch (err: any) {
      DbHelper.addLog(`Lỗi gửi cảnh báo Slack: ${err.message}`, 'error');
    }
  }
}

// Perform active scan for a target
async function scanTarget(targetId: string, geminiClient?: GoogleGenAI): Promise<Scan> {
  const db = DbHelper.read();
  const targetIndex = db.targets.findIndex(t => t.id === targetId);
  if (targetIndex === -1) {
    throw new Error("Không tìm thấy mục tiêu");
  }

  const target = db.targets[targetIndex];
  const timestamp = new Date().toISOString();

  // Initialize Scan record
  const scanRecord: Scan = {
    id: "scan-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
    targetId: target.id,
    timestamp,
    hash: "",
    content: "",
    isChange: false,
    addedLines: 0,
    deletedLines: 0,
    status: 'success',
    errorMessage: null
  };

  try {
    DbHelper.addLog(`Đang bắt đầu quét mục tiêu: "${target.name}" (${target.url})`);

    // Setup headers
    const customHeaders: Record<string, string> = {};
    if (target.headers) {
      try {
        const parsed = JSON.parse(target.headers);
        Object.assign(customHeaders, parsed);
      } catch (err) {
        console.warn("Lỗi phân tích headers tùy chọn cho", target.name);
      }
    }
    if (target.userAgent) {
      customHeaders["User-Agent"] = target.userAgent;
    }

    // Fetch content
    const response = await fetch(target.url, {
      headers: customHeaders,
      signal: AbortSignal.timeout(15000) // 15s timeout
    });

    if (!response.ok) {
      throw new Error(`Mã lỗi HTTP: ${response.status} ${response.statusText}`);
    }

    const rawText = await response.text();
    if (!rawText) {
      throw new Error("Nội dung tải về rỗng");
    }

    // Preprocess / Beautify
    const formatted = formatCode(rawText, target.type);

    // Hash content
    const hash = crypto.createHash('sha256').update(formatted).digest('hex');
    scanRecord.hash = hash;
    scanRecord.content = formatted;

    // Check if there was a change compared to last scanned successful hash
    let wasChange = false;
    let added = 0;
    let deleted = 0;
    let lastSuccessScan: Scan | null = null;

    if (target.lastHash && target.lastHash !== hash) {
      // Find the last successful scan
      lastSuccessScan = db.scans
        .filter(s => s.targetId === target.id && s.status === 'success')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      if (lastSuccessScan) {
        wasChange = true;
        scanRecord.isChange = true;

        // Compute line-by-line diff stats
        const diffs = diffLines(lastSuccessScan.content, formatted);
        diffs.forEach(part => {
          if (part.added) added += part.count || 0;
          if (part.removed) deleted += part.count || 0;
        });

        scanRecord.addedLines = added;
        scanRecord.deletedLines = deleted;
      }
    }

    // Update target
    target.lastScanned = timestamp;
    target.lastHash = hash;
    target.error = null;

    DbHelper.addLog(`Quét thành công mục tiêu: "${target.name}". Hash mới: ${hash.substring(0, 10)}... ${wasChange ? "⚠️ PHÁT HIỆN THAY ĐỔI" : "✓ Không thay đổi"}`);

    // If change is detected, trigger notifications and optionally AI Analysis
    if (wasChange) {
      // 1. Send alerts
      await sendNotification(db.settings, target.name, target.url, added, deleted);

      // 2. Perform auto AI Analysis if enabled
      if (db.settings.enableAutoAI && geminiClient && lastSuccessScan) {
        try {
          DbHelper.addLog(`Đang thực hiện phân tích an ninh AI tự động cho mục tiêu "${target.name}"`);
          const aiResult = await runAiAnalysisOnDiff(lastSuccessScan.content, formatted, target.type, geminiClient);
          scanRecord.aiAnalysis = aiResult;
        } catch (aiErr: any) {
          console.error("Lỗi phân tích AI tự động:", aiErr);
          DbHelper.addLog(`Lỗi phân tích an ninh AI tự động: ${aiErr.message}`, 'warn');
        }
      }
    }

  } catch (err: any) {
    console.error(`Lỗi quét mục tiêu ${target.name}:`, err);
    scanRecord.status = 'failed';
    scanRecord.errorMessage = err.message || "Lỗi kết nối không xác định";
    target.lastScanned = timestamp;
    target.error = scanRecord.errorMessage;
    DbHelper.addLog(`Quét thất bại mục tiêu "${target.name}": ${scanRecord.errorMessage}`, 'error');
  }

  // Store scan record
  db.scans.push(scanRecord);

  // Prune scan history per target to avoid bloated JSON
  const maxHistory = 15;
  const targetScans = db.scans.filter(s => s.targetId === target.id);
  if (targetScans.length > maxHistory) {
    const sorted = targetScans.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const toDeleteIds = sorted.slice(0, sorted.length - maxHistory).map(s => s.id);
    db.scans = db.scans.filter(s => !toDeleteIds.includes(s.id));
  }

  // Save changes to DB
  db.targets[targetIndex] = target;
  DbHelper.write(db);

  return scanRecord;
}

// Analyze the code differences using Gemini
async function runAiAnalysisOnDiff(oldContent: string, newContent: string, type: string, ai: GoogleGenAI) {
  // Extract a summarized diff block to stay within token limits and focus on actual changes
  const diffs = diffLines(oldContent, newContent);
  let diffSample = "";
  let linesCounter = 0;

  for (const part of diffs) {
    if (part.added || part.removed) {
      const prefix = part.added ? "+ " : "- ";
      const formattedLines = part.value.split('\n')
        .map(l => prefix + l)
        .join('\n');
      diffSample += formattedLines + "\n";
      linesCounter += part.count || 0;
      if (diffSample.length > 8000) {
        diffSample += "... [Nội dung quá dài, lược bớt] ...\n";
        break;
      }
    }
  }

  if (!diffSample.trim()) {
    return {
      riskLevel: 'LOW' as const,
      summary: "Không tìm thấy dòng thay đổi cụ thể để phân tích.",
      details: "Hệ thống xác định cấu trúc file không đổi hoặc chỉ có khoảng trắng thay đổi.",
      analyzedAt: new Date().toISOString()
    };
  }

  const prompt = `Bạn là một chuyên gia cao cấp về an ninh mạng, rà soát mã độc và phân tích mã nguồn.
Nhiệm vụ của bạn là phân tích sự thay đổi trong một tài nguyên web (${type.toUpperCase()}) và đánh giá mức độ rủi ro bảo mật (XSS injection, backdoor, chèn script quảng cáo độc hại, chuyển hướng độc hại, hoặc thay đổi giao diện/SEO lừa đảo).

Dưới đây là nội dung thay đổi (Diff Lines, với dấu '+' là thêm mới, '-' là xóa đi):
\`\`\`diff
${diffSample}
\`\`\`

Hãy trả về kết quả phân tích theo định dạng JSON với cấu trúc chính xác sau:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "summary": "Tóm tắt ngắn gọn trong 1-2 câu bằng tiếng Việt về thay đổi này",
  "details": "Giải thích chi tiết bằng tiếng Việt về những gì thay đổi đang thực hiện, chỉ ra cụ thể các đoạn mã hoặc biến đáng nghi (nếu có), phân tích tác động và khuyến nghị của bạn dành cho quản trị viên"
}

Hãy đưa ra đánh giá khách quan. Nếu đó chỉ là một thay đổi thư viện thông thường, cập nhật CSS giao diện, hoặc code bình thường, hãy xếp loại "LOW" và tóm tắt ngắn gọn. Chỉ xếp loại "MEDIUM" hoặc "HIGH" khi phát hiện hành vi khả nghi thực sự (như đánh cắp dữ liệu, chèn script lạ từ CDN lạ, chèn link độc hại, mã hóa obfuscated code, chèn mã iframe ẩn).

Đảm bảo chỉ phản hồi chuỗi JSON hợp lệ không chứa bất kỳ markdown nào xung quanh (không dùng \`\`\`json).`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });

  const text = response.text?.trim() || "{}";
  try {
    const result = JSON.parse(text);
    return {
      riskLevel: (result.riskLevel || 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH',
      summary: result.summary || "Phân tích thay đổi hoàn thành.",
      details: result.details || "Không phát hiện mối đe dọa bảo mật khả nghi.",
      analyzedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error("Lỗi phân tích JSON phản hồi từ Gemini:", text, err);
    return {
      riskLevel: 'LOW' as const,
      summary: "Cập nhật tài nguyên web được quét.",
      details: `Không thể chuyển đổi phân tích thành định dạng cấu trúc. Nội dung phân tích thô: \n\n${text}`,
      analyzedAt: new Date().toISOString()
    };
  }
}

async function startServer(options: { listen?: boolean } = {}) {
  const isServerless = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const shouldListen = options.listen ?? (!isServerless && (process.env.NODE_ENV !== "test"));
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Setup Gemini client if available
  let geminiClient: GoogleGenAI | undefined;
  if (process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Khởi tạo Gemini API Client thành công!");
  } else {
    console.warn("⚠️ Không tìm thấy GEMINI_API_KEY. Các chức năng phân tích AI sẽ không khả dụng.");
  }

  // --- API Routes ---

  // 1. Get targets, logs, settings
  app.get("/api/dashboard", (req, res) => {
    try {
      const db = DbHelper.read();
      const targets = Array.isArray(db.targets) ? db.targets : [];
      const scans = Array.isArray(db.scans) ? db.scans.map(s => ({ ...s, content: undefined })) : [];
      const settings = db.settings || { telegramToken: "", telegramChatId: "", slackWebhook: "", enableAutoAI: false, scanIntervalHours: 12 };
      const logs = Array.isArray(db.logs) ? db.logs : [];

      res.json({
        targets,
        scans,
        settings,
        logs
      });
    } catch (err: any) {
      console.error("Lỗi API /api/dashboard:", err);
      res.status(500).json({ error: "Không thể lấy dữ liệu dashboard: " + (err?.message || String(err)) });
    }
  });

  // 2. Add Target
  app.post("/api/targets", (req, res) => {
    try {
      const { name, url, type, userAgent, headers } = req.body;
      if (!name || !url || !type) {
        return res.status(400).json({ error: "Thiếu thông tin bắt buộc: tên, url, loại tài nguyên" });
      }

      // Check URL format
      try {
        new URL(url);
      } catch (e) {
        return res.status(400).json({ error: "URL không hợp lệ. Vui lòng nhập đầy đủ định dạng (vd: https://example.com)" });
      }

      // Validate headers JSON
      if (headers) {
        try {
          JSON.parse(headers);
        } catch (e) {
          return res.status(400).json({ error: "Headers tùy chọn phải là định dạng JSON hợp lệ" });
        }
      }

      const db = DbHelper.read();
      const newTarget: Target = {
        id: "target-" + Date.now(),
        name,
        url,
        type,
        userAgent: userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebAssetChangeMonitor/1.0",
        headers: headers || "{}",
        lastScanned: null,
        lastHash: null,
        status: "active",
        error: null,
        createdAt: new Date().toISOString()
      };

      db.targets.push(newTarget);
      DbHelper.write(db);
      DbHelper.addLog(`Đã thêm mục tiêu giám sát mới: "${name}" (${url})`);

      res.status(201).json(newTarget);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Update Target
  app.put("/api/targets/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, url, type, userAgent, headers, status } = req.body;

      const db = DbHelper.read();
      const index = db.targets.findIndex(t => t.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "Không tìm thấy mục tiêu" });
      }

      const target = db.targets[index];
      if (name) target.name = name;
      if (url) {
        try {
          new URL(url);
          target.url = url;
        } catch (e) {
          return res.status(400).json({ error: "URL không hợp lệ" });
        }
      }
      if (type) target.type = type;
      if (userAgent !== undefined) target.userAgent = userAgent;
      if (headers !== undefined) {
        try {
          if (headers) JSON.parse(headers);
          target.headers = headers || "{}";
        } catch (e) {
          return res.status(400).json({ error: "Headers phải là JSON hợp lệ" });
        }
      }
      if (status) target.status = status;

      db.targets[index] = target;
      DbHelper.write(db);
      DbHelper.addLog(`Đã cập nhật cấu hình mục tiêu: "${target.name}"`);

      res.json(target);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Delete Target
  app.delete("/api/targets/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = DbHelper.read();
      const target = db.targets.find(t => t.id === id);
      if (!target) {
        return res.status(404).json({ error: "Không tìm thấy mục tiêu" });
      }

      db.targets = db.targets.filter(t => t.id !== id);
      // Clean up historical scans for this target
      db.scans = db.scans.filter(s => s.targetId !== id);

      DbHelper.write(db);
      DbHelper.addLog(`Đã xóa mục tiêu giám sát: "${target.name}"`);

      res.json({ success: true, message: `Đã xóa mục tiêu ${target.name}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Trigger scan for a single target
  app.post("/api/targets/:id/scan", async (req, res) => {
    try {
      const { id } = req.params;
      const scanResult = await scanTarget(id, geminiClient);
      res.json(scanResult);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Trigger scan for all targets
  app.post("/api/scan-all", async (req, res) => {
    try {
      const db = DbHelper.read();
      const activeTargets = db.targets.filter(t => t.status === "active");
      DbHelper.addLog(`Bắt đầu quét đồng loạt tất cả mục tiêu đang hoạt động (${activeTargets.length} mục tiêu)...`);

      const results = [];
      for (const target of activeTargets) {
        try {
          const resScan = await scanTarget(target.id, geminiClient);
          results.push(resScan);
        } catch (e: any) {
          results.push({ targetId: target.id, status: 'failed', errorMessage: e.message });
        }
      }

      res.json({ success: true, resultsCount: results.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Get scan history for a target (including content)
  app.get("/api/scans/:targetId", (req, res) => {
    const { targetId } = req.params;
    const db = DbHelper.read();
    const targetScans = db.scans
      .filter(s => s.targetId === targetId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(targetScans);
  });

  // 8. Trigger manual AI Security Analysis on a scan change
  app.post("/api/scans/:scanId/ai-analyze", async (req, res) => {
    try {
      const { scanId } = req.params;
      if (!geminiClient) {
        return res.status(400).json({ error: "Dịch vụ AI chưa được cấu hình. Vui lòng thiết lập GEMINI_API_KEY." });
      }

      const db = DbHelper.read();
      const scanIndex = db.scans.findIndex(s => s.id === scanId);
      if (scanIndex === -1) {
        return res.status(404).json({ error: "Không tìm thấy phiên bản quét lịch sử" });
      }

      const currentScan = db.scans[scanIndex];
      const target = db.targets.find(t => t.id === currentScan.targetId);
      if (!target) {
        return res.status(400).json({ error: "Không tìm thấy mục tiêu liên đới" });
      }

      // Find the previous successful scan to compare with
      const previousScan = db.scans
        .filter(s => s.targetId === currentScan.targetId && s.status === 'success' && new Date(s.timestamp).getTime() < new Date(currentScan.timestamp).getTime())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      if (!previousScan) {
        return res.status(400).json({ error: "Không tìm thấy phiên bản quét trước đó của mục tiêu này để so sánh mã." });
      }

      DbHelper.addLog(`Đang gửi yêu cầu phân tích an ninh AI thủ công cho bản quét "${currentScan.id}" của mục tiêu "${target.name}"`);
      const aiAnalysis = await runAiAnalysisOnDiff(previousScan.content, currentScan.content, target.type, geminiClient);

      // Save to db
      db.scans[scanIndex].aiAnalysis = aiAnalysis;
      DbHelper.write(db);
      DbHelper.addLog(`Hoàn tất phân tích an ninh AI cho mục tiêu "${target.name}". Đánh giá rủi ro: ${aiAnalysis.riskLevel}`);

      res.json(aiAnalysis);
    } catch (err: any) {
      console.error("Lỗi phân tích bảo mật AI:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Update Settings
  app.post("/api/settings", (req, res) => {
    try {
      const { telegramToken, telegramChatId, slackWebhook, enableAutoAI, scanIntervalHours } = req.body;
      const db = DbHelper.read();

      db.settings = {
        telegramToken: telegramToken !== undefined ? telegramToken : db.settings.telegramToken,
        telegramChatId: telegramChatId !== undefined ? telegramChatId : db.settings.telegramChatId,
        slackWebhook: slackWebhook !== undefined ? slackWebhook : db.settings.slackWebhook,
        enableAutoAI: enableAutoAI !== undefined ? !!enableAutoAI : db.settings.enableAutoAI,
        scanIntervalHours: scanIntervalHours !== undefined ? Number(scanIntervalHours) : db.settings.scanIntervalHours,
      };

      DbHelper.write(db);
      DbHelper.addLog("Đã cập nhật cấu hình hệ thống & cảnh báo thành công.");
      res.json(db.settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Test Notification Webhooks
  app.post("/api/settings/test-webhook", async (req, res) => {
    try {
      const { telegramToken, telegramChatId, slackWebhook } = req.body;
      const results: Record<string, string> = {};

      const testMsg = `🔔 *[WACM] THỬ NGHIỆM CẢNH BÁO*\n\nKết nối thử nghiệm từ hệ thống Web Asset Change Monitor thành công lúc ${new Date().toLocaleString("vi-VN")}. Hệ thống cảnh báo đã sẵn sàng!`;

      if (telegramToken && telegramChatId) {
        try {
          const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
          const telRes = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: testMsg,
              parse_mode: 'Markdown'
            })
          });
          if (telRes.ok) {
            results.telegram = "Gửi thử nghiệm thành công!";
            DbHelper.addLog("Gửi thử nghiệm kết nối Telegram thành công.");
          } else {
            const data = await telRes.text();
            results.telegram = `Thất bại (HTTP ${telRes.status}): ${data}`;
            DbHelper.addLog(`Gửi thử nghiệm Telegram thất bại: ${data}`, 'warn');
          }
        } catch (e: any) {
          results.telegram = `Lỗi: ${e.message}`;
          DbHelper.addLog(`Lỗi kết nối Telegram thử nghiệm: ${e.message}`, 'error');
        }
      }

      if (slackWebhook) {
        try {
          const slRes = await fetch(slackWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🔔 *[WACM] THỬ NGHIỆM CẢNH BÁO*\n\nKết nối thử nghiệm từ hệ thống Web Asset Change Monitor thành công lúc ${new Date().toLocaleString("vi-VN")}. Hệ thống của bạn đã sẵn sàng!`
            })
          });
          if (slRes.ok) {
            results.slack = "Gửi thử nghiệm thành công!";
            DbHelper.addLog("Gửi thử nghiệm kết nối Slack thành công.");
          } else {
            results.slack = `Thất bại (HTTP ${slRes.status})`;
            DbHelper.addLog(`Gửi thử nghiệm Slack thất bại. HTTP Status: ${slRes.status}`, 'warn');
          }
        } catch (e: any) {
          results.slack = `Lỗi: ${e.message}`;
          DbHelper.addLog(`Lỗi kết nối Slack thử nghiệm: ${e.message}`, 'error');
        }
      }

      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vercel Cron or external periodic trigger endpoint
  app.get("/api/cron", async (req, res) => {
    try {
      const db = DbHelper.read();
      const activeTargets = db.targets.filter(t => t.status === "active");
      let scanned = 0;
      for (const target of activeTargets) {
        await scanTarget(target.id, geminiClient);
        scanned++;
      }
      res.json({ success: true, scanned, timestamp: new Date().toISOString() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Catch-all 404 handler for unmatched /api endpoints
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API endpoint không tồn tại: ${req.method} ${req.originalUrl || req.url}` });
  });

  // Express global error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Lỗi hệ thống Express:", err);
    res.status(500).json({ error: "Lỗi nội bộ máy chủ: " + (err?.message || String(err)) });
  });

  // --- Background Scheduler (Simulator) ---
  // We check if we need to auto-scan active targets periodically based on scanIntervalHours
  // To keep development responsive and simulate real periodic scanning, we run a check every 2 minutes
  if (!process.env.VERCEL) {
    setInterval(async () => {
      try {
        const db = DbHelper.read();
        const intervalMs = db.settings.scanIntervalHours * 60 * 60 * 1000;
        const now = Date.now();
        const activeTargets = db.targets.filter(t => t.status === "active");

        let hasScannedAny = false;
        for (const target of activeTargets) {
          const lastScannedTime = target.lastScanned ? new Date(target.lastScanned).getTime() : 0;
          if (now - lastScannedTime >= intervalMs) {
            hasScannedAny = true;
            await scanTarget(target.id, geminiClient);
          }
        }

        if (hasScannedAny) {
          console.log("Đã tự động hoàn tất quét định kỳ các mục tiêu đến hạn.");
        }
      } catch (e) {
        console.error("Lỗi trong vòng lặp quét định kỳ nền:", e);
      }
    }, 2 * 60 * 1000); // Check every 2 minutes
  }

  // Vite development integration
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (shouldListen) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[WACM Backend] Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
      DbHelper.addLog("Khởi động hệ thống WACM thành công. Cổng phát sóng: 3000.");
    });
  }

  return app;
}

// Auto-start server when executed directly as main script
const isDirectRun = Boolean(
  process.argv[1] &&
  (process.argv[1].endsWith("server.ts") ||
   process.argv[1].endsWith("server.cjs") ||
   process.argv[1].endsWith("server.js"))
);

if (isDirectRun && !process.env.VERCEL) {
  startServer({ listen: true });
}

export default startServer;

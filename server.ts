import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

import authRoutes from "./src/modules/auth/auth.routes";
import usersRoutes from "./src/modules/users/users.routes";
import walletsRoutes from "./src/modules/wallets/wallets.routes";
import categoriesRoutes from "./src/modules/categories/categories.routes";
import transactionsRoutes from "./src/modules/transactions/transactions.routes";
import budgetsRoutes from "./src/modules/budgets/budgets.routes";
import goalsRoutes from "./src/modules/goals/goals.routes";
import recurringRoutes from "./src/modules/recurring/recurring.routes";
import reportsRoutes from "./src/modules/reports/reports.routes";
import syncRoutes from "./src/modules/sync/sync.routes";
import aiRoutes from "./src/modules/ai/ai.routes";
import { getJwtSecret } from "./src/middleware/auth.middleware";
import { requestIdMiddleware } from "./src/middleware/requestId.middleware";
import { securityHeadersMiddleware } from "./src/middleware/securityHeaders.middleware";
import { sanitizeInputMiddleware } from "./src/middleware/sanitize.middleware";
import { apiRateLimiter } from "./src/middleware/rateLimiter.middleware";
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler.middleware";
import { Logger } from "./src/utils/logger";

dotenv.config({ override: true });

// Bắt buộc kiểm tra JWT_SECRET khi server khởi động (Fail-fast)
getJwtSecret();

const app = express();
const PORT = 3000;

// Cho phép Express nhận diện client IP thực tế qua Nginx / Cloud Run Proxy
app.set("trust proxy", 1);

// 1. Gán Request ID cho mỗi HTTP request để phục vụ Audit Trail & Logging
app.use(requestIdMiddleware);

// 2. HTTP Security Headers (Helmet + Custom OWASP Security Headers)
app.use(
  helmet({
    contentSecurityPolicy: false, // Để tránh chặn Vite dev server / iframe scripts
    crossOriginEmbedderPolicy: false,
  })
);
app.use(securityHeadersMiddleware);

// 3. Cấu hình Whitelist CORS an toàn (Chống CSRF & Cross-Origin Unauthorized Access)
const parseAllowedOrigins = (): string[] => {
  const defaultOrigins = [
    "https://hophuloc.online",
    "https://www.hophuloc.online",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ];

  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
    : [];

  const appUrl = process.env.APP_URL ? process.env.APP_URL.trim() : "";

  const originsSet = new Set<string>();
  [...defaultOrigins, ...envOrigins, appUrl].forEach((origin) => {
    if (origin) {
      originsSet.add(origin.replace(/\/$/, ""));
    }
  });

  return Array.from(originsSet);
};

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép các request nội bộ không có Origin (same-origin, cURL, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      if (
        process.env.NODE_ENV !== "production" &&
        (normalizedOrigin.endsWith(".run.app") ||
          normalizedOrigin.includes("localhost") ||
          normalizedOrigin.includes("127.0.0.1"))
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "X-Request-Id",
    ],
  })
);

// 4. Request Body Parsing & Sanitization (Prototype Pollution Protection & Size Limit)
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(sanitizeInputMiddleware);

// 5. Rate Limiting toàn cục cho các API endpoints (/api/*)
app.use("/api", apiRateLimiter);

// --- REST API ENDPOINTS (v1 & Legacy Aliases) ---
// V1 Standard Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/wallets", walletsRoutes);
app.use("/api/v1/categories", categoriesRoutes);
app.use("/api/v1/transactions", transactionsRoutes);
app.use("/api/v1/budgets", budgetsRoutes);
app.use("/api/v1/goals", goalsRoutes);
app.use("/api/v1/recurring", recurringRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/sync", syncRoutes);
app.use("/api/v1/ai", aiRoutes);

// Legacy Aliases for backwards compatibility
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/wallets", walletsRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/budget", budgetsRoutes);
app.use("/api/budgets", budgetsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/ai", aiRoutes);

// Health Check API Route
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    aiEnabled: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
    timestamp: new Date().toISOString(),
  });
});

// Xử lý 404 cho các đường dẫn /api/* không hợp lệ
app.use("/api/*", notFoundHandler);

// 6. Centralized Error Handler (Xử lý lỗi tập trung & che giấu thông tin nhạy cảm)
app.use(errorHandler);

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Serve static files under both /app_chi_tieu sub-path and root
    app.use("/app_chi_tieu", express.static(distPath));
    app.use(express.static(distPath));

    // SPA fallback routes
    app.get("/app_chi_tieu*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    Logger.info(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL && !process.env.VITEST && process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;

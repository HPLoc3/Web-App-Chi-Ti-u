import "./src/config/loadEnv";

import path from "path";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { validateEnvironment, parseTrustProxyHops } from "./src/config/env";
import { getJwtSecret, getRefreshTokenSecret } from "./src/middleware/auth.middleware";
import { requestIdMiddleware } from "./src/middleware/requestId.middleware";
import { securityHeadersMiddleware } from "./src/middleware/securityHeaders.middleware";
import { sanitizeInputMiddleware } from "./src/middleware/sanitize.middleware";
import { csrfProtectionMiddleware } from "./src/middleware/csrf.middleware";
import { apiRateLimiter } from "./src/middleware/rateLimiter.middleware";
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler.middleware";
import { Logger } from "./src/utils/logger";
import { prisma } from "./src/lib/prisma";

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
import healthRoutes, { setDraining } from "./src/modules/health/health.routes";

// 1. Khởi tạo và kiểm tra toàn vẹn biến môi trường khi server khởi động (Fail-fast)
const envConfig = validateEnvironment();
getJwtSecret();
getRefreshTokenSecret();

const app = express();
const PORT = envConfig.PORT || 3000;

// 2. Cho phép Express nhận diện client IP thực tế qua Nginx / Cloud Run / Kubernetes Ingress
// Số hop chỉnh bằng TRUST_PROXY_HOPS (mặc định 1), xem DEPLOY.md
const trustProxyHops = parseTrustProxyHops(envConfig.TRUST_PROXY_HOPS);
app.set("trust proxy", trustProxyHops);

// 3. Gán Request ID cho mỗi HTTP request để phục vụ Audit Trail & Logging
app.use(requestIdMiddleware);

// 4. HTTP Security Headers (Helmet + Custom OWASP Security Headers)
app.use(
  helmet({
    contentSecurityPolicy: false, // Quản lý qua securityHeadersMiddleware và tương thích preview iframe
    crossOriginEmbedderPolicy: false,
  })
);
app.use(securityHeadersMiddleware);

// 5. Cấu hình Whitelist CORS an toàn (Chống CSRF & Cross-Origin Unauthorized Access)
const parseAllowedOrigins = (): string[] => {
  // Origin localhost chỉ dành cho dev; production chỉ nhận ALLOWED_ORIGINS và APP_URL
  const defaultOrigins =
    process.env.NODE_ENV === "production"
      ? []
      : [
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
      // Cho phép các request nội bộ không có Origin (same-origin, cURL, server-to-server, health check probes)
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

// 6. Request Body Parsing & Sanitization (Prototype Pollution Protection & Size Limit)
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(sanitizeInputMiddleware);

// Link cũ dạng /app_chi_tieu/* chuyển về gốc, giữ nguyên query (vd link đặt lại mật khẩu).
// Đích luôn là "/" hoặc bắt đầu bằng "/?" nên không thể bị lợi dụng làm open redirect.
app.get(["/app_chi_tieu", "/app_chi_tieu/*"], (req, res) => {
  const queryStart = req.originalUrl.indexOf("?");
  res.redirect(301, queryStart >= 0 ? `/${req.originalUrl.slice(queryStart)}` : "/");
});

// 7. Health Check, Liveness & Readiness Routes (Được đặt trước rate limiter để tránh chặn load balancer probe)
app.use("/health", healthRoutes);
app.use("/api/health", healthRoutes);

// 8. Rate Limiting toàn cục cho các API endpoints (/api/*)
// Đảm bảo toàn bộ phản hồi API và Auth không bao giờ bị lưu cache bởi browser hoặc proxy
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});
// Cờ chẩn đoán TẠM THỜI để chọn đúng TRUST_PROXY_HOPS. Chỉ log IP, không log token/cookie/body.
if (envConfig.DEBUG_CLIENT_IP === "true") {
  app.use("/api", (req, _res, next) => {
    Logger.info("[DEBUG_CLIENT_IP]", {
      reqIp: req.ip,
      trustProxyHops,
      xForwardedFor: req.headers["x-forwarded-for"] ?? null,
    });
    next();
  });
}
app.use("/api", csrfProtectionMiddleware);
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

// Xử lý 404 cho các đường dẫn /api/* không hợp lệ
app.use("/api/*", notFoundHandler);

// 9. Centralized Error Handler (Xử lý lỗi tập trung & che giấu thông tin nhạy cảm)
app.use(errorHandler);

let httpServer: http.Server | null = null;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Import động: Vite chỉ cần ở dev, tránh bị gom vào bundle/function production (Vercel)
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    const staticOptions = {
      maxAge: "1y",
      immutable: true,
      setHeaders: (res: express.Response, filePath: string) => {
        if (filePath.endsWith(".html") || filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache, must-revalidate");
          res.setHeader("Pragma", "no-cache");
        }
      },
    };

    app.use(express.static(distPath, staticOptions));

    // SPA fallback routes (Luôn yêu cầu revalidate index.html để nạp bundle mới sau mỗi lần deploy)
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer = app.listen(PORT, "0.0.0.0", () => {
    Logger.info(`Server listening on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });

  // Tối ưu hóa Keep-Alive timeout cho Reverse Proxy (Nginx / Cloud Run / ALB)
  httpServer.keepAliveTimeout = 65000;
  httpServer.headersTimeout = 66000;

  return httpServer;
}

// 10. Graceful Shutdown & Process Signal Handling (SIGTERM & SIGINT)
const handleGracefulShutdown = (signal: string) => {
  Logger.info(`Received ${signal}. Initiating graceful shutdown...`);
  
  // Đánh dấu server bắt đầu draining để readiness probe trả về 503
  setDraining(true);

  if (!httpServer) {
    process.exit(0);
    return;
  }

  // 15-second safety timeout để ép dừng nếu có kết nối bị treo
  const forceExitTimer = setTimeout(() => {
    Logger.error('Graceful shutdown timeout exceeded (15s). Forcefully terminating process.');
    process.exit(1);
  }, 15000);
  forceExitTimer.unref();

  // Đóng HTTP Server, không nhận thêm kết nối mới
  httpServer.close(async (err) => {
    if (err) {
      Logger.error('Error while closing HTTP server:', err);
      process.exit(1);
    }

    Logger.info('HTTP server closed successfully. Disconnecting database client...');
    try {
      await prisma.$disconnect();
      Logger.info('PostgreSQL connection pool disconnected cleanly.');
      process.exit(0);
    } catch (dbErr) {
      Logger.error('Error disconnecting database:', dbErr);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: any) => {
  Logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err: Error) => {
  Logger.error('Uncaught Exception:', err);
  handleGracefulShutdown('uncaughtException');
});

if (!process.env.VERCEL && !process.env.VITEST && process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;

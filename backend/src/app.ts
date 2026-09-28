import "express-async-errors"; // must be imported before routes are registered
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import apiRoutes from "./routes";
import { errorHandler } from "./common/middleware/errorHandler";

const app = express();

// Security headers
app.use(helmet());

// CORS — exposedHeaders is required because browsers hide all response headers
// from JS by default except a small safelist; Content-Disposition (used to send
// the real Nepali filename for generated documents) is NOT in that safelist,
// so without this the frontend can never read it, no matter how it's parsed.
//
// Origin is a function (not the plain env.cors.origin list) because every
// organization gets its own wildcard subdomain (e.g.
// "sitalawfirm.portal.technocraftx.com") -- an exact-match list can never
// cover those, so any origin matching *.portal./*.student.technocraftx.com
// is allowed in addition to the explicit list.
const WILDCARD_ORIGIN_PATTERN = /^https?:\/\/[a-z0-9-]+\.(portal|student)\.technocraftx\.com$/;
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.cors.origin.includes(origin) || WILDCARD_ORIGIN_PATTERN.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Profile photos are served as plain static files so <img src="..."> works
// directly — unlike case documents (which stay behind authenticated download
// endpoints), avatars are low-sensitivity and need to load cross-origin from
// the web apps (different port than the API), which helmet's default
// Cross-Origin-Resource-Policy would otherwise block.
app.use(
  "/uploads/avatars",
  express.static(require("path").join(process.cwd(), env.storage.localUploadDir, "avatars"), {
    setHeaders: (res) => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
  })
);

// Payment QR codes (institution + Company) -- same reasoning as avatars:
// plain static files so <img src="..."> works directly cross-origin from
// the web apps. Previously this folder was never mounted, so a QR image
// upload succeeded but the image never actually loaded anywhere.
app.use(
  "/uploads/payment-qr",
  express.static(require("path").join(process.cwd(), env.storage.localUploadDir, "payment-qr"), {
    setHeaders: (res) => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
  })
);

// Request logging
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

// Rate limiting (applies to all API routes)
app.use(
  `/api/${env.apiVersion}`,
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Versioned API routes
app.use(`/api/${env.apiVersion}`, apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;

import "dotenv/config";
import cors from "cors";
import express from "express";
import { buildPreflightReport } from "./lib/preflightChecks.js";
import { getNeonSql } from "./lib/neonClient.js";
import { getProducts, updateProductStock, upsertProduct, bulkUpsertProducts } from "./routes/products.js";
import { createOrder, getMyOrders } from "./routes/orders.js";
import { getMyProfile, upsertMyProfile } from "./routes/profile.js";
import { getMyWishlist, upsertMyWishlist } from "./routes/wishlist.js";
import { getMyStockAlerts, upsertMyStockAlerts } from "./routes/stockAlerts.js";
import { getBlogArticleBySlug, getBlogArticles } from "./routes/blog.js";
import {
  createAdminBlogArticle,
  deleteAdminBlogArticle,
  generateAdminBlogDraft,
  getAdminBlogArticles,
  runAdminBlogPublishSweep,
  runAdminBlogSeoRescore,
  ensurePostPublishFollowUpTask,
  createAdminSeoTask,
  getAdminSeoCompetitorBenchmark,
  getAdminSeoDashboard,
  getAdminLlmProviderHealth,
  getAdminSeoTasks,
  remindAdminSeoTask,
  upsertAdminSeoCompetitorBenchmark,
  updateAdminBlogArticle,
  updateAdminSeoTask,
} from "./routes/seoAdmin.js";
import { getOrderTracking } from "./routes/tracking.js";
import {
  getPesapalStatus,
  initiatePesapalCheckout,
  handlePesapalCallback,
  getMpesaStatus,
  initiateMpesaCheckout,
  handleMpesaCallback,
} from "./routes/payments.js";
import { generateBlogSitemap, generateMainSitemap, generateProductsSitemap, generateSitemapIndex } from "./lib/sitemapGenerator.js";

const isPlaceholder = (value) => {
  const str = String(value || "").toLowerCase().trim();
  return /^(replace_|placeholder|xxxxx|pending|todo|example|sample|changeme|fixme|temp_|n\/a|none|null|undefined)/.test(str);
};

const isTrue = (value) => String(value || "").toLowerCase() === "true";

const getMpesaConfiguredState = () => {
  const simulation = isTrue(process.env.MPESA_SIMULATION);
  const sandboxAutoSimulation =
    String(process.env.MPESA_BASE_URL || "").toLowerCase().includes("sandbox.safaricom.co.ke") &&
    (isPlaceholder(process.env.MPESA_SHORTCODE) || isPlaceholder(process.env.MPESA_PASSKEY));
  if (simulation || sandboxAutoSimulation) return true;

  const hasCore = Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY &&
      process.env.MPESA_CALLBACK_URL
  );

  if (!hasCore) return false;
  if (isPlaceholder(process.env.MPESA_SHORTCODE)) return false;
  if (isPlaceholder(process.env.MPESA_PASSKEY)) return false;
  return true;
};

const app = express();
const PORT = Number(process.env.PORT || 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

// Serve built frontend assets in production
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

// Serve static files from dist directory
app.use(express.static(distPath, {
  maxAge: '1d',
  etag: false,
}));

const sendHandlerResult = async (res, handlerPromise) => {
  try {
    const result = await handlerPromise;
    res.status(result?.status || 500).json(
      result?.body || {
        ok: false,
        message: "Empty handler response",
      }
    );
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error?.message || "Unhandled server error",
    });
  }
};

// SEO Routes
app.get("/sitemap.xml", (_req, res) => {
  res.set("Content-Type", "application/xml");
  res.send(generateMainSitemap());
});

app.get("/sitemap-products.xml", (_req, res) => {
  void (async () => {
    try {
      const sql = getNeonSql();
      const products = await sql`SELECT id, updated_at AS "updatedAt", in_stock AS "inStock" FROM products ORDER BY updated_at DESC LIMIT 50000`;
      res.set("Content-Type", "application/xml");
      res.send(await generateProductsSitemap(products));
    } catch {
      res.set("Content-Type", "application/xml");
      res.send(await generateProductsSitemap([]));
    }
  })();
});

app.get("/sitemap-blog.xml", (_req, res) => {
  void (async () => {
    try {
      const sql = getNeonSql();
      const articles = await sql`
        SELECT slug, published_at AS "publishedAt", updated_at AS "updatedAt"
        FROM blog_articles
        WHERE status = 'published'
          AND (published_at IS NULL OR published_at <= NOW())
        ORDER BY published_at DESC NULLS LAST, updated_at DESC
        LIMIT 20000
      `;
      res.set("Content-Type", "application/xml");
      res.send(await generateBlogSitemap(articles));
    } catch {
      res.set("Content-Type", "application/xml");
      res.send(await generateBlogSitemap([]));
    }
  })();
});

app.get("/sitemap-index.xml", (_req, res) => {
  res.set("Content-Type", "application/xml");
  res.send(generateSitemapIndex());
});

app.get("/api/health", (_req, res) => {
  const checks = {
    apiBase: true,
    clerkSecretConfigured: Boolean(process.env.CLERK_SECRET_KEY),
    neonConfigured: Boolean(process.env.NEON_DATABASE_URL),
    pesapalConfigured: Boolean(
      process.env.PESAPAL_CONSUMER_KEY &&
        process.env.PESAPAL_CONSUMER_SECRET &&
        process.env.PESAPAL_IPN_ID &&
        !isPlaceholder(process.env.PESAPAL_IPN_ID)
    ),
    mpesaConfigured: getMpesaConfiguredState(),
  };

  res.status(200).json({
    ok: true,
    service: "nafuu-mart-api",
    checks,
  });
});

app.get("/api/health/ready", (_req, res) => {
  const checks = {
    clerkSecretConfigured: Boolean(process.env.CLERK_SECRET_KEY),
    neonConfigured: Boolean(process.env.NEON_DATABASE_URL),
    pesapalConfigured: Boolean(
      process.env.PESAPAL_CONSUMER_KEY &&
        process.env.PESAPAL_CONSUMER_SECRET &&
        process.env.PESAPAL_IPN_ID &&
        !isPlaceholder(process.env.PESAPAL_IPN_ID)
    ),
    mpesaConfigured: getMpesaConfiguredState(),
  };

  const ready = Object.values(checks).every(Boolean);
  res.status(ready ? 200 : 503).json({
    ok: ready,
    service: "nafuu-mart-api",
    checks,
    message: ready
      ? "API is configured for full backend flow."
      : "API is running but missing or invalid required backend env values.",
  });
});

app.get("/api/preflight", (_req, res) => {
  const report = buildPreflightReport(process.env);
  res.status(report.ok ? 200 : 503).json({
    ok: report.ok,
    envMode: report.envMode,
    checks: report.checks,
    rows: report.rows,
    missingRequired: report.missingRequired,
  });
});

app.get("/api/products", (req, res) => {
  void sendHandlerResult(res, getProducts({ query: req.query }));
});

app.post("/api/admin/products", (req, res) => {
  void sendHandlerResult(res, upsertProduct({ headers: req.headers, body: req.body }));
});

app.patch("/api/admin/products/:productId/stock", (req, res) => {
  void sendHandlerResult(
    res,
    updateProductStock({
      headers: req.headers,
      productId: req.params.productId,
      body: req.body,
    })
  );
});

app.post("/api/admin/products/bulk", (req, res) => {
  void sendHandlerResult(res, bulkUpsertProducts({ headers: req.headers, body: req.body }));
});

app.post("/api/orders", (req, res) => {
  void sendHandlerResult(res, createOrder({ headers: req.headers, body: req.body }));
});

app.get("/api/orders/me", (req, res) => {
  void sendHandlerResult(res, getMyOrders({ headers: req.headers }));
});

app.get("/api/profile/me", (req, res) => {
  void sendHandlerResult(res, getMyProfile({ headers: req.headers }));
});

app.put("/api/profile/me", (req, res) => {
  void sendHandlerResult(res, upsertMyProfile({ headers: req.headers, body: req.body }));
});

app.get("/api/wishlist/me", (req, res) => {
  void sendHandlerResult(res, getMyWishlist({ headers: req.headers }));
});

app.put("/api/wishlist/me", (req, res) => {
  void sendHandlerResult(res, upsertMyWishlist({ headers: req.headers, body: req.body }));
});

app.get("/api/stock-alerts/me", (req, res) => {
  void sendHandlerResult(res, getMyStockAlerts({ headers: req.headers }));
});

app.put("/api/stock-alerts/me", (req, res) => {
  void sendHandlerResult(res, upsertMyStockAlerts({ headers: req.headers, body: req.body }));
});

app.get("/api/blog", (req, res) => {
  void sendHandlerResult(res, getBlogArticles({ query: req.query }));
});

app.get("/api/blog/:slug", (req, res) => {
  void sendHandlerResult(res, getBlogArticleBySlug({ slug: req.params.slug }));
});

app.get("/api/admin/seo/dashboard", (req, res) => {
  void sendHandlerResult(res, getAdminSeoDashboard({ headers: req.headers, query: req.query }));
});

app.get("/api/admin/seo/tasks", (req, res) => {
  void sendHandlerResult(res, getAdminSeoTasks({ headers: req.headers, query: req.query }));
});

app.get("/api/admin/seo/competitor-benchmark", (req, res) => {
  void sendHandlerResult(res, getAdminSeoCompetitorBenchmark({ headers: req.headers }));
});

app.get("/api/admin/seo/llm-providers", (req, res) => {
  void sendHandlerResult(res, getAdminLlmProviderHealth({ headers: req.headers }));
});

app.put("/api/admin/seo/competitor-benchmark", (req, res) => {
  void sendHandlerResult(
    res,
    upsertAdminSeoCompetitorBenchmark({ headers: req.headers, body: req.body })
  );
});

app.get("/api/admin/blog/articles", (req, res) => {
  void sendHandlerResult(res, getAdminBlogArticles({ headers: req.headers, query: req.query }));
});

app.post("/api/admin/blog/articles", (req, res) => {
  void sendHandlerResult(res, createAdminBlogArticle({ headers: req.headers, body: req.body }));
});

app.post("/api/admin/blog/generate-draft", (req, res) => {
  void sendHandlerResult(res, generateAdminBlogDraft({ headers: req.headers, body: req.body }));
});

app.patch("/api/admin/blog/articles/:articleId", (req, res) => {
  void sendHandlerResult(
    res,
    updateAdminBlogArticle({ headers: req.headers, articleId: req.params.articleId, body: req.body })
  );
});

app.delete("/api/admin/blog/articles/:articleId", (req, res) => {
  void sendHandlerResult(
    res,
    deleteAdminBlogArticle({ headers: req.headers, articleId: req.params.articleId })
  );
});

app.post("/api/admin/seo/blog-publish-sweep", (req, res) => {
  void sendHandlerResult(res, runAdminBlogPublishSweep({ headers: req.headers }));
});

app.post("/api/admin/seo/blog-rescore", (req, res) => {
  void sendHandlerResult(res, runAdminBlogSeoRescore({ headers: req.headers }));
});

app.post("/api/admin/seo/tasks", (req, res) => {
  void sendHandlerResult(res, createAdminSeoTask({ headers: req.headers, body: req.body }));
});

app.patch("/api/admin/seo/tasks/:taskId", (req, res) => {
  void sendHandlerResult(
    res,
    updateAdminSeoTask({ headers: req.headers, taskId: req.params.taskId, body: req.body })
  );
});

app.post("/api/admin/seo/tasks/:taskId/remind", (req, res) => {
  void sendHandlerResult(
    res,
    remindAdminSeoTask({ headers: req.headers, taskId: req.params.taskId, body: req.body })
  );
});

app.get("/api/tracking/:reference", (req, res) => {
  void sendHandlerResult(res, getOrderTracking({ reference: req.params.reference }));
});

app.post("/api/payments/pesapal/initiate", (req, res) => {
  void sendHandlerResult(
    res,
    initiatePesapalCheckout({ headers: req.headers, body: req.body })
  );
});

app.post("/api/payments/pesapal/callback", (req, res) => {
  void sendHandlerResult(
    res,
    handlePesapalCallback({ headers: req.headers, body: req.body })
  );
});

app.get("/api/payments/pesapal/status", (req, res) => {
  void sendHandlerResult(
    res,
    getPesapalStatus({ orderTrackingId: req.query.orderTrackingId })
  );
});

app.post("/api/payments/mpesa/initiate", (req, res) => {
  void sendHandlerResult(
    res,
    initiateMpesaCheckout({ headers: req.headers, body: req.body })
  );
});

app.post("/api/payments/mpesa/callback", (req, res) => {
  void sendHandlerResult(
    res,
    handleMpesaCallback({ headers: req.headers, body: req.body })
  );
});

app.get("/api/payments/mpesa/status", (req, res) => {
  void sendHandlerResult(
    res,
    getMpesaStatus({
      checkoutRequestId: req.query.checkoutRequestId,
      reference: req.query.reference,
    })
  );
});

// SPA fallback - serve index.html for all unmatched routes
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).json({ ok: false, message: 'Not found' });
    }
  });
});

// Background publish sweep — runs every 15 minutes to make scheduled articles
// live and create post-publish SEO follow-up tasks automatically.
const SWEEP_INTERVAL_MS = 15 * 60 * 1000;
const runBackgroundPublishSweep = async () => {
  try {
    const sql = getNeonSql();
    const dueArticles = await sql`
      SELECT id, slug, title, published_at AS "publishedAt"
      FROM blog_articles
      WHERE status = 'published'
        AND (published_at IS NULL OR published_at <= NOW())
      ORDER BY published_at DESC NULLS LAST
      LIMIT 500
    `;


    if (dueArticles.length === 0) return;

    let created = 0;
    for (const article of dueArticles) {
      const result = await ensurePostPublishFollowUpTask(sql, article, "system");
      if (result?.created) created += 1;
    }
    if (created > 0) {
      console.log(`[sweep] Created ${created} post-publish follow-up task(s) for ${dueArticles.length} article(s).`);
    }
  } catch (err) {
    console.error("[sweep] Background publish sweep error:", err?.message || err);
  }
};

export const startServer = (port = PORT) => {
  app.listen(port, () => {
    // Intentionally kept as console logging for local API runtime visibility.
    console.log(`Nafuu Mart API listening on http://localhost:${port}`);
  });
  // Delay first sweep by 30 s to allow DB connection pool to warm up.
  setTimeout(() => {
    void runBackgroundPublishSweep();
    setInterval(() => void runBackgroundPublishSweep(), SWEEP_INTERVAL_MS);
  }, 30_000);
};

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (process.env.NODE_ENV !== "test" && isDirectRun) {
  startServer();
}

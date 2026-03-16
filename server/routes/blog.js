import { getNeonSql } from "../lib/neonClient.js";

const toArticleSummary = (row = {}) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  excerpt: row.excerpt,
  status: row.status,
  source: row.source,
  focusKeyword: row.focusKeyword,
  metaTitle: row.metaTitle,
  metaDescription: row.metaDescription,
  seoScore: Number(row.seoScore || 0),
  publishedAt: row.publishedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toArticleDetail = (row = {}) => ({
  ...toArticleSummary(row),
  content: row.content || "",
  internalLinks: Array.isArray(row.internalLinks) ? row.internalLinks : [],
  createdBy: row.createdBy || null,
});

export const getBlogArticles = async ({ query = {} } = {}) => {
  const parsedLimit = Number(query.limit || 24);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 100)
    : 24;

  try {
    const sql = getNeonSql();
    const rows = await sql`
      SELECT
        id,
        slug,
        title,
        excerpt,
        status,
        source,
        focus_keyword AS "focusKeyword",
        meta_title AS "metaTitle",
        meta_description AS "metaDescription",
        seo_score AS "seoScore",
        published_at AS "publishedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM blog_articles
      WHERE status = 'published'
        AND (published_at IS NULL OR published_at <= NOW())
      ORDER BY published_at DESC NULLS LAST, updated_at DESC
      LIMIT ${limit}
    `;

    return {
      status: 200,
      body: {
        ok: true,
        items: rows.map(toArticleSummary),
      },
    };
  } catch (error) {
    const message = error?.message || "Failed to load blog articles";
    const missingEnv = message.includes("NEON_DATABASE_URL is not configured");
    const missingTable = message.toLowerCase().includes("relation \"blog_articles\" does not exist");

    return {
      status: missingEnv ? 503 : missingTable ? 501 : 500,
      body: {
        ok: false,
        message: missingEnv
          ? "Database not configured. Set NEON_DATABASE_URL in backend environment."
          : missingTable
            ? "Blog tables are not ready. Apply database migrations first."
            : message,
      },
    };
  }
};

export const getBlogArticleBySlug = async ({ slug } = {}) => {
  const safeSlug = String(slug || "").trim().toLowerCase();
  if (!safeSlug) {
    return {
      status: 400,
      body: { ok: false, message: "Article slug is required" },
    };
  }

  try {
    const sql = getNeonSql();
    const rows = await sql`
      SELECT
        id,
        slug,
        title,
        excerpt,
        content,
        status,
        source,
        focus_keyword AS "focusKeyword",
        meta_title AS "metaTitle",
        meta_description AS "metaDescription",
        seo_score AS "seoScore",
        internal_links AS "internalLinks",
        created_by AS "createdBy",
        published_at AS "publishedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM blog_articles
      WHERE slug = ${safeSlug}
        AND status = 'published'
        AND (published_at IS NULL OR published_at <= NOW())
      LIMIT 1
    `;

    if (!rows[0]) {
      return {
        status: 404,
        body: {
          ok: false,
          message: "Article not found",
          slug: safeSlug,
        },
      };
    }

    return {
      status: 200,
      body: {
        ok: true,
        item: toArticleDetail(rows[0]),
      },
    };
  } catch (error) {
    const message = error?.message || "Failed to load article";
    const missingEnv = message.includes("NEON_DATABASE_URL is not configured");
    const missingTable = message.toLowerCase().includes("relation \"blog_articles\" does not exist");

    return {
      status: missingEnv ? 503 : missingTable ? 501 : 500,
      body: {
        ok: false,
        message: missingEnv
          ? "Database not configured. Set NEON_DATABASE_URL in backend environment."
          : missingTable
            ? "Blog tables are not ready. Apply database migrations first."
            : message,
      },
    };
  }
};

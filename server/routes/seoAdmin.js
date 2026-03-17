import { requireAdminRequest } from "../lib/clerkAuth.js";
import { getNeonSql } from "../lib/neonClient.js";

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toIsoOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const asNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const getMetricMap = (rows = []) => {
  const map = {};
  for (const row of rows) {
    map[row.metric_key] = asNumber(row.value);
  }
  return map;
};

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeStatus = (value) => {
  const status = String(value || "draft").trim().toLowerCase();
  return ["draft", "published", "archived"].includes(status) ? status : "draft";
};

const buildUniqueBlogSlug = async (sql, baseSlug, excludeId = null) => {
  const fallback = baseSlug || `article-${Date.now()}`;
  let candidate = fallback;
  let counter = 2;

  // Keep appending numeric suffixes until an unused slug is found.
  while (true) {
    const rows = await sql`
      SELECT id
      FROM blog_articles
      WHERE slug = ${candidate}
      LIMIT 1
    `;
    if (!rows[0] || rows[0].id === excludeId) return candidate;
    candidate = `${fallback}-${counter}`;
    counter += 1;
  }
};

const STRIP_HTML_RE = /<[^>]+>/g;
const HREF_RE = /href\s*=\s*["']([^"']+)["']/gi;
const HEADING_RE = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
const TRANSITION_WORDS = [
  "however",
  "therefore",
  "moreover",
  "meanwhile",
  "additionally",
  "consequently",
  "for example",
  "for instance",
  "in addition",
  "finally",
  "instead",
  "because",
  "although",
];
const POWER_WORDS = [
  "proven",
  "ultimate",
  "best",
  "easy",
  "powerful",
  "smart",
  "fast",
  "quick",
  "essential",
  "simple",
];
const CTA_PHRASES = [
  "learn more",
  "get started",
  "shop now",
  "try now",
  "discover",
  "sign up",
  "book now",
  "read more",
  "contact us",
];
const DEFAULT_COMPETITOR_BENCHMARK = {
  wordCount: 1200,
  headingCount: 6,
  internalLinks: 5,
  externalLinks: 2,
  keywordDensityMin: 0.8,
  keywordDensityMax: 2.2,
  metaTitleMin: 45,
  metaTitleMax: 65,
  metaDescriptionMin: 120,
  metaDescriptionMax: 155,
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const asPositiveNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const normalizeBenchmark = (input = {}) => ({
  wordCount: roundInt(asPositiveNumber(input.wordCount, DEFAULT_COMPETITOR_BENCHMARK.wordCount)),
  headingCount: roundInt(asPositiveNumber(input.headingCount, DEFAULT_COMPETITOR_BENCHMARK.headingCount)),
  internalLinks: roundInt(asPositiveNumber(input.internalLinks, DEFAULT_COMPETITOR_BENCHMARK.internalLinks)),
  externalLinks: roundInt(asPositiveNumber(input.externalLinks, DEFAULT_COMPETITOR_BENCHMARK.externalLinks)),
  keywordDensityMin: clamp(asNumber(input.keywordDensityMin, DEFAULT_COMPETITOR_BENCHMARK.keywordDensityMin), 0.1, 10),
  keywordDensityMax: clamp(asNumber(input.keywordDensityMax, DEFAULT_COMPETITOR_BENCHMARK.keywordDensityMax), 0.2, 15),
  metaTitleMin: roundInt(asPositiveNumber(input.metaTitleMin, DEFAULT_COMPETITOR_BENCHMARK.metaTitleMin)),
  metaTitleMax: roundInt(asPositiveNumber(input.metaTitleMax, DEFAULT_COMPETITOR_BENCHMARK.metaTitleMax)),
  metaDescriptionMin: roundInt(asPositiveNumber(input.metaDescriptionMin, DEFAULT_COMPETITOR_BENCHMARK.metaDescriptionMin)),
  metaDescriptionMax: roundInt(asPositiveNumber(input.metaDescriptionMax, DEFAULT_COMPETITOR_BENCHMARK.metaDescriptionMax)),
});

const safeParseObject = (raw) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const computeMedian = (values = []) => {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
};

const deriveBenchmarkFromSnapshots = (snapshots = []) => {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return normalizeBenchmark(DEFAULT_COMPETITOR_BENCHMARK);
  }

  const numeric = {
    wordCount: snapshots.map((s) => Number(s.wordCount)),
    headingCount: snapshots.map((s) => Number(s.headingCount)),
    internalLinks: snapshots.map((s) => Number(s.internalLinks)),
    externalLinks: snapshots.map((s) => Number(s.externalLinks)),
    keywordDensityMin: snapshots.map((s) => Number(s.keywordDensity)).filter((v) => v > 0),
    keywordDensityMax: snapshots.map((s) => Number(s.keywordDensity)).filter((v) => v > 0),
    metaTitleMin: snapshots.map((s) => Number(s.metaTitleLength)).filter((v) => v > 0),
    metaTitleMax: snapshots.map((s) => Number(s.metaTitleLength)).filter((v) => v > 0),
    metaDescriptionMin: snapshots.map((s) => Number(s.metaDescriptionLength)).filter((v) => v > 0),
    metaDescriptionMax: snapshots.map((s) => Number(s.metaDescriptionLength)).filter((v) => v > 0),
  };

  const kdMedian = computeMedian(numeric.keywordDensityMin);
  const mtMedian = computeMedian(numeric.metaTitleMin);
  const mdMedian = computeMedian(numeric.metaDescriptionMin);

  return normalizeBenchmark({
    wordCount: computeMedian(numeric.wordCount),
    headingCount: computeMedian(numeric.headingCount),
    internalLinks: computeMedian(numeric.internalLinks),
    externalLinks: computeMedian(numeric.externalLinks),
    keywordDensityMin: kdMedian ? Math.max(0.4, kdMedian - 0.4) : undefined,
    keywordDensityMax: kdMedian ? Math.min(4, kdMedian + 0.6) : undefined,
    metaTitleMin: mtMedian ? Math.max(35, mtMedian - 8) : undefined,
    metaTitleMax: mtMedian ? Math.min(80, mtMedian + 8) : undefined,
    metaDescriptionMin: mdMedian ? Math.max(90, mdMedian - 20) : undefined,
    metaDescriptionMax: mdMedian ? Math.min(190, mdMedian + 20) : undefined,
  });
};

const getCompetitorBenchmark = async (sql = null) => {
  if (sql) {
    try {
      const rows = await sql`
        SELECT benchmark
        FROM seo_competitor_benchmarks
        ORDER BY updated_at DESC
        LIMIT 1
      `;
      if (rows[0]?.benchmark && typeof rows[0].benchmark === "object") {
        return normalizeBenchmark({ ...DEFAULT_COMPETITOR_BENCHMARK, ...rows[0].benchmark });
      }
    } catch {
      // Fall back to env/default benchmark when table is not migrated yet.
    }
  }
  const parsed = safeParseObject(process.env.SEO_COMPETITOR_BENCHMARK_JSON);
  return normalizeBenchmark({ ...DEFAULT_COMPETITOR_BENCHMARK, ...(parsed || {}) });
};

const stripHtml = (html = "") => String(html || "").replace(STRIP_HTML_RE, " ");

const toWords = (text = "") =>
  String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const countPhrase = (text = "", phrase = "") => {
  const haystack = String(text || "").toLowerCase();
  const needle = String(phrase || "").toLowerCase().trim();
  if (!needle) return 0;
  let idx = 0;
  let count = 0;
  while (true) {
    const found = haystack.indexOf(needle, idx);
    if (found === -1) break;
    count += 1;
    idx = found + needle.length;
  }
  return count;
};

const extractLinks = (html = "") => {
  const links = [];
  const text = String(html || "");
  let match;
  while ((match = HREF_RE.exec(text)) !== null) {
    links.push(match[1]);
  }
  return links;
};

const extractHeadings = (html = "") => {
  const headings = [];
  const text = String(html || "");
  let match;
  while ((match = HEADING_RE.exec(text)) !== null) {
    headings.push(stripHtml(match[1]).trim().toLowerCase());
  }
  return headings;
};

const roundInt = (n) => Math.round(Number(n) || 0);

const extractJsonObjectFromText = (text = "") => {
  const source = String(text || "").trim();
  if (!source) return null;

  try {
    return JSON.parse(source);
  } catch {
    // Continue and try to parse fenced/plain object payloads.
  }

  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // Continue with fallback object extraction.
    }
  }

  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = source.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }

  return null;
};

const toSafeHtmlParagraphs = (value = "") => {
  const lines = String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line) => `<p>${line}</p>`).join("\n");
};

const normalizeLlmProvider = (value = "") => {
  const provider = String(value || "").trim().toLowerCase();
  if (provider === "claude" || provider === "anthropic") return "anthropic";
  if (provider === "grok" || provider === "xai") return "grok";
  if (provider === "openai") return "openai";
  if (provider === "github") return "github";
  return "github";
};

const resolveLlmProviderConfig = ({ providerInput = "", modelOverride = "" } = {}) => {
  const provider = normalizeLlmProvider(providerInput || process.env.LLM_PROVIDER || "github");

  if (provider === "anthropic") {
    const apiKey = String(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "").trim();
    const apiUrl = String(process.env.ANTHROPIC_API_URL || "https://api.anthropic.com/v1/messages").trim();
    const model = modelOverride || String(process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || "claude-sonnet-4-5").trim();
    return {
      provider,
      apiType: "anthropic",
      apiKey,
      apiUrl,
      model,
      missingKeyMessage: "Claude is not configured. Set ANTHROPIC_API_KEY (or CLAUDE_API_KEY).",
    };
  }

  if (provider === "grok") {
    const apiKey = String(process.env.XAI_API_KEY || process.env.GROK_API_KEY || "").trim();
    const apiUrl = String(process.env.XAI_API_URL || "https://api.x.ai/v1/chat/completions").trim();
    const model = modelOverride || String(process.env.XAI_MODEL || process.env.GROK_MODEL || "grok-3-mini").trim();
    return {
      provider,
      apiType: "openai-compatible",
      apiKey,
      apiUrl,
      model,
      missingKeyMessage: "Grok is not configured. Set XAI_API_KEY (or GROK_API_KEY).",
    };
  }

  if (provider === "openai") {
    const apiKey = String(process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || "").trim();
    const apiUrl = String(process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions").trim();
    const model = modelOverride || String(process.env.OPENAI_MODEL || process.env.LLM_MODEL || "gpt-5-mini").trim();
    return {
      provider,
      apiType: "openai-compatible",
      apiKey,
      apiUrl,
      model,
      missingKeyMessage: "OpenAI is not configured. Set OPENAI_API_KEY (or LLM_API_KEY).",
    };
  }

  const apiKey = String(process.env.GITHUB_TOKEN || process.env.LLM_API_KEY || "").trim();
  const apiUrl = String(process.env.LLM_API_URL || "https://models.github.ai/inference/chat/completions").trim();
  const model = modelOverride || String(process.env.LLM_MODEL || "openai/gpt-5-mini").trim();
  return {
    provider: "github",
    apiType: "openai-compatible",
    apiKey,
    apiUrl,
    model,
    missingKeyMessage: "GitHub Models is not configured. Set GITHUB_TOKEN (or LLM_API_KEY).",
  };
};

const buildBlogSeoRecommendations = ({ article = {}, signals = {}, benchmark = DEFAULT_COMPETITOR_BENCHMARK } = {}) => {
  const safeBenchmark = normalizeBenchmark(benchmark);
  const breakdown = signals.breakdown || {};
  const recommendations = [];
  const focusKeyword = String(article.focusKeyword || "").trim();

  if (!focusKeyword) {
    recommendations.push({
      id: "focus-keyword",
      priority: "high",
      actionType: "rewrite_task",
      title: "Set a focus keyword for this article",
      notes: "Add one primary keyword so title, intro, headings, and metadata can be optimized consistently.",
    });
  }

  if (asNumber(breakdown.wordCount, 0) < safeBenchmark.wordCount) {
    recommendations.push({
      id: "word-count",
      priority: "high",
      actionType: "content_task",
      title: `Increase content depth toward ${safeBenchmark.wordCount}+ words`,
      notes: `Current word count is ${asNumber(breakdown.wordCount, 0)}. Add practical FAQs, comparisons, and buyer guidance.`,
    });
  }

  if (asNumber(breakdown.headingCount, 0) < safeBenchmark.headingCount) {
    recommendations.push({
      id: "headings",
      priority: "medium",
      actionType: "rewrite_task",
      title: `Add structured H2/H3 headings (target ${safeBenchmark.headingCount})`,
      notes: `Current heading count is ${asNumber(breakdown.headingCount, 0)}. Improve scannability with clear topic sections.`,
    });
  }

  const keywordDensity = asNumber(breakdown.keywordDensity, 0);
  if (focusKeyword && (keywordDensity < safeBenchmark.keywordDensityMin || keywordDensity > safeBenchmark.keywordDensityMax)) {
    recommendations.push({
      id: "keyword-density",
      priority: "high",
      actionType: "rewrite_task",
      title: "Adjust keyword usage to natural target range",
      notes: `Keyword density is ${keywordDensity.toFixed(2)}%. Aim for ${safeBenchmark.keywordDensityMin.toFixed(1)}% to ${safeBenchmark.keywordDensityMax.toFixed(1)}%.`,
    });
  }

  const metaTitleLength = asNumber(breakdown.metaTitleLength, 0);
  if (metaTitleLength < safeBenchmark.metaTitleMin || metaTitleLength > safeBenchmark.metaTitleMax) {
    recommendations.push({
      id: "meta-title-length",
      priority: "medium",
      actionType: "content_task",
      title: "Optimize meta title length",
      notes: `Current length is ${metaTitleLength} chars. Target ${safeBenchmark.metaTitleMin} to ${safeBenchmark.metaTitleMax} chars.`,
    });
  }

  const metaDescriptionLength = asNumber(breakdown.metaDescriptionLength, 0);
  if (metaDescriptionLength < safeBenchmark.metaDescriptionMin || metaDescriptionLength > safeBenchmark.metaDescriptionMax) {
    recommendations.push({
      id: "meta-description-length",
      priority: "medium",
      actionType: "content_task",
      title: "Rewrite meta description to improve SERP fit",
      notes: `Current length is ${metaDescriptionLength} chars. Target ${safeBenchmark.metaDescriptionMin} to ${safeBenchmark.metaDescriptionMax} chars.`,
    });
  }

  if (asNumber(breakdown.internalLinkCount, 0) < safeBenchmark.internalLinks) {
    recommendations.push({
      id: "internal-links",
      priority: "medium",
      actionType: "content_task",
      title: "Add more internal links to related pages",
      notes: `Current internal links: ${asNumber(breakdown.internalLinkCount, 0)}. Target at least ${safeBenchmark.internalLinks}.`,
    });
  }

  if (asNumber(breakdown.externalLinkCount, 0) < safeBenchmark.externalLinks) {
    recommendations.push({
      id: "external-links",
      priority: "low",
      actionType: "content_task",
      title: "Reference authoritative external sources",
      notes: `Current external links: ${asNumber(breakdown.externalLinkCount, 0)}. Target around ${safeBenchmark.externalLinks}.`,
    });
  }

  const priorityRank = { high: 0, medium: 1, low: 2 };
  return recommendations
    .sort((a, b) => (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99))
    .slice(0, 6);
};

// Multi-signal SEO scoring inspired by Yoast/Rank Math/Jasper style checks,
// plus competitor benchmark gap scoring.
const computeBlogSeoScore = ({
  title = "",
  slug = "",
  metaTitle = "",
  metaDescription = "",
  excerpt = "",
  content = "",
  focusKeyword = "",
  benchmark = DEFAULT_COMPETITOR_BENCHMARK,
} = {}) => {
  const safeBenchmark = normalizeBenchmark(benchmark);
  const kw = String(focusKeyword || "").trim().toLowerCase();
  const plainText = stripHtml(content);
  const words = toWords(plainText);
  const wordCount = words.length;
  const introWordsText = words.slice(0, 120).join(" ");
  const headings = extractHeadings(content);
  const links = extractLinks(content);
  const internalLinks = links.filter((href) => /^\/|^#|nafuu-mart\.com/i.test(href));
  const externalLinks = links.filter((href) => /^https?:\/\//i.test(href) && !/nafuu-mart\.com/i.test(href));
  const sentenceCount = Math.max(1, plainText.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length);
  const avgSentenceLength = wordCount / sentenceCount;

  const keywordHits = kw ? countPhrase(plainText, kw) : 0;
  const keywordDensity = wordCount > 0 ? (keywordHits / wordCount) * 100 : 0;
  const transitionHitCount = TRANSITION_WORDS.reduce((sum, token) => sum + countPhrase(plainText, token), 0);
  const transitionPerSentence = transitionHitCount / sentenceCount;
  const titleLower = String(title || "").toLowerCase();
  const slugLower = String(slug || "").toLowerCase();
  const metaTitleLower = String(metaTitle || title || "").toLowerCase();

  let yoast = 0;
  if (kw && titleLower.includes(kw)) yoast += 8;
  if (kw && introWordsText.includes(kw)) yoast += 6;
  if (kw) {
    if (keywordDensity >= safeBenchmark.keywordDensityMin && keywordDensity <= safeBenchmark.keywordDensityMax) yoast += 10;
    else if (keywordDensity > 0.3 && keywordDensity <= safeBenchmark.keywordDensityMax * 1.5) yoast += 5;
  }
  if (avgSentenceLength <= 20) yoast += 6;
  else if (avgSentenceLength <= 24) yoast += 3;
  if (transitionPerSentence >= 0.3) yoast += 5;
  else if (transitionPerSentence >= 0.15) yoast += 3;
  if (metaDescription.length >= safeBenchmark.metaDescriptionMin && metaDescription.length <= safeBenchmark.metaDescriptionMax) yoast += 5;

  let rankMath = 0;
  if (kw && slugLower.includes(kw)) rankMath += 6;
  if (kw && headings.some((h) => h.includes(kw))) rankMath += 6;
  const mtLen = String(metaTitle || title || "").trim().length;
  if (mtLen >= safeBenchmark.metaTitleMin && mtLen <= safeBenchmark.metaTitleMax) rankMath += 6;
  else if (mtLen >= 30 && mtLen <= 75) rankMath += 3;
  if (wordCount >= safeBenchmark.wordCount) rankMath += 7;
  else if (wordCount >= Math.round(safeBenchmark.wordCount * 0.6)) rankMath += 4;
  if (internalLinks.length >= safeBenchmark.internalLinks) rankMath += 5;
  else if (internalLinks.length >= Math.max(1, Math.floor(safeBenchmark.internalLinks / 2))) rankMath += 3;
  if (externalLinks.length >= safeBenchmark.externalLinks) rankMath += 3;
  else if (externalLinks.length >= 1) rankMath += 2;
  if (excerpt.trim().length >= 80) rankMath += 2;
  else if (excerpt.trim().length > 0) rankMath += 1;

  let jasper = 0;
  if (POWER_WORDS.some((token) => titleLower.includes(token) || metaTitleLower.includes(token))) jasper += 5;
  if (CTA_PHRASES.some((token) => plainText.toLowerCase().includes(token))) jasper += 5;
  if (/[?]/.test(title) || headings.some((h) => h.includes("how ") || h.includes("why ") || h.includes("what "))) jasper += 2;
  if (avgSentenceLength <= 18) jasper += 3;

  let competitive = 0;
  const contentRatio = Math.min(1, safeBenchmark.wordCount > 0 ? wordCount / safeBenchmark.wordCount : 0);
  competitive += 3 * contentRatio;
  const headingRatio = Math.min(1, safeBenchmark.headingCount > 0 ? headings.length / safeBenchmark.headingCount : 0);
  competitive += 2 * headingRatio;
  const internalRatio = Math.min(1, safeBenchmark.internalLinks > 0 ? internalLinks.length / safeBenchmark.internalLinks : 0);
  competitive += 3 * internalRatio;
  const externalRatio = Math.min(1, safeBenchmark.externalLinks > 0 ? externalLinks.length / safeBenchmark.externalLinks : 0);
  competitive += 2 * externalRatio;

  const total = Math.min(100, Math.max(0, roundInt(yoast + rankMath + jasper + competitive)));

  return {
    score: total,
    breakdown: {
      yoast: roundInt(yoast),
      rankMath: roundInt(rankMath),
      jasper: roundInt(jasper),
      competitive: roundInt(competitive),
      keywordDensity: Number(keywordDensity.toFixed(2)),
      wordCount,
      headingCount: headings.length,
      internalLinkCount: internalLinks.length,
      externalLinkCount: externalLinks.length,
      metaTitleLength: mtLen,
      metaDescriptionLength: String(metaDescription || "").trim().length,
      excerptLength: String(excerpt || "").trim().length,
    },
    internalLinks: internalLinks.slice(0, 25),
  };
};

const buildBlogSeoDiagnostics = (article = {}, benchmark = DEFAULT_COMPETITOR_BENCHMARK) => {
  const signals = computeBlogSeoScore({
    title: article.title || "",
    slug: article.slug || "",
    metaTitle: article.metaTitle || article.title || "",
    metaDescription: article.metaDescription || article.excerpt || "",
    excerpt: article.excerpt || "",
    content: article.content || "",
    focusKeyword: article.focusKeyword || "",
    benchmark,
  });

  const storedScore = asNumber(article.seoScore, 0);

  return {
    ...article,
    seoInsights: signals.breakdown,
    seoRecommendations: buildBlogSeoRecommendations({ article, signals, benchmark }),
    seoScoreCurrent: signals.score,
    seoScoreDelta: signals.score - storedScore,
    internalLinks: Array.isArray(article.internalLinks) && article.internalLinks.length > 0
      ? article.internalLinks
      : signals.internalLinks,
  };
};

export const ensurePostPublishFollowUpTask = async (sql, article = {}, actorId = "system") => {
  if (!article?.id) return { created: false, reason: "missing-article-id" };

  const existing = await sql`
    SELECT id
    FROM seo_tasks
    WHERE action_type = 'post_publish_review'
      AND source_type = 'blog_article'
      AND source_ref = ${article.id}
    LIMIT 1
  `;

  if (existing[0]) {
    return { created: false, taskId: existing[0].id, reason: "already-exists" };
  }

  const taskId = createId("seo-task");
  const title = `Review published article: ${article.title || article.slug || article.id}`;
  const notes = `Check indexing, CTR trend, and internal links for /blog/${article.slug || article.id}.`;
  const dueAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  await sql`
    INSERT INTO seo_tasks (
      id,
      title,
      action_type,
      source_type,
      source_ref,
      status,
      priority,
      due_at,
      notes,
      payload,
      created_by,
      updated_by,
      updated_at
    ) VALUES (
      ${taskId},
      ${title},
      ${"post_publish_review"},
      ${"blog_article"},
      ${article.id},
      ${"open"},
      ${"medium"},
      ${dueAt},
      ${notes},
      ${JSON.stringify({ slug: article.slug || null, publishedAt: article.publishedAt || null })},
      ${actorId},
      ${actorId},
      NOW()
    )
  `;

  await sql`
    INSERT INTO seo_task_events (
      task_id,
      event_type,
      event_note,
      actor_id,
      metadata
    ) VALUES (
      ${taskId},
      ${"created"},
      ${"Auto-created after article publish"},
      ${actorId},
      ${JSON.stringify({ articleId: article.id, slug: article.slug || null })}
    )
  `;

  return { created: true, taskId };
};

export const getAdminSeoDashboard = async ({ headers = {}, query = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  const rangeDaysRaw = Number(query.rangeDays || 30);
  const rangeDays = Number.isFinite(rangeDaysRaw) ? Math.min(Math.max(rangeDaysRaw, 7), 180) : 30;

  try {
    const sql = getNeonSql();

    const [articleCounts, taskCounts, publishQueueCounts, metricRows, recentTasks, lastSitemapRun] = await Promise.all([
      sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'published')::int AS published_count,
          COUNT(*) FILTER (WHERE status <> 'published')::int AS draft_count,
          COUNT(*) FILTER (WHERE status = 'published' AND published_at >= NOW() - INTERVAL '30 days')::int AS published_last_30
        FROM blog_articles
      `,
      sql`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('open', 'in_progress'))::int AS open_count,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count,
          COUNT(*) FILTER (WHERE status IN ('open', 'in_progress') AND due_at IS NOT NULL AND due_at < NOW())::int AS overdue_count
        FROM seo_tasks
      `,
      sql`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('queued', 'approved'))::int AS pending_count,
          COUNT(*) FILTER (WHERE status = 'published')::int AS published_count
        FROM seo_publish_queue
      `,
      sql`
        SELECT metric_key, SUM(metric_value) AS value
        FROM seo_metrics_daily
        WHERE metric_date >= (CURRENT_DATE - (${rangeDays} * INTERVAL '1 day'))
        GROUP BY metric_key
      `,
      sql`
        SELECT
          id,
          title,
          action_type AS "actionType",
          source_type AS "sourceType",
          source_ref AS "sourceRef",
          status,
          priority,
          due_at AS "dueAt",
          notes,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM seo_tasks
        ORDER BY
          CASE status
            WHEN 'open' THEN 0
            WHEN 'in_progress' THEN 1
            WHEN 'completed' THEN 2
            ELSE 3
          END,
          due_at ASC NULLS LAST,
          updated_at DESC
        LIMIT 12
      `,
      sql`
        SELECT
          id,
          job_name AS "jobName",
          status,
          trigger_source AS "triggerSource",
          started_at AS "startedAt",
          finished_at AS "finishedAt"
        FROM seo_job_runs
        WHERE job_name = 'sitemap_refresh' AND status = 'success'
        ORDER BY started_at DESC
        LIMIT 1
      `,
    ]);

    const metrics = getMetricMap(metricRows);
    const articleSummary = articleCounts[0] || {};
    const taskSummary = taskCounts[0] || {};
    const queueSummary = publishQueueCounts[0] || {};

    const gscClicks = asNumber(metrics.gsc_clicks);
    const gscImpressions = asNumber(metrics.gsc_impressions);
    const gscCtr = asNumber(metrics.gsc_ctr, gscImpressions > 0 ? gscClicks / gscImpressions : 0);
    const gscAvgPosition = asNumber(metrics.gsc_avg_position);
    const gaSessions = asNumber(metrics.ga_sessions);
    const gaConversions = asNumber(metrics.ga_conversions);

    const followUp = [];
    if (gscImpressions > 100 && gscCtr > 0 && gscCtr < 0.02) {
      followUp.push({
        id: "low-ctr",
        actionType: "content_task",
        sourceType: "gsc",
        sourceRef: "sitewide-low-ctr",
        priority: "high",
        title: "Improve low CTR pages with refreshed titles/meta descriptions",
        notes: `CTR is ${(gscCtr * 100).toFixed(2)}% over the selected period.`,
      });
    }

    if (asNumber(articleSummary.published_last_30) < 2) {
      followUp.push({
        id: "low-publishing-cadence",
        actionType: "rewrite_task",
        sourceType: "local",
        sourceRef: "publishing-cadence",
        priority: "medium",
        title: "Schedule at least 2 SEO article updates this month",
        notes: "Recent publishing cadence is below target.",
      });
    }

    if (asNumber(queueSummary.pending_count) > 0) {
      followUp.push({
        id: "publish-queue",
        actionType: "publish_queue",
        sourceType: "local",
        sourceRef: "seo_publish_queue",
        priority: "medium",
        title: "Review and publish queued SEO drafts",
        notes: `${asNumber(queueSummary.pending_count)} item(s) waiting in publish queue.`,
      });
    }

    if (asNumber(taskSummary.overdue_count) > 0) {
      followUp.push({
        id: "overdue-reminder",
        actionType: "send_reminder",
        sourceType: "local",
        sourceRef: "overdue-seo-tasks",
        priority: "high",
        title: "Send reminders for overdue SEO tasks",
        notes: `${asNumber(taskSummary.overdue_count)} overdue task(s) require follow-up.`,
      });
    }

    return {
      status: 200,
      body: {
        ok: true,
        rangeDays,
        kpis: {
          gscClicks,
          gscImpressions,
          gscCtr,
          gscAvgPosition,
          gaSessions,
          gaConversions,
          publishedArticles: asNumber(articleSummary.published_count),
          draftArticles: asNumber(articleSummary.draft_count),
          publishedLast30: asNumber(articleSummary.published_last_30),
          openTasks: asNumber(taskSummary.open_count),
          completedTasks: asNumber(taskSummary.completed_count),
          overdueTasks: asNumber(taskSummary.overdue_count),
          queuePending: asNumber(queueSummary.pending_count),
          queuePublished: asNumber(queueSummary.published_count),
          lastSitemapRefreshAt: lastSitemapRun[0]?.finishedAt || lastSitemapRun[0]?.startedAt || null,
        },
        followUp,
        recentTasks,
      },
    };
  } catch (error) {
    const message = error?.message || "Failed to load SEO dashboard";
    const missingTables = message.toLowerCase().includes("relation \"seo_") || message.toLowerCase().includes("relation \"blog_articles\"");
    return {
      status: missingTables ? 501 : 500,
      body: {
        ok: false,
        message: missingTables ? "SEO tables are not ready. Run database migrations first." : message,
      },
    };
  }
};

export const getAdminSeoTasks = async ({ headers = {}, query = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  const statusFilter = String(query.status || "").trim().toLowerCase();

  try {
    const sql = getNeonSql();
    const rows = await sql`
      SELECT
        id,
        title,
        action_type AS "actionType",
        source_type AS "sourceType",
        source_ref AS "sourceRef",
        status,
        priority,
        due_at AS "dueAt",
        notes,
        payload,
        created_by AS "createdBy",
        updated_by AS "updatedBy",
        completed_at AS "completedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM seo_tasks
      WHERE (${statusFilter} = '' OR status = ${statusFilter})
      ORDER BY due_at ASC NULLS LAST, updated_at DESC
      LIMIT 100
    `;

    return { status: 200, body: { ok: true, items: rows } };
  } catch (error) {
    const message = error?.message || "Failed to load SEO tasks";
    const missingTable = message.toLowerCase().includes("relation \"seo_tasks\"");
    return {
      status: missingTable ? 501 : 500,
      body: { ok: false, message: missingTable ? "SEO task tables are not ready. Run database migrations first." : message },
    };
  }
};

export const getAdminLlmProviderHealth = async ({ headers = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  try {
    const activeProvider = normalizeLlmProvider(process.env.LLM_PROVIDER || "github");
    const providers = ["github", "openai", "anthropic", "grok"].map((providerName) => {
      const config = resolveLlmProviderConfig({ providerInput: providerName });
      return {
        provider: providerName,
        configured: Boolean(config.apiKey),
        model: config.model,
        apiUrl: config.apiUrl,
        isActive: providerName === activeProvider,
      };
    });

    return {
      status: 200,
      body: {
        ok: true,
        activeProvider,
        providers,
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: { ok: false, message: error?.message || "Failed to load LLM provider health" },
    };
  }
};

export const createAdminSeoTask = async ({ headers = {}, body = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  const title = String(body.title || "").trim();
  const actionType = String(body.actionType || "content_task").trim();
  const sourceType = String(body.sourceType || "local").trim();
  const sourceRef = String(body.sourceRef || "").trim();
  const status = String(body.status || "open").trim();
  const priority = String(body.priority || "medium").trim();
  const dueAt = toIsoOrNull(body.dueAt);
  const notes = String(body.notes || "").trim();
  const payload = body.payload && typeof body.payload === "object" ? body.payload : {};

  if (!title) {
    return { status: 400, body: { ok: false, message: "Task title is required" } };
  }

  const actorId = auth.payload?.sub || "admin";
  const id = createId("seo-task");

  try {
    const sql = getNeonSql();

    const rows = await sql`
      INSERT INTO seo_tasks (
        id,
        title,
        action_type,
        source_type,
        source_ref,
        status,
        priority,
        due_at,
        notes,
        payload,
        created_by,
        updated_by,
        updated_at
      ) VALUES (
        ${id},
        ${title},
        ${actionType},
        ${sourceType},
        ${sourceRef || null},
        ${status},
        ${priority},
        ${dueAt},
        ${notes || null},
        ${JSON.stringify(payload)},
        ${actorId},
        ${actorId},
        NOW()
      )
      RETURNING
        id,
        title,
        action_type AS "actionType",
        source_type AS "sourceType",
        source_ref AS "sourceRef",
        status,
        priority,
        due_at AS "dueAt",
        notes,
        payload,
        created_by AS "createdBy",
        updated_by AS "updatedBy",
        completed_at AS "completedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    await sql`
      INSERT INTO seo_task_events (
        task_id,
        event_type,
        event_note,
        actor_id,
        metadata
      ) VALUES (
        ${id},
        ${"created"},
        ${notes || "Task created"},
        ${actorId},
        ${JSON.stringify({ actionType, sourceType, sourceRef })}
      )
    `;

    return {
      status: 201,
      body: {
        ok: true,
        item: rows[0],
      },
    };
  } catch (error) {
    return { status: 500, body: { ok: false, message: error?.message || "Failed to create SEO task" } };
  }
};

export const updateAdminSeoTask = async ({ headers = {}, taskId, body = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  if (!taskId) {
    return { status: 400, body: { ok: false, message: "Task ID is required" } };
  }

  const actorId = auth.payload?.sub || "admin";

  try {
    const sql = getNeonSql();

    const existingRows = await sql`
      SELECT id, title, status, priority, notes, due_at AS "dueAt"
      FROM seo_tasks
      WHERE id = ${taskId}
      LIMIT 1
    `;
    const existing = existingRows[0];

    if (!existing) {
      return { status: 404, body: { ok: false, message: "SEO task not found" } };
    }

    const nextTitle = String(body.title ?? existing.title).trim();
    const nextStatus = String(body.status ?? existing.status).trim();
    const nextPriority = String(body.priority ?? existing.priority).trim();
    const nextNotes = String(body.notes ?? existing.notes ?? "").trim();
    const dueAtRaw = body.dueAt === undefined ? existing.dueAt : body.dueAt;
    const nextDueAt = toIsoOrNull(dueAtRaw);

    const rows = await sql`
      UPDATE seo_tasks
      SET
        title = ${nextTitle},
        status = ${nextStatus},
        priority = ${nextPriority},
        notes = ${nextNotes || null},
        due_at = ${nextDueAt},
        completed_at = ${nextStatus === "completed" ? new Date().toISOString() : null},
        updated_by = ${actorId},
        updated_at = NOW()
      WHERE id = ${taskId}
      RETURNING
        id,
        title,
        action_type AS "actionType",
        source_type AS "sourceType",
        source_ref AS "sourceRef",
        status,
        priority,
        due_at AS "dueAt",
        notes,
        payload,
        created_by AS "createdBy",
        updated_by AS "updatedBy",
        completed_at AS "completedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    await sql`
      INSERT INTO seo_task_events (
        task_id,
        event_type,
        event_note,
        actor_id,
        metadata
      ) VALUES (
        ${taskId},
        ${"updated"},
        ${nextNotes || "Task updated"},
        ${actorId},
        ${JSON.stringify({ status: nextStatus, priority: nextPriority, dueAt: nextDueAt })}
      )
    `;

    return { status: 200, body: { ok: true, item: rows[0] } };
  } catch (error) {
    return { status: 500, body: { ok: false, message: error?.message || "Failed to update SEO task" } };
  }
};

export const remindAdminSeoTask = async ({ headers = {}, taskId, body = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  if (!taskId) {
    return { status: 400, body: { ok: false, message: "Task ID is required" } };
  }

  const actorId = auth.payload?.sub || "admin";
  const note = String(body.note || "Reminder sent for SEO follow-up.").trim();

  try {
    const sql = getNeonSql();
    const rows = await sql`
      SELECT id, status
      FROM seo_tasks
      WHERE id = ${taskId}
      LIMIT 1
    `;

    if (!rows[0]) {
      return { status: 404, body: { ok: false, message: "SEO task not found" } };
    }

    await sql`
      INSERT INTO seo_task_events (
        task_id,
        event_type,
        event_note,
        actor_id,
        metadata
      ) VALUES (
        ${taskId},
        ${"reminder_sent"},
        ${note},
        ${actorId},
        ${JSON.stringify({ status: rows[0].status })}
      )
    `;

    return { status: 200, body: { ok: true, message: "Reminder logged" } };
  } catch (error) {
    return { status: 500, body: { ok: false, message: error?.message || "Failed to send reminder" } };
  }
};

export const getAdminSeoCompetitorBenchmark = async ({ headers = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  try {
    const sql = getNeonSql();
    const rows = await sql`
      SELECT
        id,
        source,
        benchmark,
        snapshots,
        notes,
        updated_by AS "updatedBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM seo_competitor_benchmarks
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    const item = rows[0] || null;
    return {
      status: 200,
      body: {
        ok: true,
        item,
        effectiveBenchmark: await getCompetitorBenchmark(sql),
      },
    };
  } catch (error) {
    const message = error?.message || "Failed to load competitor benchmark";
    const missingTable = message.toLowerCase().includes("relation \"seo_competitor_benchmarks\" does not exist");
    if (missingTable) {
      return {
        status: 200,
        body: {
          ok: true,
          item: null,
          effectiveBenchmark: await getCompetitorBenchmark(null),
          message: "Benchmark table not found yet. Using env/default benchmark.",
        },
      };
    }

    return { status: 500, body: { ok: false, message } };
  }
};

export const upsertAdminSeoCompetitorBenchmark = async ({ headers = {}, body = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  const actorId = auth.payload?.sub || "admin";
  const source = String(body.source || "manual").trim().toLowerCase();
  const notes = String(body.notes || "").trim() || null;
  const snapshots = Array.isArray(body.snapshots) ? body.snapshots.slice(0, 300) : [];

  const incomingBenchmark = body.benchmark && typeof body.benchmark === "object" ? body.benchmark : null;
  const derivedBenchmark = snapshots.length > 0 ? deriveBenchmarkFromSnapshots(snapshots) : null;
  const benchmark = normalizeBenchmark(incomingBenchmark || derivedBenchmark || DEFAULT_COMPETITOR_BENCHMARK);

  if (benchmark.keywordDensityMin >= benchmark.keywordDensityMax) {
    return {
      status: 400,
      body: { ok: false, message: "keywordDensityMin must be lower than keywordDensityMax" },
    };
  }

  try {
    const sql = getNeonSql();
    const id = createId("seo-benchmark");

    const rows = await sql`
      INSERT INTO seo_competitor_benchmarks (
        id,
        source,
        benchmark,
        snapshots,
        notes,
        updated_by,
        updated_at
      ) VALUES (
        ${id},
        ${source},
        ${JSON.stringify(benchmark)},
        ${JSON.stringify(snapshots)},
        ${notes},
        ${actorId},
        NOW()
      )
      RETURNING
        id,
        source,
        benchmark,
        snapshots,
        notes,
        updated_by AS "updatedBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `;

    return {
      status: 200,
      body: {
        ok: true,
        item: rows[0],
        effectiveBenchmark: benchmark,
        derivedFromSnapshots: snapshots.length > 0,
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: { ok: false, message: error?.message || "Failed to update competitor benchmark" },
    };
  }
};

export const getAdminBlogArticles = async ({ headers = {}, query = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  const statusFilter = String(query.status || "all").trim().toLowerCase();
  const parsedLimit = Number(query.limit || 50);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 50;

  try {
    const sql = getNeonSql();
    const benchmark = await getCompetitorBenchmark(sql);
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
      WHERE (${statusFilter} = 'all' OR status = ${statusFilter})
      ORDER BY published_at DESC NULLS LAST, updated_at DESC
      LIMIT ${limit}
    `;

    return {
      status: 200,
      body: {
        ok: true,
        items: rows.map((row) => buildBlogSeoDiagnostics(row, benchmark)),
        benchmark,
      },
    };
  } catch (error) {
    const message = error?.message || "Failed to load admin blog articles";
    const missingTable = message.toLowerCase().includes("relation \"blog_articles\" does not exist");
    return {
      status: missingTable ? 501 : 500,
      body: {
        ok: false,
        message: missingTable ? "Blog tables are not ready. Run database migrations first." : message,
      },
    };
  }
};

export const generateAdminBlogDraft = async ({ headers = {}, body = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  const titleHint = String(body.title || "").trim();
  const focusKeyword = String(body.focusKeyword || "").trim();
  const audience = String(body.audience || "Kenyan online shoppers").trim();
  const intent = String(body.intent || "commercial").trim();
  const tone = String(body.tone || "helpful and confident").trim();
  const providerInput = String(body.provider || "").trim();
  const customModel = String(body.model || "").trim();

  if (!titleHint && !focusKeyword) {
    return {
      status: 400,
      body: { ok: false, message: "Provide at least a title or focus keyword to generate a draft." },
    };
  }

  const llm = resolveLlmProviderConfig({ providerInput, modelOverride: customModel });
  const apiKey = llm.apiKey;
  if (!apiKey) {
    return {
      status: 503,
      body: {
        ok: false,
        message: llm.missingKeyMessage,
      },
    };
  }

  const apiUrl = llm.apiUrl;
  const model = llm.model;

  const prompt = {
    topic: titleHint || focusKeyword,
    titleHint,
    focusKeyword,
    audience,
    intent,
    tone,
    requirements: {
      wordCountTarget: "900-1300",
      includeHeadings: true,
      includeFaqSection: true,
      includeCallToAction: true,
      locale: "Kenya",
      style: "SEO-friendly and conversion-aware",
    },
    outputSchema: {
      title: "string",
      slug: "string",
      excerpt: "string",
      contentHtml: "string",
      focusKeyword: "string",
      metaTitle: "string",
      metaDescription: "string",
    },
  };

  try {
    const systemPrompt =
      "You are an SEO content strategist for an ecommerce store. Return ONLY valid JSON matching the requested schema. No markdown wrappers.";
    const userPrompt = `Generate a high-quality blog article draft using this JSON input: ${JSON.stringify(prompt)}`;

    const requestBody =
      llm.apiType === "anthropic"
        ? {
            model,
            max_tokens: 2400,
            temperature: 0.4,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          }
        : {
            model,
            temperature: 0.4,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          };

    const requestHeaders =
      llm.apiType === "anthropic"
        ? {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          }
        : {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        status: 502,
        body: {
          ok: false,
          message: data?.error?.message || data?.message || "AI generation request failed.",
        },
      };
    }

    const rawText =
      data?.content?.[0]?.text ||
      data?.choices?.[0]?.message?.content ||
      data?.output?.[0]?.content?.[0]?.text ||
      "";

    const parsed = extractJsonObjectFromText(rawText);
    if (!parsed || typeof parsed !== "object") {
      return {
        status: 502,
        body: { ok: false, message: "AI response could not be parsed into JSON draft format." },
      };
    }

    const finalTitle = String(parsed.title || titleHint || focusKeyword || "New article").trim();
    const finalSlug = slugify(parsed.slug || finalTitle);
    const plainContent = String(parsed.content || "").trim();
    const generatedContent = String(parsed.contentHtml || "").trim() || toSafeHtmlParagraphs(plainContent);
    const generatedExcerpt = String(parsed.excerpt || "").trim();

    const item = {
      title: finalTitle,
      slug: finalSlug,
      excerpt: generatedExcerpt,
      content: generatedContent,
      focusKeyword: String(parsed.focusKeyword || focusKeyword || "").trim(),
      metaTitle: String(parsed.metaTitle || finalTitle).trim(),
      metaDescription: String(parsed.metaDescription || generatedExcerpt).trim(),
      status: "draft",
      source: "ai",
    };

    return {
      status: 200,
      body: {
        ok: true,
        item,
        providerUsed: llm.provider,
        modelUsed: model,
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: { ok: false, message: error?.message || "Failed to generate AI blog draft" },
    };
  }
};

export const runAdminBlogSeoRescore = async ({ headers = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  try {
    const sql = getNeonSql();
    const benchmark = await getCompetitorBenchmark(sql);
    const rows = await sql`
      SELECT
        id,
        slug,
        title,
        excerpt,
        content,
        focus_keyword AS "focusKeyword",
        meta_title AS "metaTitle",
        meta_description AS "metaDescription",
        seo_score AS "seoScore",
        internal_links AS "internalLinks"
      FROM blog_articles
      ORDER BY updated_at DESC
      LIMIT 5000
    `;

    let updatedCount = 0;
    let changedCount = 0;

    for (const row of rows) {
      const diagnostics = buildBlogSeoDiagnostics(row, benchmark);
      const nextLinks = JSON.stringify(diagnostics.internalLinks || []);
      const previousLinks = JSON.stringify(Array.isArray(row.internalLinks) ? row.internalLinks : []);
      const nextScore = asNumber(diagnostics.seoScoreCurrent, 0);
      const prevScore = asNumber(row.seoScore, 0);
      const hasChanged = nextScore !== prevScore || nextLinks !== previousLinks;

      await sql`
        UPDATE blog_articles
        SET
          seo_score = ${nextScore},
          internal_links = ${nextLinks}
        WHERE id = ${row.id}
      `;

      updatedCount += 1;
      if (hasChanged) changedCount += 1;
    }

    return {
      status: 200,
      body: {
        ok: true,
        summary: {
          updatedCount,
          changedCount,
        },
        benchmark,
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: { ok: false, message: error?.message || "Failed to re-score blog articles" },
    };
  }
};

export const createAdminBlogArticle = async ({ headers = {}, body = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  const title = String(body.title || "").trim();
  if (!title) {
    return { status: 400, body: { ok: false, message: "Article title is required" } };
  }

  const actorId = auth.payload?.sub || "admin";
  const requestedSlug = slugify(body.slug || title);
  const status = normalizeStatus(body.status);
  const excerpt = String(body.excerpt || "").trim();
  const content = String(body.content || "").trim();
  const focusKeyword = String(body.focusKeyword || "").trim();
  const metaTitle = String(body.metaTitle || title).trim();
  const metaDescription = String(body.metaDescription || excerpt || "").trim();
  const source = String(body.source || "machine").trim() || "machine";
  const requestedPublishedAt = toIsoOrNull(body.publishedAt);
  const publishedAt = status === "published" ? requestedPublishedAt || new Date().toISOString() : null;
  const id = createId("blog");

  try {
    const sql = getNeonSql();
    const benchmark = await getCompetitorBenchmark(sql);
    const slug = await buildUniqueBlogSlug(sql, requestedSlug);
    const seoSignals = computeBlogSeoScore({
      title,
      slug,
      metaTitle,
      metaDescription,
      excerpt,
      content,
      focusKeyword,
      benchmark,
    });

    const rows = await sql`
      INSERT INTO blog_articles (
        id,
        slug,
        title,
        excerpt,
        content,
        status,
        source,
        focus_keyword,
        meta_title,
        meta_description,
        seo_score,
        internal_links,
        created_by,
        published_at,
        updated_at
      ) VALUES (
        ${id},
        ${slug},
        ${title},
        ${excerpt || null},
        ${content || null},
        ${status},
        ${source},
        ${focusKeyword || null},
        ${metaTitle || null},
        ${metaDescription || null},
        ${seoSignals.score},
        ${JSON.stringify(seoSignals.internalLinks || [])},
        ${actorId},
        ${publishedAt},
        NOW()
      )
      RETURNING
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
    `;

    if (rows[0]?.status === "published" && (!rows[0]?.publishedAt || new Date(rows[0].publishedAt).getTime() <= Date.now())) {
      await ensurePostPublishFollowUpTask(sql, rows[0], actorId);
    }

    return {
      status: 201,
      body: {
        ok: true,
        item: rows[0],
        seoInsights: seoSignals.breakdown,
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: { ok: false, message: error?.message || "Failed to create blog article" },
    };
  }
};

export const updateAdminBlogArticle = async ({ headers = {}, articleId, body = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  if (!articleId) {
    return { status: 400, body: { ok: false, message: "Article ID is required" } };
  }

  const actorId = auth.payload?.sub || "admin";

  try {
    const sql = getNeonSql();
    const existingRows = await sql`
      SELECT id, slug, title, status, published_at AS "publishedAt"
      FROM blog_articles
      WHERE id = ${articleId}
      LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) {
      return { status: 404, body: { ok: false, message: "Blog article not found" } };
    }

    const nextTitle = String(body.title ?? existing.title).trim();
    const nextStatus = normalizeStatus(body.status ?? existing.status);
    const requestedSlug = slugify(body.slug ?? existing.slug ?? nextTitle);
    const nextSlug = await buildUniqueBlogSlug(sql, requestedSlug, existing.id);
    const nextExcerpt = String(body.excerpt ?? "").trim();
    const nextContent = String(body.content ?? "").trim();
    const nextFocusKeyword = String(body.focusKeyword ?? "").trim();
    const nextMetaTitle = String(body.metaTitle ?? nextTitle).trim();
    const nextMetaDescription = String(body.metaDescription ?? nextExcerpt).trim();
    const requestedPublishedAt = body.publishedAt === undefined ? existing.publishedAt : toIsoOrNull(body.publishedAt);
    const nextPublishedAt =
      nextStatus === "published"
        ? requestedPublishedAt || new Date().toISOString()
        : null;
    const benchmark = await getCompetitorBenchmark(sql);
    const nextSeoSignals = computeBlogSeoScore({
      title: nextTitle,
      slug: nextSlug,
      metaTitle: nextMetaTitle,
      metaDescription: nextMetaDescription,
      excerpt: nextExcerpt,
      content: nextContent,
      focusKeyword: nextFocusKeyword,
      benchmark,
    });

    const rows = await sql`
      UPDATE blog_articles
      SET
        slug = ${nextSlug},
        title = ${nextTitle},
        excerpt = ${nextExcerpt || null},
        content = ${nextContent || null},
        status = ${nextStatus},
        focus_keyword = ${nextFocusKeyword || null},
        meta_title = ${nextMetaTitle || null},
        meta_description = ${nextMetaDescription || null},
        seo_score = ${nextSeoSignals.score},
        internal_links = ${JSON.stringify(nextSeoSignals.internalLinks || [])},
        published_at = ${nextPublishedAt},
        updated_at = NOW()
      WHERE id = ${articleId}
      RETURNING
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
    `;

    if (rows[0]?.status === "published" && (!rows[0]?.publishedAt || new Date(rows[0].publishedAt).getTime() <= Date.now())) {
      await ensurePostPublishFollowUpTask(sql, rows[0], actorId);
    }

    return {
      status: 200,
      body: {
        ok: true,
        item: rows[0],
        updatedBy: actorId,
        seoInsights: nextSeoSignals.breakdown,
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: { ok: false, message: error?.message || "Failed to update blog article" },
    };
  }
};

export const deleteAdminBlogArticle = async ({ headers = {}, articleId } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  if (!articleId) {
    return { status: 400, body: { ok: false, message: "Article ID is required" } };
  }

  try {
    const sql = getNeonSql();
    const rows = await sql`
      DELETE FROM blog_articles
      WHERE id = ${articleId}
      RETURNING id
    `;

    if (!rows[0]) {
      return { status: 404, body: { ok: false, message: "Blog article not found" } };
    }

    return { status: 200, body: { ok: true, deletedId: rows[0].id } };
  } catch (error) {
    return {
      status: 500,
      body: { ok: false, message: error?.message || "Failed to delete blog article" },
    };
  }
};

export const runAdminBlogPublishSweep = async ({ headers = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  const actorId = auth.payload?.sub || "admin";
  const runId = createId("seo-job");

  try {
    const sql = getNeonSql();
    await sql`
      INSERT INTO seo_job_runs (
        id,
        job_name,
        status,
        trigger_source,
        summary,
        started_at,
        created_at
      ) VALUES (
        ${runId},
        ${"blog_publish_sweep"},
        ${"running"},
        ${"manual"},
        ${JSON.stringify({})},
        NOW(),
        NOW()
      )
    `;

    const dueArticles = await sql`
      SELECT id, slug, title, published_at AS "publishedAt"
      FROM blog_articles
      WHERE status = 'published'
        AND (published_at IS NULL OR published_at <= NOW())
      ORDER BY published_at DESC NULLS LAST, updated_at DESC
      LIMIT 500
    `;

    let createdTasks = 0;
    for (const article of dueArticles) {
      const taskResult = await ensurePostPublishFollowUpTask(sql, article, actorId);
      if (taskResult.created) createdTasks += 1;
    }

    const summary = {
      processedArticles: dueArticles.length,
      createdTasks,
    };

    await sql`
      UPDATE seo_job_runs
      SET
        status = ${"success"},
        summary = ${JSON.stringify(summary)},
        finished_at = NOW()
      WHERE id = ${runId}
    `;

    return {
      status: 200,
      body: {
        ok: true,
        runId,
        summary,
      },
    };
  } catch (error) {
    try {
      const sql = getNeonSql();
      await sql`
        UPDATE seo_job_runs
        SET
          status = ${"failed"},
          error_message = ${String(error?.message || "Unknown error")},
          finished_at = NOW()
        WHERE id = ${runId}
      `;
    } catch {
      // Best effort failure logging.
    }

    return {
      status: 500,
      body: { ok: false, message: error?.message || "Blog publish sweep failed" },
    };
  }
};

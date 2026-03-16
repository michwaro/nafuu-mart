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

const safeParseBenchmark = (raw) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const getCompetitorBenchmark = () => {
  const parsed = safeParseBenchmark(process.env.SEO_COMPETITOR_BENCHMARK_JSON);
  return { ...DEFAULT_COMPETITOR_BENCHMARK, ...(parsed || {}) };
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
} = {}) => {
  const benchmark = getCompetitorBenchmark();
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
    if (keywordDensity >= benchmark.keywordDensityMin && keywordDensity <= benchmark.keywordDensityMax) yoast += 10;
    else if (keywordDensity > 0.3 && keywordDensity <= benchmark.keywordDensityMax * 1.5) yoast += 5;
  }
  if (avgSentenceLength <= 20) yoast += 6;
  else if (avgSentenceLength <= 24) yoast += 3;
  if (transitionPerSentence >= 0.3) yoast += 5;
  else if (transitionPerSentence >= 0.15) yoast += 3;
  if (metaDescription.length >= benchmark.metaDescriptionMin && metaDescription.length <= benchmark.metaDescriptionMax) yoast += 5;

  let rankMath = 0;
  if (kw && slugLower.includes(kw)) rankMath += 6;
  if (kw && headings.some((h) => h.includes(kw))) rankMath += 6;
  const mtLen = String(metaTitle || title || "").trim().length;
  if (mtLen >= benchmark.metaTitleMin && mtLen <= benchmark.metaTitleMax) rankMath += 6;
  else if (mtLen >= 30 && mtLen <= 75) rankMath += 3;
  if (wordCount >= benchmark.wordCount) rankMath += 7;
  else if (wordCount >= Math.round(benchmark.wordCount * 0.6)) rankMath += 4;
  if (internalLinks.length >= benchmark.internalLinks) rankMath += 5;
  else if (internalLinks.length >= Math.max(1, Math.floor(benchmark.internalLinks / 2))) rankMath += 3;
  if (externalLinks.length >= benchmark.externalLinks) rankMath += 3;
  else if (externalLinks.length >= 1) rankMath += 2;
  if (excerpt.trim().length >= 80) rankMath += 2;
  else if (excerpt.trim().length > 0) rankMath += 1;

  let jasper = 0;
  if (POWER_WORDS.some((token) => titleLower.includes(token) || metaTitleLower.includes(token))) jasper += 5;
  if (CTA_PHRASES.some((token) => plainText.toLowerCase().includes(token))) jasper += 5;
  if (/[?]/.test(title) || headings.some((h) => h.includes("how ") || h.includes("why ") || h.includes("what "))) jasper += 2;
  if (avgSentenceLength <= 18) jasper += 3;

  let competitive = 0;
  const contentRatio = Math.min(1, benchmark.wordCount > 0 ? wordCount / benchmark.wordCount : 0);
  competitive += 3 * contentRatio;
  const headingRatio = Math.min(1, benchmark.headingCount > 0 ? headings.length / benchmark.headingCount : 0);
  competitive += 2 * headingRatio;
  const internalRatio = Math.min(1, benchmark.internalLinks > 0 ? internalLinks.length / benchmark.internalLinks : 0);
  competitive += 3 * internalRatio;
  const externalRatio = Math.min(1, benchmark.externalLinks > 0 ? externalLinks.length / benchmark.externalLinks : 0);
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
    },
    internalLinks: internalLinks.slice(0, 25),
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

    return { status: 200, body: { ok: true, items: rows } };
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
  const seoSignals = computeBlogSeoScore({
    title,
    slug: requestedSlug,
    metaTitle,
    metaDescription,
    excerpt,
    content,
    focusKeyword,
  });

  try {
    const sql = getNeonSql();
    const slug = await buildUniqueBlogSlug(sql, requestedSlug);

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
    const nextSeoSignals = computeBlogSeoScore({
      title: nextTitle,
      slug: nextSlug,
      metaTitle: nextMetaTitle,
      metaDescription: nextMetaDescription,
      excerpt: nextExcerpt,
      content: nextContent,
      focusKeyword: nextFocusKeyword,
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

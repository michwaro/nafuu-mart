CREATE TABLE IF NOT EXISTS blog_articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  source TEXT NOT NULL DEFAULT 'machine',
  focus_keyword TEXT,
  meta_title TEXT,
  meta_description TEXT,
  seo_score INTEGER NOT NULL DEFAULT 0,
  internal_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seo_metrics_daily (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  source TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC(14, 4) NOT NULL DEFAULT 0,
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seo_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  action_type TEXT NOT NULL,
  source_type TEXT,
  source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_at TIMESTAMPTZ,
  notes TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  updated_by TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seo_task_events (
  id BIGSERIAL PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES seo_tasks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_note TEXT,
  actor_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seo_job_runs (
  id TEXT PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seo_publish_queue (
  id TEXT PRIMARY KEY,
  article_id TEXT REFERENCES blog_articles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  scheduled_for TIMESTAMPTZ,
  approved_by TEXT,
  published_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_articles_status_published_at ON blog_articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_articles_slug ON blog_articles(slug);
CREATE INDEX IF NOT EXISTS idx_seo_metrics_daily_lookup ON seo_metrics_daily(metric_date DESC, source, metric_key);
CREATE INDEX IF NOT EXISTS idx_seo_tasks_status_due_at ON seo_tasks(status, due_at ASC);
CREATE INDEX IF NOT EXISTS idx_seo_task_events_task_id ON seo_task_events(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_job_runs_name_started_at ON seo_job_runs(job_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_publish_queue_status_scheduled_for ON seo_publish_queue(status, scheduled_for ASC);

CREATE TABLE IF NOT EXISTS seo_competitor_benchmarks (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'manual',
  benchmark JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_competitor_benchmarks_updated_at
  ON seo_competitor_benchmarks(updated_at DESC);

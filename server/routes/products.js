import { requireAdminRequest } from "../lib/clerkAuth.js";
import { getNeonSql } from "../lib/neonClient.js";

export const getProducts = async ({ query = {} } = {}) => {
  const parsedLimit = Number(query.limit || 200);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 200;

  try {
    const sql = getNeonSql();
    const items = await sql`
      SELECT
        id,
        brand,
        name,
        spec,
        grade,
        price,
        market_price AS market,
        category,
        image_url AS image,
        images,
        description,
        long_description AS "longDescription",
        in_stock AS "inStock",
        stock_status AS "stockStatus",
        stock_quantity AS "stockQuantity",
        tags,
        updated_at AS "updatedAt"
      FROM products
      ORDER BY updated_at DESC NULLS LAST, id DESC
      LIMIT ${limit}
    `;

    return {
      status: 200,
      body: {
        ok: true,
        items,
      },
    };
  } catch (error) {
    const message = error?.message || "Failed to load products";
    const missingEnv = message.includes("NEON_DATABASE_URL is not configured");
    const missingTable = message.toLowerCase().includes("relation \"products\" does not exist");

    return {
      status: missingEnv ? 503 : missingTable ? 501 : 500,
      body: {
        ok: false,
        message: missingEnv
          ? "Database not configured. Set NEON_DATABASE_URL in backend environment."
          : missingTable
            ? "Products table not found yet. Apply database migrations first."
            : message,
      },
    };
  }
};

const normalizeProductPayload = (body = {}) => ({
  id: body.id ? String(body.id) : `p${Math.random().toString(36).slice(2, 8)}`,
  brand: String(body.brand || "").trim(),
  name: String(body.name || "").trim(),
  spec: String(body.spec || "").trim(),
  category: String(body.category || "other").trim(),
  grade: String(body.grade || "").trim(),
  price: Number(body.price || 0),
  market: Number(body.market || 0),
  image: String(body.image || "").trim(),
  images: Array.isArray(body.images) ? body.images : [],
  description: String(body.description || "").trim(),
  longDescription: String(body.longDescription || "").trim(),
  stockStatus: String(body.stockStatus || "in_stock").trim(),
  stockQuantity: Math.max(0, Number(body.stockQuantity ?? 10)),
  tags: Array.isArray(body.tags) ? body.tags : [],
});

export const upsertProduct = async ({ headers = {}, body = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return {
      status: auth.status,
      body: { ok: false, message: auth.error },
    };
  }

  const payload = normalizeProductPayload(body);
  if (!payload.brand || !payload.name || !payload.spec || !Number.isFinite(payload.price) || !Number.isFinite(payload.market)) {
    return {
      status: 400,
      body: { ok: false, message: "Invalid product payload" },
    };
  }

  try {
    const sql = getNeonSql();
    const rows = await sql`
      INSERT INTO products (
        id,
        brand,
        name,
        spec,
        category,
        grade,
        price,
        market_price,
        image_url,
        images,
        description,
        long_description,
        in_stock,
        stock_status,
        stock_quantity,
        tags,
        updated_at
      ) VALUES (
        ${payload.id},
        ${payload.brand},
        ${payload.name},
        ${payload.spec},
        ${payload.category},
        ${payload.grade},
        ${payload.price},
        ${payload.market},
        ${payload.image},
        ${JSON.stringify(payload.images)},
        ${payload.description},
        ${payload.longDescription},
        ${payload.stockStatus !== "out_of_stock"},
        ${payload.stockStatus},
        ${payload.stockQuantity},
        ${JSON.stringify(payload.tags)},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET
        brand = EXCLUDED.brand,
        name = EXCLUDED.name,
        spec = EXCLUDED.spec,
        category = EXCLUDED.category,
        grade = EXCLUDED.grade,
        price = EXCLUDED.price,
        market_price = EXCLUDED.market_price,
        image_url = EXCLUDED.image_url,
        images = EXCLUDED.images,
        description = EXCLUDED.description,
        long_description = EXCLUDED.long_description,
        in_stock = EXCLUDED.in_stock,
        stock_status = EXCLUDED.stock_status,
        stock_quantity = EXCLUDED.stock_quantity,
        tags = EXCLUDED.tags,
        updated_at = NOW()
      RETURNING
        id,
        brand,
        name,
        spec,
        category,
        grade,
        price,
        market_price AS market,
        image_url AS image,
        images,
        description,
        long_description AS "longDescription",
        in_stock AS "inStock",
        stock_status AS "stockStatus",
        stock_quantity AS "stockQuantity",
        tags
    `;

    return {
      status: 200,
      body: {
        ok: true,
        item: rows[0],
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: { ok: false, message: error?.message || "Failed to save product" },
    };
  }
};

export const updateProductStock = async ({ headers = {}, productId, body = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return {
      status: auth.status,
      body: { ok: false, message: auth.error },
    };
  }

  if (!productId) {
    return {
      status: 400,
      body: { ok: false, message: "Product ID is required" },
    };
  }

  const stockStatus = String(body.stockStatus || "in_stock");
  const stockQuantity = body.stockQuantity == null ? null : Math.max(0, Number(body.stockQuantity));

  try {
    const sql = getNeonSql();
    const rows = await sql`
      UPDATE products
      SET
        stock_status = ${stockStatus},
        in_stock = ${stockStatus !== "out_of_stock"},
        stock_quantity = COALESCE(${stockQuantity}, stock_quantity),
        updated_at = NOW()
      WHERE id = ${productId}
      RETURNING
        id,
        stock_status AS "stockStatus",
        stock_quantity AS "stockQuantity",
        in_stock AS "inStock"
    `;

    if (!rows[0]) {
      return {
        status: 404,
        body: { ok: false, message: "Product not found" },
      };
    }

    return {
      status: 200,
      body: { ok: true, item: rows[0] },
    };
  } catch (error) {
    return {
      status: 500,
      body: { ok: false, message: error?.message || "Failed to update stock" },
    };
  }
};

// Normalise a raw Excel row into a clean product payload, tolerating various
// column name conventions (camelCase, snake_case, Title Case, etc.).
const normalizeExcelRow = (raw = {}) => {
  const pick = (...keys) => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== "") return raw[k];
    }
    return undefined;
  };

  const rawTags = pick("tags", "Tags");
  const tags = typeof rawTags === "string"
    ? rawTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
    : Array.isArray(rawTags) ? rawTags : [];

  return normalizeProductPayload({
    id: pick("id", "ID"),
    brand: pick("brand", "Brand"),
    name: pick("name", "Name"),
    spec: pick("spec", "Spec"),
    category: pick("category", "Category"),
    grade: pick("grade", "Grade"),
    price: pick("price", "Price"),
    market: pick("market", "market_price", "Market Price", "market price", "Market"),
    image: pick("image", "image_url", "Image", "Image URL", "image url"),
    description: pick("description", "Description"),
    longDescription: pick("long_description", "longDescription", "Long Description"),
    stockStatus: pick("stock_status", "stockStatus", "Stock Status", "stock status") || "in_stock",
    stockQuantity: pick("stock_quantity", "stockQuantity", "Stock Quantity", "stock quantity") ?? 10,
    tags,
  });
};

export const bulkUpsertProducts = async ({ headers = {}, body = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  const products = Array.isArray(body.products) ? body.products : [];
  if (products.length === 0) {
    return { status: 400, body: { ok: false, message: "No products provided" } };
  }
  if (products.length > 500) {
    return { status: 400, body: { ok: false, message: "Maximum 500 products per bulk upload" } };
  }

  const sql = getNeonSql();
  let inserted = 0;
  let updated = 0;
  const failed = [];

  for (let i = 0; i < products.length; i++) {
    const payload = normalizeExcelRow(products[i]);

    if (!payload.brand || !payload.name || !payload.spec) {
      failed.push({ row: i + 2, reason: "Missing required fields: brand, name, spec" });
      continue;
    }
    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      failed.push({ row: i + 2, reason: "Invalid or missing price" });
      continue;
    }
    if (!Number.isFinite(payload.market) || payload.market <= 0) {
      failed.push({ row: i + 2, reason: "Invalid or missing market price" });
      continue;
    }

    try {
      const rows = await sql`
        INSERT INTO products (
          id, brand, name, spec, category, grade, price, market_price,
          image_url, images, description, long_description,
          in_stock, stock_status, stock_quantity, tags, updated_at
        ) VALUES (
          ${payload.id}, ${payload.brand}, ${payload.name}, ${payload.spec},
          ${payload.category}, ${payload.grade}, ${payload.price}, ${payload.market},
          ${payload.image}, ${JSON.stringify(payload.images)},
          ${payload.description}, ${payload.longDescription},
          ${payload.stockStatus !== "out_of_stock"}, ${payload.stockStatus},
          ${payload.stockQuantity}, ${JSON.stringify(payload.tags)}, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          brand = EXCLUDED.brand, name = EXCLUDED.name, spec = EXCLUDED.spec,
          category = EXCLUDED.category, grade = EXCLUDED.grade,
          price = EXCLUDED.price, market_price = EXCLUDED.market_price,
          image_url = EXCLUDED.image_url, images = EXCLUDED.images,
          description = EXCLUDED.description, long_description = EXCLUDED.long_description,
          in_stock = EXCLUDED.in_stock, stock_status = EXCLUDED.stock_status,
          stock_quantity = EXCLUDED.stock_quantity, tags = EXCLUDED.tags,
          updated_at = NOW()
        RETURNING (xmax = 0) AS was_inserted
      `;

      if (rows[0]?.was_inserted) inserted++;
      else updated++;
    } catch (error) {
      failed.push({ row: i + 2, reason: error?.message || "DB error" });
    }
  }

  return {
    status: 200,
    body: { ok: true, inserted, updated, failed, total: products.length },
  };
};

const MAX_SYNC_ITEMS = 2000;

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

const makeStableId = (raw = {}, index = 0, idPrefix = "sync") => {
  const brand = slugify(raw.brand || raw.Brand || "item");
  const name = slugify(raw.name || raw.Name || "product");
  const spec = slugify(raw.spec || raw.Spec || "");
  const basis = `${brand}-${name}-${spec}-${index + 1}`;
  return `${idPrefix}-${basis}`.slice(0, 90);
};

const pickPath = (obj, path) => {
  if (!path) return undefined;
  return String(path)
    .split(".")
    .filter(Boolean)
    .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
};

const parseCsvLine = (line = "") => {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
};

const parseCsv = (csvText = "") => {
  const lines = String(csvText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    return row;
  });
};

const coerceFeedItems = ({ data, format, productsPath }) => {
  if (format === "csv") {
    return parseCsv(typeof data === "string" ? data : String(data || ""));
  }

  let parsed;
  if (typeof data === "string") {
    parsed = JSON.parse(data);
  } else {
    parsed = data;
  }

  if (Array.isArray(parsed)) return parsed;

  const fromPath = pickPath(parsed, productsPath);
  if (Array.isArray(fromPath)) return fromPath;

  if (Array.isArray(parsed?.items)) return parsed.items;
  if (Array.isArray(parsed?.products)) return parsed.products;
  if (Array.isArray(parsed?.data)) return parsed.data;

  return [];
};

export const syncProductsFromFeed = async ({ headers = {}, body = {} } = {}) => {
  const auth = await requireAdminRequest(headers);
  if (!auth.ok) {
    return { status: auth.status, body: { ok: false, message: auth.error } };
  }

  const sourceUrl = String(body.sourceUrl || "").trim();
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) {
    return { status: 400, body: { ok: false, message: "sourceUrl (http/https) is required" } };
  }

  const format = String(body.format || "auto").toLowerCase();
  const productsPath = String(body.productsPath || "").trim();
  const idPrefix = slugify(body.idPrefix || "feed") || "feed";
  const dryRun = Boolean(body.dryRun);
  const maxItemsInput = Number(body.maxItems || 1000);
  const maxItems = Number.isFinite(maxItemsInput)
    ? Math.min(Math.max(maxItemsInput, 1), MAX_SYNC_ITEMS)
    : 1000;

  let response;
  try {
    response = await fetch(sourceUrl, {
      headers: { Accept: "application/json,text/csv,text/plain,*/*" },
    });
  } catch (error) {
    return {
      status: 502,
      body: { ok: false, message: `Failed to fetch sourceUrl: ${error?.message || "network error"}` },
    };
  }

  if (!response.ok) {
    return {
      status: 502,
      body: { ok: false, message: `Source feed returned HTTP ${response.status}` },
    };
  }

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const raw = await response.text();

  const inferredFormat =
    format !== "auto"
      ? format
      : contentType.includes("csv")
        ? "csv"
        : "json";

  let items;
  try {
    items = coerceFeedItems({ data: raw, format: inferredFormat, productsPath });
  } catch (error) {
    return {
      status: 400,
      body: { ok: false, message: `Unable to parse source feed: ${error?.message || "invalid payload"}` },
    };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return {
      status: 400,
      body: { ok: false, message: "No product records found in source feed" },
    };
  }

  const trimmed = items.slice(0, maxItems);
  const normalized = trimmed.map((row, idx) => {
    const withId = { ...row, id: row?.id || row?.ID || makeStableId(row, idx, idPrefix) };
    const payload = normalizeExcelRow(withId);
    if (!payload.category) payload.category = "sparepart";
    if (!payload.grade) payload.grade = "New";
    if (!payload.stockStatus) payload.stockStatus = "in_stock";
    return payload;
  });

  const failed = [];
  const valid = [];

  normalized.forEach((payload, idx) => {
    if (!payload.brand || !payload.name || !payload.spec) {
      failed.push({ row: idx + 1, reason: "Missing required fields: brand, name, spec" });
      return;
    }
    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      failed.push({ row: idx + 1, reason: "Invalid or missing price" });
      return;
    }
    if (!Number.isFinite(payload.market) || payload.market <= 0) {
      failed.push({ row: idx + 1, reason: "Invalid or missing market price" });
      return;
    }
    valid.push(payload);
  });

  if (dryRun) {
    return {
      status: 200,
      body: {
        ok: true,
        dryRun: true,
        sourceCount: items.length,
        processed: trimmed.length,
        valid: valid.length,
        failed,
      },
    };
  }

  const sql = getNeonSql();
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < valid.length; i++) {
    const payload = valid[i];
    try {
      const rows = await sql`
        INSERT INTO products (
          id, brand, name, spec, category, grade, price, market_price,
          image_url, images, description, long_description,
          in_stock, stock_status, stock_quantity, tags, updated_at
        ) VALUES (
          ${payload.id}, ${payload.brand}, ${payload.name}, ${payload.spec},
          ${payload.category}, ${payload.grade}, ${payload.price}, ${payload.market},
          ${payload.image}, ${JSON.stringify(payload.images)},
          ${payload.description}, ${payload.longDescription},
          ${payload.stockStatus !== "out_of_stock"}, ${payload.stockStatus},
          ${payload.stockQuantity}, ${JSON.stringify(payload.tags)}, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          brand = EXCLUDED.brand, name = EXCLUDED.name, spec = EXCLUDED.spec,
          category = EXCLUDED.category, grade = EXCLUDED.grade,
          price = EXCLUDED.price, market_price = EXCLUDED.market_price,
          image_url = EXCLUDED.image_url, images = EXCLUDED.images,
          description = EXCLUDED.description, long_description = EXCLUDED.long_description,
          in_stock = EXCLUDED.in_stock, stock_status = EXCLUDED.stock_status,
          stock_quantity = EXCLUDED.stock_quantity, tags = EXCLUDED.tags,
          updated_at = NOW()
        RETURNING (xmax = 0) AS was_inserted
      `;

      if (rows[0]?.was_inserted) inserted++;
      else updated++;
    } catch (error) {
      failed.push({ row: i + 1, reason: error?.message || "DB error" });
    }
  }

  return {
    status: 200,
    body: {
      ok: true,
      sourceCount: items.length,
      processed: trimmed.length,
      inserted,
      updated,
      failed,
      total: valid.length,
    },
  };
};

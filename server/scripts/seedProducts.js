import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getNeonSql } from "../lib/neonClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productsFilePath = path.resolve(__dirname, "../../src/fallbackProducts.js");
const DRY_RUN = process.argv.includes("--dry-run");

const extractProductsLiteral = (source) => {
  const marker = "const PRODUCTS = [";
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error("Could not find PRODUCTS array in src/fallbackProducts.js");
  }

  const arrayStart = source.indexOf("[", start);
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let escaped = false;

  for (let index = arrayStart; index < source.length; index += 1) {
    const char = source[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (!inDouble && !inTemplate && char === "'") {
      inSingle = !inSingle;
      continue;
    }

    if (!inSingle && !inTemplate && char === '"') {
      inDouble = !inDouble;
      continue;
    }

    if (!inSingle && !inDouble && char === "`") {
      inTemplate = !inTemplate;
      continue;
    }

    if (inSingle || inDouble || inTemplate) {
      continue;
    }

    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(arrayStart, index + 1);
      }
    }
  }

  throw new Error("Could not parse PRODUCTS array boundaries");
};

const loadProducts = async () => {
  const source = await fs.readFile(productsFilePath, "utf8");
  const literal = extractProductsLiteral(source);
  return Function(`return (${literal});`)();
};

const normalizeProduct = (product) => ({
  id: String(product.id),
  brand: String(product.brand || ""),
  name: String(product.name || ""),
  spec: String(product.spec || ""),
  category: String(product.category || "other"),
  grade: String(product.grade || ""),
  price: Number(product.price || 0),
  market: Number(product.market || 0),
  image: String(product.image || ""),
  images: Array.isArray(product.images) ? product.images : [],
  description: String(product.description || ""),
  longDescription: String(product.longDescription || ""),
  stockStatus: String(product.stockStatus || "in_stock"),
  stockQuantity: Number(product.stockQuantity ?? 10),
  tags: Array.isArray(product.tags) ? product.tags : [],
});

const seedProducts = async () => {
  const products = (await loadProducts()).map(normalizeProduct);

  if (DRY_RUN) {
    console.log(`Parsed ${products.length} products from src/fallbackProducts.js`);
    console.log(JSON.stringify(products[0], null, 2));
    return;
  }

  const sql = getNeonSql();

  for (const product of products) {
    await sql`
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
        ${product.id},
        ${product.brand},
        ${product.name},
        ${product.spec},
        ${product.category},
        ${product.grade},
        ${product.price},
        ${product.market},
        ${product.image},
        ${JSON.stringify(product.images)},
        ${product.description},
        ${product.longDescription},
        ${product.stockStatus !== "out_of_stock"},
        ${product.stockStatus},
        ${product.stockQuantity},
        ${JSON.stringify(product.tags)},
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
    `;
  }

  console.log(`Seeded ${products.length} products into Neon`);
};

seedProducts().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});

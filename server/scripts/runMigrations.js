import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getNeonSql } from "../lib/neonClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../db/migrations");

const DRY_RUN = process.argv.includes("--dry-run");

const splitSqlStatements = (sqlText) => {
  const statements = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sqlText.length; i += 1) {
    const char = sqlText[i];
    const next = sqlText[i + 1];

    if (inLineComment) {
      current += char;
      if (char === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      current += char;
      if (char === "*" && next === "/") {
        current += next;
        i += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (!inSingle && !inDouble && char === "-" && next === "-") {
      current += char + next;
      i += 1;
      inLineComment = true;
      continue;
    }

    if (!inSingle && !inDouble && char === "/" && next === "*") {
      current += char + next;
      i += 1;
      inBlockComment = true;
      continue;
    }

    if (char === "'" && !inDouble) {
      const prev = sqlText[i - 1];
      if (prev !== "\\") inSingle = !inSingle;
      current += char;
      continue;
    }

    if (char === '"' && !inSingle) {
      const prev = sqlText[i - 1];
      if (prev !== "\\") inDouble = !inDouble;
      current += char;
      continue;
    }

    if (char === ";" && !inSingle && !inDouble) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
};

const runMigrations = async () => {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const migrationFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (migrationFiles.length === 0) {
    console.log("No migration files found.");
    return;
  }

  const sql = DRY_RUN ? null : getNeonSql();

  for (const fileName of migrationFiles) {
    const filePath = path.join(migrationsDir, fileName);
    const sqlText = await fs.readFile(filePath, "utf8");
    const statements = splitSqlStatements(sqlText);

    console.log(`Processing ${fileName} (${statements.length} statement${statements.length === 1 ? "" : "s"})`);

    if (DRY_RUN) {
      continue;
    }

    for (const statement of statements) {
      if (typeof sql.query === "function") {
        await sql.query(statement);
      } else {
        throw new Error("Neon SQL client does not expose query(); update migration runner implementation.");
      }
    }
  }

  console.log(DRY_RUN ? "Dry run complete." : "All migrations applied.");
};

runMigrations().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});

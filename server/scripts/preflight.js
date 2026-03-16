import "dotenv/config";
import { buildPreflightReport } from "../lib/preflightChecks.js";

const strict = process.argv.includes("--strict");
const report = buildPreflightReport(process.env);
const rows = report.rows;
const missingRequired = report.missingRequired;
const invalidRequired = report.invalidRequired || [];

console.log("Nafuu Mart Preflight");
console.log(`Auth mode: ${report.envMode}`);
console.log("");

for (const row of rows) {
  let icon = "OPTIONAL";
  if (row.required && !row.present) {
    icon = "MISSING";
  } else if (row.required && row.present && !row.valid) {
    icon = "INVALID";
  } else if (row.present && row.valid) {
    icon = "OK";
  }
  
  let detail = row.note;
  if (!row.valid && row.validateFailMessage) {
    detail = `${row.note} (${row.validateFailMessage})`;
  }
  
  console.log(`${icon.padEnd(8)} ${row.key} (${row.scope}) - ${detail}`);
}

console.log("");
const hasIssues = missingRequired.length > 0 || invalidRequired.length > 0;
if (!hasIssues) {
  console.log("Preflight passed: required environment values are present and valid for current mode.");
  process.exit(0);
}

if (missingRequired.length > 0) {
  console.log("Preflight found missing required values:");
  for (const miss of missingRequired) {
    console.log(`- ${miss}`);
  }
}

if (invalidRequired.length > 0) {
  console.log("Preflight found invalid required values:");
  for (const invalid of invalidRequired) {
    console.log(`- ${invalid.key} (${invalid.validateFailMessage || "invalid"})`);
  }
}

if (strict) {
  process.exit(1);
}

/**
 * startTunnel.js
 *
 * Exposes localhost:PORT over HTTPS so Safaricom can reach the M-Pesa callback.
 * Tries tunnel providers in order until one works:
 *   1. cloudflared  (trycloudflare.com)  — no account needed, most reliable
 *   2. localhost.run via SSH              — no account needed, needs port 22 open
 *
 * Usage:
 *   npm run tunnel               # tunnels localhost:4000
 *   PORT=3000 npm run tunnel     # tunnels a different local port
 */
 import { spawn, execFileSync } from "child_process";
 import { existsSync } from "fs";
 import { join, dirname } from "path";
 import { fileURLToPath } from "url";
 
 const __dirname = dirname(fileURLToPath(import.meta.url));
 const port = Number(process.env.PORT ?? 4000);
 
 // ─── Helpers ────────────────────────────────────────────────────────────────
 
 function printResult(tunnelUrl) {
   const callbackUrl = `${tunnelUrl}/api/payments/mpesa/callback`;
   console.log("\n─────────────────────────────────────────────────────────────");
   console.log(`  Tunnel URL  :  ${tunnelUrl}`);
   console.log(`  Callback URL:  ${callbackUrl}`);
   console.log("─────────────────────────────────────────────────────────────");
   console.log("\nAdd this line to your .env file:");
   console.log(`  MPESA_CALLBACK_URL=${callbackUrl}`);
   console.log("\nKeep this window open while testing. Ctrl+C to stop.\n");
 }
 
 function watchAndPrint(proc, urlRegex) {
   let found = false;
   function check(data) {
     const text = data.toString();
     process.stdout.write(text);
     if (!found) {
       const m = text.match(urlRegex);
       if (m) { found = true; printResult(m[0]); }
     }
   }
   proc.stdout.on("data", check);
   proc.stderr.on("data", check);
 }
 
 function onClose(proc, name) {
   proc.on("close", (code) => {
     if (code !== 0 && code !== null) {
       console.error(`\n${name} tunnel closed with code ${code}.`);
     } else {
       console.log(`\n${name} tunnel closed.`);
     }
     process.exit(code ?? 0);
   });
 }
 
 // ─── Strategy 1: cloudflared ─────────────────────────────────────────────────
 // Download once from: https://github.com/cloudflare/cloudflared/releases/latest
 // and place cloudflared.exe in the project root or anywhere in PATH.
 
 function findCloudflared() {
   // Check PATH first
  try { execFileSync("cloudflared", ["--version"], { stdio: "ignore" }); return "cloudflared"; } catch { /* no-op: try local binary path next */ }
   // Check project root (user may have dropped the .exe there)
   const local = join(__dirname, "..", "..", "cloudflared.exe");
   if (existsSync(local)) return local;
   return null;
 }
 
 const cloudflaredPath = findCloudflared();
 if (cloudflaredPath) {
   console.log(`\nStarting cloudflared tunnel → http://localhost:${port}\n`);
   const proc = spawn(cloudflaredPath, ["tunnel", "--url", `http://localhost:${port}`], {
     stdio: ["ignore", "pipe", "pipe"],
   });
   // cloudflared prints: "| https://xxx.trycloudflare.com"
   watchAndPrint(proc, /https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
   onClose(proc, "cloudflared");
   process.on("SIGINT", () => { proc.kill(); });
 
 // ─── Strategy 2: localhost.run (SSH, no account required) ────────────────────
 } else {
   let sshBin = "ssh";
   // On Windows, OpenSSH should be in PATH; double-check
   try { execFileSync("ssh", ["-V"], { stdio: "ignore" }); } catch {
     console.error("ssh not found. Cannot start tunnel.");
     printInstallInstructions();
     process.exit(1);
   }
 
   console.log(`\nStarting localhost.run tunnel → http://localhost:${port}`);
   console.log("(using SSH on port 22 — no account required)\n");
 
   const sshArgs = [
     "-o", "StrictHostKeyChecking=no",
     "-o", "ServerAliveInterval=30",
     "-o", "ServerAliveCountMax=3",
     "-R", `80:localhost:${port}`,
     "nokey@localhost.run",
   ];
 
   const proc = spawn(sshBin, sshArgs, { stdio: ["ignore", "pipe", "pipe"] });
 
   // localhost.run prints: "something.lhr.life tunneled …, https://something.lhr.life"
   watchAndPrint(proc, /https:\/\/[a-z0-9-]+\.lhr\.life/);
 
   proc.on("close", (code) => {
     if (code !== 0 && code !== null) {
       console.error(`\nSSH tunnel closed with code ${code}.`);
       console.error("This may mean port 22 is blocked by your network.");
       console.error("\nInstall cloudflared for a more reliable alternative:");
       printInstallInstructions();
     } else {
       console.log("\nTunnel closed.");
     }
     process.exit(code ?? 0);
   });
 
   process.on("SIGINT", () => { proc.kill(); });
 }
 
 // ─── Fallback instructions ────────────────────────────────────────────────────
 function printInstallInstructions() {
   console.error("\n── Option A: cloudflared (no account needed) ──────────────");
   console.error("  Download:  https://github.com/cloudflare/cloudflared/releases/latest");
   console.error("  Windows:   cloudflared-windows-amd64.exe → rename to cloudflared.exe");
   console.error("  Place it in PATH or in the project root, then re-run: npm run tunnel");
   console.error("\n── Option B: ngrok (free account needed) ──────────────────");
   console.error("  Install:   winget install ngrok  OR  https://ngrok.com/download");
   console.error("  Auth:      ngrok config add-authtoken <your-token>");
   console.error("  Run:       ngrok http 4000");
   console.error("  Use the https://*.ngrok-free.app URL as MPESA_CALLBACK_URL\n");
 }

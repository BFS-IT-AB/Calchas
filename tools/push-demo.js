#!/usr/bin/env node
/*
  Simple push demo script using web-push.

  Usage:
    1) Install deps: `npm install`
    2) Generate VAPID keys (if you don't have them):
       node -e "const webpush=require('web-push');console.log(JSON.stringify(webpush.generateVAPIDKeys()));"
    3) Save your subscription JSON to `push-subscription.json` or pass path as first arg.
    4) Run: `npm run push-demo -- [subscription.json] [publicVapidKey] [privateVapidKey] [message]`

  The script will send a single push message to the provided subscription.
*/

const fs = require("fs");
const path = require("path");
const webpush = require("web-push");

async function main() {
  const args = process.argv.slice(2);
  const subPath = args[0] || path.join(process.cwd(), "push-subscription.json");
  const publicKey = args[1] || process.env.VAPID_PUBLIC;
  const privateKey = args[2] || process.env.VAPID_PRIVATE;
  const message = args[3] || "Test notification from Calchas push-demo";

  if (!fs.existsSync(subPath)) {
    console.error("Subscription file not found:", subPath);
    console.error(
      "Create a subscription JSON (from client) and save it as push-subscription.json"
    );
    process.exit(1);
  }

  if (!publicKey || !privateKey) {
    console.error(
      "VAPID keys missing. Pass as args or set VAPID_PUBLIC and VAPID_PRIVATE env vars."
    );
    process.exit(1);
  }

  const subJson = JSON.parse(fs.readFileSync(subPath, "utf8"));

  webpush.setVapidDetails("mailto:dev@example.com", publicKey, privateKey);

  try {
    const res = await webpush.sendNotification(
      subJson,
      JSON.stringify({ title: "Calchas", body: message })
    );
    console.log("Push sent, status:", res.statusCode || "OK");
  } catch (err) {
    console.error("Push send failed:", err.body || err.message || err);
    process.exit(2);
  }
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(3);
});

#!/usr/bin/env node
/* Simple push server: accepts subscriptions and can send demo pushes
   Endpoints:
     POST /subscribe  -> body = subscription JSON, saved to subscriptions.json
     POST /send       -> body = { message: 'text' } sends to all saved subscriptions
     GET  /keys       -> returns { publicKey }

   Usage:
     npm install
     node tools/push-server.js

   Configure VAPID keys via env vars VAPID_PUBLIC and VAPID_PRIVATE or create keys and set them.
*/

const fs = require("fs");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const webpush = require("web-push");

const SUB_FILE = path.join(process.cwd(), "push-subscriptions.json");
const PORT = process.env.PORT || 3030;

function loadSubs() {
  try {
    if (fs.existsSync(SUB_FILE)) {
      return JSON.parse(fs.readFileSync(SUB_FILE, "utf8")) || [];
    }
  } catch (e) {
    console.warn("Could not load subscriptions", e);
  }
  return [];
}

function saveSubs(subs) {
  try {
    fs.writeFileSync(SUB_FILE, JSON.stringify(subs, null, 2));
  } catch (e) {
    console.warn("Could not save subscriptions", e);
  }
}

const app = express();
app.use(bodyParser.json());

const publicKey = process.env.VAPID_PUBLIC || "";
const privateKey = process.env.VAPID_PRIVATE || "";

if (!publicKey || !privateKey) {
  console.warn(
    "VAPID keys not set. Set VAPID_PUBLIC and VAPID_PRIVATE env vars for push-server."
  );
}

if (publicKey && privateKey) {
  webpush.setVapidDetails("mailto:dev@example.com", publicKey, privateKey);
}

app.post("/subscribe", (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint)
    return res.status(400).json({ error: "Invalid subscription" });
  const subs = loadSubs();
  const exists = subs.some((s) => s.endpoint === sub.endpoint);
  if (!exists) subs.push(sub);
  saveSubs(subs);
  res.json({ ok: true, count: subs.length });
});

app.post("/send", async (req, res) => {
  const { message } = req.body || {};
  const payload = JSON.stringify({
    title: "Calchas",
    body: message || "Demo Nachricht",
  });
  const subs = loadSubs();
  if (!subs.length) return res.status(400).json({ error: "No subscriptions" });
  const results = [];
  for (const s of subs) {
    try {
      await webpush.sendNotification(s, payload);
      results.push({ endpoint: s.endpoint, status: "ok" });
    } catch (err) {
      results.push({
        endpoint: s.endpoint,
        status: "error",
        error: err.body || err.message,
      });
    }
  }
  res.json({ results });
});

// Simple dashboard to view subscriptions and send test pushes
app.get("/dashboard", (req, res) => {
  const subs = loadSubs();
  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Push Server Dashboard</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px} pre{background:#f4f4f4;padding:10px;border-radius:6px;overflow:auto}button{padding:8px 12px}</style>
  </head>
  <body>
    <h1>Push Server Dashboard</h1>
    <p>Subscriptions stored: <strong>${subs.length}</strong></p>
    <div>
      <button id="refresh">Refresh</button>
      <button id="send" style="margin-left:8px">Send Demo Push to All</button>
      <input id="msg" placeholder="Message" style="margin-left:8px;padding:6px;width:300px"/>
    </div>
    <h2>Subscriptions</h2>
    <div id="subs">
      ${subs
        .map(
          (s) =>
            `<div style="margin-bottom:8px"><pre>${JSON.stringify(
              s,
              null,
              2
            )}</pre></div>`
        )
        .join("")}
    </div>
    <script>
      document.getElementById('refresh').addEventListener('click', ()=> location.reload());
      document.getElementById('send').addEventListener('click', async ()=>{
        const msg = document.getElementById('msg').value || 'Demo Nachricht vom Dashboard';
        try {
          const r = await fetch('/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg})});
          const j = await r.json();
          alert('Send result: '+ JSON.stringify(j));
        } catch(e){ alert('Send failed: '+e.message); }
      });
    </script>
  </body>
  </html>
  `;
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

app.get("/keys", (req, res) => {
  res.json({ publicKey });
});

app.get("/", (req, res) => {
  res.send(
    `Push server running. Use <a href="/dashboard">/dashboard</a> to view subscriptions. POST /subscribe and POST /send. PublicKey: ${
      publicKey ? "set" : "missing"
    }`
  );
});

app.listen(PORT, () => {
  console.log(`Push server listening on http://localhost:${PORT}`);
  console.log(`Subscriptions file: ${SUB_FILE}`);
});

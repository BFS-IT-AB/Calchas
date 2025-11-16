#!/usr/bin/env node
/**
 * Simple HTTP Server for Development
 * Works without global http-server installation
 * Start with: node tools/http-server.js
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || "localhost";

// MIME Types
const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
};

const server = http.createServer((req, res) => {
  // Log request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Parse URL
  let filePath = "." + req.url;
  if (filePath === "./") {
    filePath = "./src/index.html";
  } else if (!filePath.includes(".")) {
    // If no extension, try adding .html
    filePath += ".html";
  }

  // Resolve relative to project root
  filePath = path.resolve(__dirname, "..", filePath);

  // Get extension and mime type
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || "application/octet-stream";

  // Read and serve file
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        // File not found - try without .html
        const altPath = filePath.replace(/\.html$/, "");
        fs.readFile(altPath, (err2, content2) => {
          if (err2) {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end("<h1>404 - File Not Found</h1>", "utf-8");
          } else {
            res.writeHead(200, {
              "Content-Type":
                mimeTypes[path.extname(altPath)] || "application/octet-stream",
              "Cache-Control": "no-cache",
            });
            res.end(content2, "utf-8");
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`, "utf-8");
      }
    } else {
      // Success
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
      });
      res.end(content, "utf-8");
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("🌐 ==========================================");
  console.log("   Calchas Development Server STARTED");
  console.log("🌐 ==========================================");
  console.log("");
  console.log(`   URL: http://${HOST}:${PORT}`);
  console.log("");
  console.log("   Press Ctrl+C to stop the server");
  console.log("");
  console.log("🌐 ==========================================");
  console.log("");
});

// Handle server errors
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Try a different port:`);
    console.error(`   PORT=8001 node tools/http-server.js`);
  } else {
    console.error("❌ Server error:", err);
  }
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down server...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

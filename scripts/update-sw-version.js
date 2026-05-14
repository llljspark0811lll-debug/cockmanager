const fs = require("fs");
const path = require("path");

const swPath = path.join(__dirname, "../public/sw.js");
const swContent = fs.readFileSync(swPath, "utf-8");
const version = Date.now();
const updated = swContent.replace(
  /const CACHE_NAME = "kokmani-pwa-v[\w]+";/,
  `const CACHE_NAME = "kokmani-pwa-v${version}";`
);
fs.writeFileSync(swPath, updated);
console.log(`SW cache version updated: kokmani-pwa-v${version}`);

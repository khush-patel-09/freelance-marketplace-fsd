// Practical 1.IV — create and store a JSON object in a file
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// This is also the app-title identification asked for in Practical 1.V
const appInfo = {
  appTitle: "FreelanceHub",
  tagline: "A freelance marketplace connecting clients and freelancers",
  version: "1.0.0",
  createdAt: new Date().toISOString(),
};

const outPath = path.join(__dirname, "..", "data", "appInfo.json");
fs.writeFileSync(outPath, JSON.stringify(appInfo, null, 2));
console.log("appInfo.json written:", appInfo);

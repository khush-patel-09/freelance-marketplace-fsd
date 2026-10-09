import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Read JSON data from the data directory
function readData(file) {
  const filePath = path.join(__dirname, "data", file);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// Write JSON data back to the data directory
function writeData(file, data) {
  const filePath = path.join(__dirname, "data", file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// --- Read-only endpoints ---
app.get("/api/jobs", (req, res) => res.json(readData("job_listings.json")));
app.get("/api/freelancers", (req, res) => res.json(readData("freelancers.json")));
app.get("/api/proposals", (req, res) => res.json(readData("proposals.json")));
app.get("/api/clients", (req, res) => res.json(readData("clients.json")));
app.get("/api/appinfo", (req, res) => res.json(readData("appInfo.json")));
app.get("/api/payments", (req, res) => res.json(readData("payments.json")));

// --- Payment: create new escrow payment ---
app.post("/api/payments", (req, res) => {
  const { employer_email, freelancer_id, job_id, amount } = req.body;
  if (!employer_email || !freelancer_id || !job_id || !amount) {
    return res.status(400).json({ error: "Missing required fields." });
  }
  const payments = readData("payments.json");
  const newPayment = {
    id: Date.now(),
    employer_email,
    freelancer_id: Number(freelancer_id),
    job_id: Number(job_id),
    amount: Number(amount),
    status: "escrow",
    created_at: new Date().toISOString(),
    released_at: null,
    dispute_reason: null,
  };
  payments.push(newPayment);
  writeData("payments.json", payments);
  res.status(201).json(newPayment);
});

// --- Payment: release escrow to freelancer ---
app.patch("/api/payments/:id/release", (req, res) => {
  const payments = readData("payments.json");
  const idx = payments.findIndex((p) => p.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Payment not found." });
  if (payments[idx].status !== "escrow")
    return res.status(400).json({ error: "Payment is not in escrow." });
  payments[idx].status = "released";
  payments[idx].released_at = new Date().toISOString();
  writeData("payments.json", payments);
  res.json(payments[idx]);
});

// --- Payment: raise a dispute ---
app.patch("/api/payments/:id/dispute", (req, res) => {
  const { reason } = req.body;
  const payments = readData("payments.json");
  const idx = payments.findIndex((p) => p.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Payment not found." });
  if (payments[idx].status !== "escrow")
    return res.status(400).json({ error: "Only escrow payments can be disputed." });
  payments[idx].status = "disputed";
  payments[idx].dispute_reason = reason || "No reason provided.";
  writeData("payments.json", payments);
  res.json(payments[idx]);
});

// --- Freelancer: report / flag a freelancer ---
app.patch("/api/freelancers/:id/flag", (req, res) => {
  const freelancers = readData("freelancers.json");
  const idx = freelancers.findIndex((f) => f.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Freelancer not found." });
  freelancers[idx].flagCount = (freelancers[idx].flagCount || 0) + 1;
  writeData("freelancers.json", freelancers);
  res.json({ message: "Freelancer reported.", flagCount: freelancers[idx].flagCount });
});

export default app;

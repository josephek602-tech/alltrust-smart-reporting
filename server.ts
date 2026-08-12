import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create Gemini AI client
let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini AI client successfully initialized server-side.");
  } else {
    console.warn("No valid GEMINI_API_KEY environment variable found. AI insights will fallback to clean heuristic summaries.");
  }
} catch (err) {
  console.error("Error initializing Gemini client:", err);
}

const app = express();
const PORT = 3000;

app.use(express.json());

// API Endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Insights endpoint
app.post("/api/insights", async (req, res) => {
  const { logs, requestType, department, role } = req.body;

  if (!logs || !Array.isArray(logs)) {
    return res.status(400).json({ error: "Logs array is required." });
  }

  const promptType = requestType || "trends";
  const userDept = department || "SALES";
  const userRole = role || "Supervisor";

  // Build text representation of logs for the model
  const logsText = logs.map((log: any, idx: number) => {
    let details = "";
    if (log.logType === "sales_invoice_error") {
      details = `Sales Assoc: ${log.salesAssociate}, Invoice: ${log.invoiceNumber}, ErrType: ${log.errorType}, Financial Impact: $${log.financialImpact}, Details: ${log.errorDescription}`;
    } else if (log.logType === "customer_complaint") {
      details = `CustName: ${log.customerName}, Category: ${log.category}, Severity: ${log.severity}, Details: ${log.complaintDetails}, RespStaff: ${log.responsibleStaff || 'N/A'}`;
    } else if (log.logType === "picker_error") {
      details = `Picker: ${log.pickerName}, OrderID: ${log.orderId}, Cat: ${log.errorCategory}, Details: ${log.errorDetails}`;
    } else if (log.logType === "customer_care_offense") {
      details = `Agent: ${log.agentName}, OffenseType: ${log.offenseType}, Severity: ${log.severity}, Details: ${log.offenseDetails}`;
    } else if (log.logType === "confirmation_error") {
      details = `ConfirmationStaff: ${log.confirmationStaffName}, Invoice/Order: ${log.invoiceOrOrderId}, Cat: ${log.errorCategory}, Details: ${log.errorDetails}`;
    }
    return `[${idx+1}] Type: ${log.logType.replace(/_/g, ' ').toUpperCase()} | Status: ${log.status} | CreatedAt: ${log.createdAt}\nDetails: ${details}`;
  }).join("\n\n");

  const prompt = `
You are the AI Operations consultant for "Alltrust Smart Reporting", a high-stakes clinical and sales organization.
A user with role "${userRole}" in department "${userDept}" has requested a ${promptType} operational performance and error trend analysis.

Here is the current log sheet data (${logs.length} entries):
---
${logsText || "No logs recorded in this filter."}
---

Please generate an executive summary and analysis report. Provide the following clearly using clean Markdown (without HTML):
1. **Executive Summary**: A concise paragraph of current operational health.
2. **Key Error Patterns**: Identify high-frequency errors, bottlenecks, or specific repeat offenses/issues (mention names and departments if relevant).
3. **Actionable Recommendations**: 3 to 4 hyper-specific, direct recommendations for Unit Heads to implement in weekly meetings (with concrete training, verification, or process improvements).
4. **Accountability Highlights**: Praise areas with low errors or highlight critical vulnerabilities that require direct supervisor intervention immediately.

Keep the tone highly professional, objective, supportive, yet rigorous. If there are no logs, provide an overview of operational reporting best practices and a template for what is tracked.
  `;

  function getHeuristicFallback(logsArray: any[], notice: string): string {
    return `### Operational Summary (Heuristic Fallback)
We detected **${logsArray.length} active issues** in the database.

#### Primary Observation
- **Sales Invoice Errors**: ${logsArray.filter((l: any) => l.logType === 'sales_invoice_error').length} logged
- **Customer Complaints**: ${logsArray.filter((l: any) => l.logType === 'customer_complaint').length} logged
- **Picker Errors**: ${logsArray.filter((l: any) => l.logType === 'picker_error').length} logged
- **Customer Care Offenses**: ${logsArray.filter((l: any) => l.logType === 'customer_care_offense').length} logged
- **Confirmation Errors**: ${logsArray.filter((l: any) => l.logType === 'confirmation_error').length} logged

#### General Recommendations for Unit Heads
1. **Pre-Billing Verification**: Ensure all Sales Associates double-check item quantities before committing invoices to minimize credit notes.
2. **Double-Picking Check**: Assign a quick peer review between Pickers/Sales Assistants before packages move to the Confirmation Team.
3. **Weekly Error Log Review**: Dedicated 15 minutes during the Monday stand-up to review error trends logged over the past 7 days to foster an accountability culture.

*${notice}*`;
  }

  if (ai) {
    try {
      // Try gemini-3.5-flash first
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      return res.json({ insights: response.text });
    } catch (err: any) {
      console.warn("Gemini 3.5-flash failed (possibly 503 high demand), attempting fallback to gemini-3.1-flash-lite...", err.message);
      try {
        // Try fallback to gemini-3.1-flash-lite
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
        });
        return res.json({ insights: response.text });
      } catch (fallbackErr: any) {
        console.error("Gemini fallback model also failed:", fallbackErr.message);
        const notice = `Note: AI Trend Analysis is temporarily offline due to high demand on Gemini servers (${fallbackErr.message || "503 Unavailable"}). Displaying live database-derived heuristic summary instead.`;
        const heuristicText = getHeuristicFallback(logs, notice);
        return res.json({ insights: heuristicText });
      }
    }
  } else {
    // Elegant fallback summary if no API key is set yet
    const notice = "Note: Add a valid GEMINI_API_KEY secret in the Secrets panel of AI Studio to activate full AI Operational Trend Analysis.";
    const fallbackText = getHeuristicFallback(logs, notice);
    return res.json({ insights: fallbackText });
  }
});

// Vite server integrations
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Import Vite on-demand only in dev
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

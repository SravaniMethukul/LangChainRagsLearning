import express from "express";
import { createAgent, tool, initChatModel } from "langchain";
import "dotenv/config";
import z from "zod";

const app = express();
app.use(express.json());
app.use(express.static("public"));

// ==========================================
// 1. DEFINE QA HTTP TOOLS & AGENT SETUP
// ==========================================

const httpRequestTool = tool(
    async (input) => {
        const { method, url, headers, body } = input;
        const startTime = Date.now();

        try {
            const response = await fetch(url, {
                method,
                headers: headers ? JSON.parse(headers) : { "Content-Type": "application/json" },
                body: method !== "GET" && body ? body : undefined,
            });

            const durationMs = Date.now() - startTime;
            let responseData: any;

            try {
                responseData = await response.json();
            } catch {
                responseData = await response.text();
            }

            return JSON.stringify({
                status: response.status,
                statusText: response.statusText,
                durationMs,
                data: responseData,
            });
        } catch (error: any) {
            return JSON.stringify({
                error: error.message,
                durationMs: Date.now() - startTime,
            });
        }
    },
    {
        name: "execute_http_request",
        description: "Executes an HTTP request (GET, POST, PUT, DELETE) against a target API endpoint and returns status code, response time, and payload.",
        schema: z.object({
            method: z.enum(["GET", "POST", "PUT", "DELETE"]),
            url: z.string().url(),
            headers: z.string().optional(),
            body: z.string().optional(),
        }),
    }
);

const qaTestReportSchema = z.object({
    suiteName: z.string(),
    totalTestsExecuted: z.number(),
    passCount: z.number(),
    failCount: z.number(),
    testResults: z.array(
        z.object({
            testName: z.string(),
            endpoint: z.string(),
            method: z.string(),
            expectedStatus: z.number(),
            actualStatus: z.number(),
            passed: z.boolean(),
            latencyMs: z.number(),
            notes: z.string(),
        })
    ),
    bugSummary: z.array(z.string()).optional(),
});

const qaSystemPrompt = `You are an expert Autonomous QA Regression Testing Agent.
Your task is to systematically test a target REST API endpoint for functional correctness, status code compliance, and edge-case behavior.
Execute positive and negative test cases, assert HTTP status codes, measure latency, and produce a structured QA Test Report.`;

const model = await initChatModel("claude-sonnet-4-6", {
    temperature: 0.2,
    timeout: 35000,
    maxTokens: 2000,
});

const qaAgent = createAgent({
    model,
    tools: [httpRequestTool],
    systemPrompt: qaSystemPrompt,
    responseFormat: qaTestReportSchema,
});

// ==========================================
// 2. API ENDPOINTS
// ==========================================

app.post("/api/run-qa-tests", async (req, res) => {
    try {
        const { baseUrl, testDescription } = req.body;

        if (!baseUrl) {
            return res.status(400).json({ error: "Base URL is required" });
        }

        const promptContent = `
Run a regression test suite against target base URL: "${baseUrl}"

Test Directives:
${testDescription || `
1. Test GET /posts/1 (Expected 200 OK).
2. Test POST /posts with valid JSON payload {"title": "Dashboard Test", "body": "QA Payload", "userId": 1} (Expected 201 Created).
3. Test GET /posts/999999 (Negative test: non-existent ID, expected 404).
4. Test PUT /posts/1 with updated title payload (Expected 200 OK).
`}
`;

        const result = await qaAgent.invoke({
            messages: [{ role: "user", content: promptContent }],
        });

        res.json({ success: true, report: result.structuredResponse });
    } catch (error: any) {
        console.error("QA Test Error:", error);
        res.status(500).json({ success: false, error: error.message || "Failed to execute QA tests" });
    }
});

// ==========================================
// 3. EMBEDDED DASHBOARD HTML UI
// ==========================================

app.get("/", (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Autonomous QA Regression Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-gradient: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
      --card-bg: rgba(30, 41, 59, 0.7);
      --card-border: rgba(255, 255, 255, 0.1);
      --accent-purple: #8b5cf6;
      --accent-blue: #3b82f6;
      --success-green: #10b981;
      --danger-red: #ef4444;
      --warning-amber: #f59e0b;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }

    body {
      background: var(--bg-gradient);
      color: var(--text-main);
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--card-border);
    }

    .logo-area { display: flex; align-items: center; gap: 0.75rem; }
    .logo-icon {
      background: linear-gradient(135deg, #8b5cf6, #3b82f6);
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
    }

    h1 { font-size: 1.6rem; font-weight: 700; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    p.subtitle { color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem; }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--success-green);
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .status-dot {
      width: 8px; height: 8px; border-radius: 50%; background: var(--success-green);
      box-shadow: 0 0 10px var(--success-green);
      animation: pulse 2s infinite;
    }

    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    .card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .form-group { margin-bottom: 1.25rem; }
    label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.5rem; }
    input[type="text"], textarea {
      width: 100%;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      color: #fff;
      font-size: 0.95rem;
      transition: all 0.2s ease;
    }

    input[type="text"]:focus, textarea:focus {
      outline: none;
      border-color: var(--accent-purple);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
    }

    .btn-run {
      background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 0.85rem 1.75rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .btn-run:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4);
    }

    .btn-run:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
      text-align: center;
    }

    .metric-title { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .metric-value { font-size: 2.2rem; font-weight: 700; margin-top: 0.25rem; }

    .val-pass { color: var(--success-green); }
    .val-fail { color: var(--danger-red); }
    .val-total { color: var(--accent-blue); }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
      text-align: left;
    }

    th {
      background: rgba(15, 23, 42, 0.8);
      color: var(--text-muted);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 1rem;
      border-bottom: 1px solid var(--card-border);
    }

    td {
      padding: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.9rem;
    }

    tr:hover { background: rgba(255, 255, 255, 0.02); }

    .badge-method {
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      display: inline-block;
    }

    .method-get { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .method-post { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .method-put { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .method-delete { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }

    .pill-pass {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .pill-fail {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .loader {
      display: none;
      align-items: center;
      gap: 0.75rem;
      color: var(--accent-purple);
      font-weight: 500;
      margin-top: 1rem;
    }

    .spinner {
      width: 24px; height: 24px; border: 3px solid rgba(139, 92, 246, 0.3);
      border-top-color: var(--accent-purple);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-area">
        <div class="logo-icon">⚡</div>
        <div>
          <h1>Autonomous QA Regression Dashboard</h1>
          <p class="subtitle">AI-Powered End-to-End API Testing Engine</p>
        </div>
      </div>
      <div class="status-badge">
        <div class="status-dot"></div>
        Agent Engine Active
      </div>
    </header>

    <div class="card">
      <div class="form-group">
        <label for="baseUrl">Target API Base URL</label>
        <input type="text" id="baseUrl" value="https://jsonplaceholder.typicode.com" placeholder="https://api.staging.mycompany.com">
      </div>

      <div class="form-group">
        <label for="testDescription">Custom QA Directives & Directives (Optional)</label>
        <textarea id="testDescription" rows="3" placeholder="1. Test GET /posts/1&#10;2. Test POST /posts with valid payload&#10;3. Test GET /posts/999999 for negative 44 status"></textarea>
      </div>

      <button class="btn-run" id="runBtn" onclick="runRegressionTests()">
        🚀 Run Autonomous Regression Test Suite
      </button>

      <div class="loader" id="loader">
        <div class="spinner"></div>
        <span>QA Agent is executing HTTP calls, evaluating responses, and calculating metrics...</span>
      </div>
    </div>

    <div id="resultsSection" style="display: none;">
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-title">Total Executed</div>
          <div class="metric-value val-total" id="metricTotal">0</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Passed Tests</div>
          <div class="metric-value val-pass" id="metricPass">0</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Failed Tests</div>
          <div class="metric-value val-fail" id="metricFail">0</div>
        </div>
      </div>

      <div class="card">
        <h2 style="font-size: 1.2rem; margin-bottom: 1rem; color: var(--text-main);">Test Case Execution Matrix</h2>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Test Case Name</th>
              <th>Endpoint</th>
              <th>Expected</th>
              <th>Actual</th>
              <th>Status</th>
              <th>Latency</th>
              <th>Diagnostic Notes</th>
            </tr>
          </thead>
          <tbody id="testTableBody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    async function runRegressionTests() {
      const baseUrl = document.getElementById('baseUrl').value;
      const testDescription = document.getElementById('testDescription').value;
      const runBtn = document.getElementById('runBtn');
      const loader = document.getElementById('loader');
      const resultsSection = document.getElementById('resultsSection');

      if (!baseUrl) {
        alert("Please enter a valid Base URL");
        return;
      }

      runBtn.disabled = true;
      loader.style.display = 'flex';
      resultsSection.style.display = 'none';

      try {
        const response = await fetch('/api/run-qa-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseUrl, testDescription })
        });

        const data = await response.json();

        if (!data.success) {
          alert('QA Engine Error: ' + data.error);
          return;
        }

        renderResults(data.report);
      } catch (err) {
        alert('Network Error: ' + err.message);
      } finally {
        runBtn.disabled = false;
        loader.style.display = 'none';
      }
    }

    function renderResults(report) {
      document.getElementById('metricTotal').innerText = report.totalTestsExecuted;
      document.getElementById('metricPass').innerText = report.passCount;
      document.getElementById('metricFail').innerText = report.failCount;

      const tbody = document.getElementById('testTableBody');
      tbody.innerHTML = '';

      report.testResults.forEach(tc => {
        const tr = document.createElement('tr');
        
        const methodClass = 'method-' + tc.method.toLowerCase();
        const statusPill = tc.passed ? '<span class="pill-pass">PASS</span>' : '<span class="pill-fail">FAIL</span>';

        tr.innerHTML = \`
          <td><span class="badge-method \${methodClass}">\${tc.method}</span></td>
          <td style="font-weight: 500;">\${tc.testName}</td>
          <td style="font-family: monospace; color: var(--accent-blue);">\${tc.endpoint}</td>
          <td>\${tc.expectedStatus}</td>
          <td style="font-weight: 600;">\${tc.actualStatus}</td>
          <td>\${statusPill}</td>
          <td style="color: var(--text-muted);">\${tc.latencyMs} ms</td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">\${tc.notes}</td>
        \`;
        tbody.appendChild(tr);
      });

      document.getElementById('resultsSection').style.display = 'block';
    }
  </script>
</body>
</html>`);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\n🎉 QA Web Dashboard Server is running!`);
    console.log(`🌐 Open in your browser: http://localhost:${PORT}\n`);
});

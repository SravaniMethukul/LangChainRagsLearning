import { createAgent, tool, initChatModel } from "langchain";
import "dotenv/config";
import z from "zod";

// ==========================================
// 1. DEFINE QA HTTP TOOLS FOR THE AGENT
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
        description: "Executes an HTTP request (GET, POST, PUT, DELETE) against a target API endpoint and returns status code, response time, and response payload.",
        schema: z.object({
            method: z.enum(["GET", "POST", "PUT", "DELETE"]),
            url: z.string().url("Must be a valid URL"),
            headers: z.string().optional().describe("JSON string of HTTP headers e.g. {\"Authorization\": \"Bearer ...\"}"),
            body: z.string().optional().describe("JSON string request body for POST/PUT requests"),
        }),
    }
);

// ==========================================
// 2. DEFINE STRUCTURED QA TEST REPORT SCHEMA
// ==========================================

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

// ==========================================
// 3. QA SYSTEM PROMPT & AGENT INITIALIZATION
// ==========================================

const qaSystemPrompt = `You are an expert Autonomous QA Regression Testing Agent.
Your objective is to systematically test a target REST API endpoint for functional correctness, contract compliance, and edge-case behavior.

Testing Workflow:
1. Execute positive test cases (valid GET, POST, PUT requests) to verify standard workflow.
2. Execute negative test cases (invalid IDs, missing required fields, non-existent endpoints) to check proper 4xx error responses.
3. Measure response latency and verify that returned JSON schemas match expected data types.
4. Output a comprehensive, structured QA Test Report.`;

const model = await initChatModel("claude-sonnet-4-6", {
    temperature: 0.2, // Low temperature for deterministic testing
    timeout: 30000,
    maxTokens: 2000,
});

const qaAgent = createAgent({
    model,
    tools: [httpRequestTool],
    systemPrompt: qaSystemPrompt,
    responseFormat: qaTestReportSchema,
});

// ==========================================
// 4. EXECUTE AUTONOMOUS API REGRESSION SUITE
// ==========================================

console.log("🚀 Starting Autonomous API Regression Runner...\n");

const testTarget = `
Run a regression test suite against the target API base URL: "https://jsonplaceholder.typicode.com"

Test Tasks:
1. Test GET /posts/1 (Expected 200 OK, should return post with id 1).
2. Test POST /posts with payload {"title": "QA Test", "body": "Automation payload", "userId": 1} (Expected 201 Created).
3. Test GET /posts/999999 (Negative test: non-existent ID, verify response status).
4. Test PUT /posts/1 with updated title.
`;

const result = await qaAgent.invoke({
    messages: [{ role: "user", content: testTarget }],
});

console.log("=== 📊 QA AUTOMATED REGRESSION REPORT ===");
console.dir(result.structuredResponse, { depth: null });

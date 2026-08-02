//Fallback model, summarization, llmToolSelector in Middleware

import "dotenv/config";
import z from "zod";
import { createAgent, llmToolSelectorMiddleware, modelFallbackMiddleware, summarizationMiddleware, tool } from "langchain";


const searchtool = tool(({ query }: any) => {
    return `search result of "${query}" : Found 5 articles are returned`;
},
    {
        name: "search",
        description: "search information in internet",
        schema: z.object({
            query: z.string().describe("search query")
        })
    })

const emailTool = tool(({ recepient, subject, content }: any) => {
    return `Email sent successfully to ${recepient} with subject ${subject} and content ${content}`;
}, {
    name: "send_email",
    description: "send email to someone",
    schema: z.object({
        recepient: z.string().describe("recepient email address"),
        subject: z.string().describe("email subject"),
        content: z.string().describe("email body")
    })
})

const weatherTool = tool(({ location }) => {
    return `weather in ${location} is sunny`;
},
    {
        name: "get_weather",
        description: "get weather for the location",
        schema: z.object({
            location: z.string().describe("location for which weather is to be fetched")
        })
    })

// if 10000 is max token, 8000 is used
const agent = createAgent({
    model: "claude-sonnet-4-6",
    tools: [searchtool, emailTool, weatherTool],
    middleware: [
        //modelFallbackMiddleware("Gemini 3.1 Pro", "claude-opus-4-5"),
        modelFallbackMiddleware("claude-sonnet-4-6"),
        summarizationMiddleware({
            model: "claude-sonnet-4-6",
            maxTokensBeforeSummary: 8000, //Trigger summarization of 8000 tokens,
            messagesToKeep: 20 //keep last 20 messages
        }),
        //50 tools - basic model - 3 to 4 tools - main model(reasoning)->output
        llmToolSelectorMiddleware({
            //model: "Gemini 3.1 Pro",
            model: "claude-sonnet-4-6",
            maxTools: 2
        })
    ]
})

const res = await agent.invoke({
    messages: [{ role: "user", content: "what is weather in tokyo?" }]
});
console.log("Response 1:", res.messages[res.messages.length - 1].content);

const res2 = await agent.invoke({
    messages: [{ role: "user", content: "what is weather in tokyo? and email me the result with subject weather in tokyo to sravanisravs1410@gmail.com" }]
});
console.log("Response 2:", res2.messages[res2.messages.length - 1].content);
//PiiMiddleware properties to apply guardrails in Middleware

import "dotenv/config";
import z from "zod";
import { createAgent, piiMiddleware, tool } from "langchain";


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

const agent = createAgent({
    model: "claude-sonnet-4-6",
    //tools: [searchtool, emailTool, weatherTool],
    middleware: [
        piiMiddleware("credit_card"),
        piiMiddleware("ssn", { detector: /\b\d{3}-\d{2}-\d{4}\b/g }),
        piiMiddleware("phone", { detector: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g })
    ]
})

const response = await agent.invoke({
    messages: [{ role: "user", content: "my ssn is 123-45-6789 & My credit card is 7875 6277 6267." }]
})
console.log(response)

// const response1 = await agent.invoke({
//     messages: [{ role: "user", content: "My email is gmail provider. is this good?" }]
// })
// console.log(response1)
import "dotenv/config";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai"
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import "dotenv/config";
import { createAgent, tool } from "langchain";
import { z } from "zod";

// Create a MultiServer MCP client instance
const mcpClient = new MultiServerMCPClient({
    ecommerce: {
        transport: "stdio",
        command: "node",
        args: ["P:/VScode/mcp-ecommerce-crud/dist/mcp/server.js"],
    }
});

const pdfPaths = [
    "P:/VScode/LangchainRagLearningDocs/nke-10k-2023.pdf",
    "P:/VScode/LangchainRagLearningDocs/Nike-Inc-2025_10K.pdf",
    "P:/VScode/LangchainRagLearningDocs/nike-growth-story.pdf",
]

const allDocs = []
for (const pdfPath of pdfPaths) {
    const loader = new PDFLoader(pdfPath)
    const docs = await loader.load()
    allDocs.push(...docs)
}

console.log(allDocs.length) // If there are 107 pages, It creates 107 Document object each containing pageContent and metadata
console.log(allDocs[0].pageContent)

const textsplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000, // means consider 1000 characters
    chunkOverlap: 200 //It takes chunk of data from previous and next chunk upto 200
})
const allSplits = await textsplitter.splitDocuments(allDocs)
console.log(allSplits.length) // now it splited 107 documents to 515 splits

const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-large"
})

const vectorStore = new MemoryVectorStore(embeddings)
await vectorStore.addDocuments(allSplits)

const retrieve = tool(async ({ query }) => {
    const retreivedDocs = await vectorStore.similaritySearch(query, 2); // to retrieve top two documents
    const docsContent = retreivedDocs.map((doc) => doc.pageContent).join("\n\n");
    return docsContent
}, {
    name: "retrieve",
    description: "Retrieves documents from the vector store",
    schema: z.object({
        query: z.string()
    })
})

const mcpTools = await mcpClient.getTools();

const agent = createAgent({
    model: "claude-sonnet-4-6",
    tools: [...mcpTools, retrieve],
})

const result = await agent.invoke({
    messages: [{ role: "user", content: "Get results of product with id 1" }]
})
console.log(result.messages[result.messages.length - 1].content);
// handle multiple PDF files

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai"
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import "dotenv/config";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";

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

const ragMiddleware = dynamicSystemPromptMiddleware(async (state) => {
    const userMessage = state.messages[0].content;
    const query = typeof userMessage === "string" ? userMessage : "";
    // const retreivedDocs = await vectorStore.similaritySearch(query);
    const retreivedDocs = await vectorStore.similaritySearch(query, 2); // to retrieve top two documents
    const docsContent = retreivedDocs.map((doc) => doc.pageContent).join("\n\n");
    return `You are a helpful assistant. Use the following context from the document to answer the user's question:\n\n${docsContent}`
})

const agent = createAgent({
    model: "claude-sonnet-4-6",
    tools: [],
    middleware: [ragMiddleware]
})

const result = await agent.invoke({
    // messages: [{ role: "user", content: "What was Nike Revenue in 2023 and 2025 and which town nike has grown into world famous footwear?" }
    messages: [{ role: "user", content: "As of May 2023, how many shares of million shares company has purchased ?" }]
})
console.log(result)

// const results = await vectorStore.similaritySearch("When was Nike Incorporated ?")
// console.log(results) // this retrieved only 3 documents thinking that answer could be in these 3 documents only


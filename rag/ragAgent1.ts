import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { OpenAIEmbeddings } from "@langchain/openai"
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import "dotenv/config";

const loader = new PDFLoader("P:/VScode/LangchainRagLearningDocs/nke-10k-2023.pdf")
const docs = await loader.load()
console.log(docs.length) // If there are 107 pages, It creates 107 Document object each containing pageContent and metadata
console.log(docs[0].pageContent)

const textsplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000, // means consider 1000 characters
    chunkOverlap: 200 //It takes chunk of data from previous and next chunk upto 200
})
const allSplits = await textsplitter.splitDocuments(docs)
console.log(allSplits.length) // now it splited 107 documents to 515 splits

// const embeddings = new GoogleGenerativeAIEmbeddings({
//     model: "gemini-embedding-001",
// });

const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-large"
})

const vectorStore = new MemoryVectorStore(embeddings)
await vectorStore.addDocuments(allSplits)

//const results = await vectorStore.similaritySearch("When was Nike Incorporated ?")
//console.log(results) // this retrieved only 3 documents thinking that answer could be in these 3 documents only

const retreiver = vectorStore.asRetriever({
    searchType: "similarity",
    k: 2
})


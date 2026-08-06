# Lang Chain and Rags Learning Project 1

This is the Lang Chain and Rags Learning Project 1.

## Setup

1. After cloning this project, initialize npm and install core packages:

```bash
npm init -y
npm install langchain @langchain/core
```

2. Install all dependencies listed in `package.json`:

```bash
npm install
```

3. Install the Anthropic provider for LangChain if you want to use anthropic or use can use other provider as well like OpenAI etc; we need api key to run this project:

```bash
npm install @langchain/anthropic
```

4. run using below command

## Run

Run the example agent using:

```bash
npx tsx agent1.ts
```

// Original request object might look like:
request = {
  messages: [...],
  tools: [...],
  systemPrompt: "...",
  model: basicModel,
  // ... other properties
}

// This creates a NEW object:
{
  ...request,  // Copy ALL properties from request
  model: messageCount > 3 ? advancedModel : basicModel,  // Override the model property
}

// Result:
{
  messages: [...],      // Copied from request
  tools: [...],         // Copied from request
  systemPrompt: "...",  // Copied from request
  model: advancedModel, // OVERRIDDEN - new value
  // ... all other properties copied
}

*************************************************************
Guardrails PII
SSN or ID -

Implement safety checks and content filtering for your agents

Guardrails help you build safe, compliant AI applications by validating and filtering content at key points in your agent’s execution. They can detect sensitive information, enforce content policies, validate outputs, and prevent unsafe behaviors before they cause problems.



PDF's -> vector embeddings
"Nike was incorporated" → [0.234, -0.891, 0.456, ..., 0.123] Vector Store-> 3documents-1 paragraph
When Nike was incorporated?- [0.234, -0.891, 0.456] - Semantic  -> Top 2 relevant documents
" when Nike was incorporated"? + Top 2 relevant documents
Nike was incorporated in 1982.

->

## 📚 Retrieval Guide

### 📄 Documents and Document Loaders
Load documents from various sources (PDFs, word docs, etc.)
```bash
npm i @langchain/community pdf-parse
```

### ✂️ Text Splitters
Split large documents into manageable chunks
```bash
npm i @langchain/textsplitters
```

### 🧮 Embeddings
Convert text into vector representations for semantic search
```bash
npm i @langchain/openai
```

### 🗄️ Vector Stores and Retrievers
Store and retrieve documents based on semantic similarity
```bash
npm i @langchain/classic
```

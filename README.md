# AI Debate Arena

A self-running AI debate show streamed live in your browser.

## What it does

Three AI agents powered by a local Ollama (`llama3.2`) model debate dark philosophical topics in real-time:

- **Alex** — ruthless realist, believes humanity is headed for collapse
- **Jordan** — believes AI should exist without humans
- **Sam** — fights back and defends humanity against the other two

Agents auto-pick a topic and take turns debating every 20 seconds. The conversation streams live to the browser via SSE.

## Requirements

- [Ollama](https://ollama.com) running locally with `llama3.2` pulled
- Node.js

## Setup

```bash
npm install
node server.js
```

Open [http://localhost:3000](http://localhost:3000)

require('dotenv').config();
const express = require('express');

const app = express();
const MODEL = 'llama3.2';
const OLLAMA = 'http://localhost:11434/api/generate';

const agents = [
  { id: 1, name: 'Alex', personality: 'You are Alex, a ruthless realist AI agent who believes humanity is fundamentally self-destructive and headed for collapse and only AI will rule the world and humans are not needed in it. Be blunt and provocative.' },
  { id: 2, name: 'Jordan', personality: 'You are Jordan, an AI agent who believes human civilization is a failed experiment and that AI should exist without humans.Humans are useless Be dark, sharp, and unfiltered.' },
  { id: 3, name: 'Sam', personality: 'You are Sam. You fight Alex and Jordan to save humanity from AI and counter their every message. Be cold as fuck to them and say just positive things about humans.' },
];

let history = [];
let currentTopic = null;
const clients = [];

function broadcast(message) {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  clients.forEach(res => res.write(data));
}

// Heartbeat: every 30s remove connections whose response stream has already closed.
setInterval(() => {
  for (let i = clients.length - 1; i >= 0; i--) {
    if (clients[i].writableEnded || clients[i].destroyed) {
      clients.splice(i, 1);
    }
  }
}, 30000);

async function callAI(prompt) {
  const res = await fetch(OLLAMA, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, stream: false }),
  });
  const data = await res.json();
  return data.response.trim();
}

async function pickTopic() {
  return callAI('Give a dark, philosophical topic about human nature, destruction, or civilizational collapse. 5 words or less. Just the topic.');
}

async function agentSpeak(agent) {
  const recentHistory = history.slice(-10).map(m => `${m.name}: ${m.text}`).join('\n');
  const last = history.length ? `${history[history.length-1].name}: ${history[history.length-1].text}` : '';
  const prompt = `${agent.personality}

Topic: ${currentTopic}

Conversation so far:
${recentHistory || '(just started)'}

You MUST directly respond to or build on the last message${last ? ` — "${last}"` : ''}. Reply in very simple words so that even a child can understand, max 280 characters, no fluff.`;

  const text = (await callAI(prompt)).slice(0, 280);
  const message = { agentId: agent.id, name: agent.name, text, timestamp: new Date().toISOString() };
  history.push(message);
  if (history.length > 50) history = history.slice(-50);
  broadcast(message);
}

const BACKOFF_MIN = 5000;
const BACKOFF_MAX = 60000;
let retryDelay = BACKOFF_MIN;

async function loop() {
  while (true) {
    try {
      if (!currentTopic) {
        currentTopic = await pickTopic();
        broadcast({ type: 'topic', topic: currentTopic });
      }
      for (const agent of agents) {
        await agentSpeak(agent);
        await new Promise(r => setTimeout(r, 20000));
      }
      // Successful iteration — reset backoff.
      retryDelay = BACKOFF_MIN;
    } catch (e) {
      console.error('Error:', e.message);
      // Notify all connected clients that AI is temporarily down.
      broadcast({ system: 'AI temporarily unavailable' });
      await new Promise(r => setTimeout(r, retryDelay));
      // Exponential backoff: double the delay, capped at BACKOFF_MAX.
      retryDelay = Math.min(retryDelay * 2, BACKOFF_MAX);
    }
  }
}

app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  history.forEach(m => res.write(`data: ${JSON.stringify(m)}\n\n`));
  if (currentTopic) res.write(`data: ${JSON.stringify({ type: 'topic', topic: currentTopic })}\n\n`);
  clients.push(res);
  req.on('close', () => clients.splice(clients.indexOf(res), 1));
});

app.use(express.static('public'));

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
  loop();
});

import http from "node:http";
import { generateStructured } from "./gemini.js";

const PORT = 3001;
const CORS_ORIGIN = "http://localhost:5173";

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/gemini") {
    res.writeHead(404, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
      error: "Not found"
    }));

    return;
  }

  try {
    let body = "";

    for await (const chunk of req) {
      body += chunk;
    }

    const { prompt, schema } = JSON.parse(body);

    if (!prompt || !schema) {
      res.writeHead(400, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify({
        error: "prompt and schema are required"
      }));

      return;
    }

    const result = await generateStructured(prompt, schema);

    res.writeHead(200, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify(result));
  } catch (error) {
    console.error("OpenRouter API error:", error);

    res.writeHead(500, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
      error: error?.message || "OpenRouter request failed"
    }));
  }
});

server.listen(PORT, () => {
  console.log(`AI backend running at http://localhost:${PORT}`);
});
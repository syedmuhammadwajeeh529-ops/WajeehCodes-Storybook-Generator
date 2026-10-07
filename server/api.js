import http from "node:http";
import { generateStructured } from "./gemini.js";
import { createBook } from "./books.js";

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

  if (req.method !== "POST") {
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

    const data = JSON.parse(body);

    if (req.url === "/api/gemini") {
      const { prompt, schema } = data;

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
      return;
    }

    if (req.url === "/api/books") {
      const book = data;

      if (!book.title) {
        res.writeHead(400, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          error: "title is required"
        }));

        return;
      }

      const createdBook = await createBook(book);

      res.writeHead(201, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify(createdBook));
      return;
    }

    res.writeHead(404, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
      error: "Not found"
    }));
  } catch (error) {
    console.error("API error:", error);

    res.writeHead(500, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
      error: error?.message || "Server error"
    }));
  }
});

server.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
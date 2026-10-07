import http from "node:http";
import { generateStructured } from "./gemini.js";
import { createBook } from "./books.js";
import { createChapter } from "./chapters.js";
import { createCharacter } from "./characters.js";

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

    if (req.url === "/api/chapters") {
      const chapter = data;

      if (!chapter.book_id || !chapter.chapter_number || !chapter.heading) {
        res.writeHead(400, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          error: "book_id, chapter_number, and heading are required"
        }));

        return;
      }

      const createdChapter = await createChapter(chapter);

      res.writeHead(201, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify(createdChapter));
      return;
    }

    if (req.url === "/api/characters") {
      const character = data;

      if (!character.book_id || !character.name) {
        res.writeHead(400, {
          "Content-Type": "application/json"
        });

        res.end(JSON.stringify({
          error: "book_id and name are required"
        }));

        return;
      }

      const createdCharacter = await createCharacter(character);

      res.writeHead(201, {
        "Content-Type": "application/json"
      });

      res.end(JSON.stringify(createdCharacter));
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
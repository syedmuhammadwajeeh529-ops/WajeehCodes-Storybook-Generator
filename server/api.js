
import http from "node:http";
import { generateStructured } from "./gemini.js";
import {
  createBook,
  getBook,
  listBooks,
  updateBook,
  deleteBook
} from "./books.js";
import { generateImage } from "./images.js";

const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN =
  process.env.CORS_ORIGIN || "http://localhost:5173";

function writeJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json"
  });
  res.end(JSON.stringify(payload));
}

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
    writeJson(res, 404, { error: "Not found" });
    return;
  }

  try {
    let body = "";
    for await (const chunk of req) body += chunk;
    const data = body ? JSON.parse(body) : {};

    if (req.url === "/api/gemini") {
      const { prompt, schema } = data;

      if (!prompt || !schema) {
        writeJson(res, 400, {
          error: "prompt and schema are required"
        });
        return;
      }

      writeJson(res, 200, await generateStructured(prompt, schema));
      return;
    }

    if (req.url === "/api/images") {
      if (!data.prompt) {
        writeJson(res, 400, { error: "prompt is required" });
        return;
      }

      writeJson(res, 200, await generateImage(data.prompt));
      return;
    }

    if (req.url === "/api/books") {
      if (!data.title) {
        writeJson(res, 400, { error: "title is required" });
        return;
      }

      writeJson(res, 201, await createBook(data));
      return;
    }

    if (req.url.startsWith("/api/books/query")) {
      writeJson(res, 200, await listBooks(data.limit));
      return;
    }

    const getBookMatch = req.url.match(/^\/api\/books\/(\d+)\/get$/);

    if (getBookMatch) {
      const book = await getBook(getBookMatch[1]);

      if (!book) {
        writeJson(res, 404, { error: "Book not found" });
        return;
      }

      writeJson(res, 200, book);
      return;
    }

    const updateBookMatch = req.url.match(/^\/api\/books\/(\d+)$/);

    if (updateBookMatch) {
      const book = await updateBook(updateBookMatch[1], data);

      if (!book) {
        writeJson(res, 404, { error: "Book not found" });
        return;
      }

      writeJson(res, 200, book);
      return;
    }

    const deleteBookMatch = req.url.match(/^\/api\/books\/(\d+)\/delete$/);

    if (deleteBookMatch) {
      const deleted = await deleteBook(deleteBookMatch[1]);

      if (!deleted) {
        writeJson(res, 404, { error: "Book not found" });
        return;
      }

      writeJson(res, 200, { success: true });
      return;
    }

    writeJson(res, 404, { error: "Not found" });
  } catch (error) {
    console.error("API error:", error);
    writeJson(res, 500, { error: error?.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});

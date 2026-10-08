import { db } from "./db.js";

const BOOK_COLUMNS = [
  "title", "idea", "perspective", "audience", "format", "language",
  "genre", "characters", "setting", "chapters", "summary", "directions",
  "story_length", "cover_url", "chapter_count"
];
const JSON_COLUMNS = new Set(["characters", "chapters", "directions"]);
let schemaReady;

async function ensureBookSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const [rows] = await db.query("SHOW COLUMNS FROM books");
      const existing = new Set(rows.map((row) => row.Field));
      const missingColumns = {
        characters: "LONGTEXT",
        setting: "TEXT",
        chapters: "LONGTEXT",
        directions: "LONGTEXT"
      };

      for (const [column, definition] of Object.entries(missingColumns)) {
        if (!existing.has(column)) {
          await db.query(`ALTER TABLE books ADD COLUMN \`${column}\` ${definition}`);
        }
      }
    })();
  }

  return schemaReady;
}

function parseJson(value) {
  if (value == null || value === "") return [];
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function serializeBookValue(column, value) {
  return JSON_COLUMNS.has(column) ? JSON.stringify(value ?? []) : value ?? null;
}

function toBook(row) {
  if (!row) return null;

  return {
    ...row,
    characters: parseJson(row.characters),
    chapters: parseJson(row.chapters),
    directions: parseJson(row.directions),
    created_date: row.created_at,
    updated_date: row.updated_at
  };
}

function writableEntries(book) {
  return BOOK_COLUMNS
    .filter((column) => Object.hasOwn(book, column))
    .map((column) => [column, serializeBookValue(column, book[column])]);
}

export async function createBook(book) {
  await ensureBookSchema();
  const entries = writableEntries({ ...book, chapters: book.chapters ?? [] });
  const [result] = await db.execute(
    `INSERT INTO books (${entries.map(([column]) => `\`${column}\``).join(", ")}) VALUES (${entries.map(() => "?").join(", ")})`,
    entries.map(([, value]) => value)
  );

  return getBook(result.insertId);
}

export async function getBook(id) {
  await ensureBookSchema();
  const [rows] = await db.execute("SELECT * FROM books WHERE id = ?", [id]);
  return toBook(rows[0]);
}

export async function listBooks(limit = 50) {
  await ensureBookSchema();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const [rows] = await db.execute(
    "SELECT * FROM books ORDER BY updated_at DESC LIMIT ?",
    [safeLimit]
  );

  return rows.map(toBook);
}

export async function updateBook(id, updates) {
  await ensureBookSchema();
  const entries = writableEntries(updates);

  if (!entries.length) return getBook(id);

  const [result] = await db.execute(
    `UPDATE books SET ${entries.map(([column]) => `\`${column}\` = ?`).join(", ")} WHERE id = ?`,
    [...entries.map(([, value]) => value), id]
  );

  return result.affectedRows ? getBook(id) : null;
}
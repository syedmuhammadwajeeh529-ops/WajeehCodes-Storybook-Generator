import { db } from "./db.js";

export async function createBook(book) {
  const [result] = await db.execute(
    `INSERT INTO books (
      title,
      idea,
      perspective,
      audience,
      format,
      language,
      genre,
      summary,
      story_length,
      cover_url,
      chapter_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      book.title,
      book.idea,
      book.perspective,
      book.audience,
      book.format,
      book.language,
      book.genre,
      book.summary,
      book.story_length,
      book.cover_url,
      book.chapter_count
    ]
  );

  return {
    id: result.insertId,
    ...book
  };
}
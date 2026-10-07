import { db } from "./db.js";

export async function createChapter(chapter) {
  const [result] = await db.execute(
    `INSERT INTO chapters (
      book_id,
      chapter_number,
      heading,
      body,
      mode,
      manual,
      genre,
      length_mode,
      length_label,
      word_min,
      word_max,
      word_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      chapter.book_id,
      chapter.chapter_number,
      chapter.heading,
      chapter.body,
      chapter.mode,
      chapter.manual ?? false,
      chapter.genre,
      chapter.lengthMode,
      chapter.lengthLabel,
      chapter.wordMin,
      chapter.wordMax,
      chapter.wordCount
    ]
  );

  return {
    id: result.insertId,
    ...chapter
  };
}
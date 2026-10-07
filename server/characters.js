import { db } from "./db.js";

export async function createCharacter(character) {
  const [result] = await db.execute(
    `INSERT INTO characters (
      book_id,
      name,
      role,
      personality,
      traits,
      relationships,
      description
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      character.book_id,
      character.name,
      character.role,
      character.personality,
      character.traits,
      character.relationships,
      character.description
    ]
  );

  return {
    id: result.insertId,
    ...character
  };
}
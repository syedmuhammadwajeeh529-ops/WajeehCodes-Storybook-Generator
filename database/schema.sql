CREATE DATABASE IF NOT EXISTS storybook_generator;

USE storybook_generator;

CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    idea TEXT,
    perspective VARCHAR(100),
    audience VARCHAR(100),
    format VARCHAR(100),
    language VARCHAR(100),
    genre VARCHAR(100),
    summary TEXT,
    story_length VARCHAR(50),
    cover_url TEXT,
    chapter_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE chapters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    chapter_number INT NOT NULL,
    heading VARCHAR(255) NOT NULL,
    body LONGTEXT,
    mode VARCHAR(50),
    manual BOOLEAN DEFAULT FALSE,
    genre VARCHAR(100),
    length_mode VARCHAR(50),
    length_label VARCHAR(100),
    word_min INT,
    word_max INT,
    word_count INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id)
        ON DELETE CASCADE
);

CREATE TABLE characters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    personality TEXT,
    traits TEXT,
    relationships TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id)
        ON DELETE CASCADE
);
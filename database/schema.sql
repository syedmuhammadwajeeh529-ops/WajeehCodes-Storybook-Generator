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
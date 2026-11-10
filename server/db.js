import mysql from "mysql2/promise";

export const db = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || "root",
  database: process.env.MYSQL_DATABASE || "storybook_generator",
  password: process.env.MYSQL_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Load environment variables and required packages
require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs").promises;

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// This function handles the formatting of author names from "LastName, FirstName" to "FirstName LastName"
function formatAuthorName(authorName) {
  // If there's no author name provided, return 'Unknown'
  if (!authorName) return "Unknown";

  // Check if the name contains a comma (indicating "LastName, FirstName" format)
  if (authorName.includes(",")) {
    // Split the name into parts using the comma
    const [lastName, firstName] = authorName
      .split(",")
      .map((part) => part.trim());
    // Combine the parts in the desired order with proper spacing
    return `${firstName} ${lastName}`;
  }

  // If there's no comma, return the name unchanged
  return authorName;
}

// Function to create our database tables
async function createTables() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create the books table with properly formatted author names
    await client.query(`
            CREATE TABLE IF NOT EXISTS books (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                author VARCHAR(255) NOT NULL,
                download_count INTEGER,
                image_link VARCHAR(255),
                CONSTRAINT unique_book UNIQUE (title, author)
            );
        `);

    // Create the categories table
    await client.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                CONSTRAINT unique_category UNIQUE (name)
            );
        `);

    // Create the junction table for books and categories
    await client.query(`
            CREATE TABLE IF NOT EXISTS book_categories (
                book_id INTEGER REFERENCES books(id),
                category_id INTEGER REFERENCES categories(id),
                PRIMARY KEY (book_id, category_id)
            );
        `);

    await client.query("COMMIT");
    console.log("Tables created successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Function to process categories from subject strings
function parseCategories(subject) {
  return subject
    .split("--")
    .map((cat) => cat.trim())
    .filter((cat) => cat.length > 0)
    .filter((cat) => !cat.toLowerCase().endsWith("fiction"));
}

// Function to insert a book and its categories with properly formatted author name
async function insertBookData(client, book) {
  // Get the author's name from the first author in the list
  // Format it from "LastName, FirstName" to "FirstName LastName"
  const authorName =
    book.authors.length > 0
      ? formatAuthorName(book.authors[0].name)
      : "Unknown";

  // Insert the book with the formatted author name
  const bookResult = await client.query(
    `
        INSERT INTO books (title, author, download_count, image_link)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT ON CONSTRAINT unique_book 
        DO UPDATE SET
            download_count = EXCLUDED.download_count,
            image_link = EXCLUDED.image_link
        RETURNING id;
    `,
    [
      book.title,
      authorName, // Now using the formatted author name
      book.download_count,
      book.formats["image/jpeg"] || null,
    ]
  );

  const bookId = bookResult.rows[0].id;

  // Process and insert categories for the book
  for (const subject of book.subjects) {
    const categories = parseCategories(subject);

    for (const categoryName of categories) {
      // Insert category if it doesn't exist
      const categoryResult = await client.query(
        `
                INSERT INTO categories (name)
                VALUES ($1)
                ON CONFLICT ON CONSTRAINT unique_category 
                DO UPDATE SET name = EXCLUDED.name
                RETURNING id;
            `,
        [categoryName]
      );

      const categoryId = categoryResult.rows[0].id;

      // Create relationship between book and category
      await client.query(
        `
                INSERT INTO book_categories (book_id, category_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING;
            `,
        [bookId, categoryId]
      );
    }
  }
}

// Main function to populate the database
async function populateDatabase() {
  try {
    // Create the database structure
    await createTables();

    // Read and parse the JSON data file
    const rawData = await fs.readFile("books.json", "utf8");
    const bookData = JSON.parse(rawData);

    // Get a client for the data insertion transaction
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Process each book, formatting author names as we go
      for (const book of bookData.results) {
        await insertBookData(client, book);
      }

      await client.query("COMMIT");
      console.log(
        `Successfully imported ${bookData.results.length} books with formatted author names`
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error populating database:", error);
  } finally {
    await pool.end();
  }
}

// Run the script
populateDatabase();

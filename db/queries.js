// const { editBook } = require("../controllers/inventoryController");
const pool = require("./pool");

async function fetchBooks() {
  const { rows } = await pool.query("SELECT * FROM books");
  return rows;
}

async function getCategories() {
  const { rows } = await pool.query(
    "SELECT name AS category FROM categories ORDER BY name"
  );
  return rows;
}

async function getAuthors() {
  const { rows } = await pool.query(
    "SELECT DISTINCT author FROM books ORDER BY author;"
  );
  return rows;
}

async function getDownloads() {
  const { rows } = await pool.query(
    "SELECT author,COUNT(*) as number_of_books,SUM(download_count) as total_downloads,ROUND(AVG(download_count)) as average_downloads_per_book,MAX(download_count) as most_downloaded_book,MIN(download_count) as least_downloaded_book FROM books GROUP BY author ORDER BY total_downloads DESC;"
  );
  return rows;
}
async function getBook(id) {
  const { rows } = await pool.query(
    `
    SELECT 
        books.*, 
        array_agg(categories.name) as categories 
    FROM books 
    LEFT JOIN book_categories ON books.id = book_categories.book_id 
    LEFT JOIN categories ON book_categories.category_id = categories.id 
    WHERE books.id = $1
    GROUP BY books.id
`,
    [id]
  );
  return rows;
}

async function editBookInfos(id, bookInfos) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const bookQuery = `
            UPDATE books 
            SET title = $2, author = $3, download_count = $4, image_link = $5 
            WHERE id = $1
            RETURNING *`;

    const bookResult = await client.query(bookQuery, [
      id,
      bookInfos.title,
      bookInfos.author,
      bookInfos.download_count,
      bookInfos.image_link,
    ]);

    await client.query("DELETE FROM book_categories WHERE book_id = $1", [id]);

    for (const categoryName of bookInfos.categories) {
      if (categoryName.trim()) {
        const categoryResult = await client.query(
          `INSERT INTO categories (name)
        VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET name = $1 
        RETURNING   id`,
          [categoryName]
        );
        await client.query(
          `INSERT INTO book_categories (book_id, category_id)
        VALUES ($1,$2)`,
          [id, categoryResult.rows[0].id]
        );
      }
    }
    await client.query("COMMIT");

    return bookResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function newBook(bookInfo) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const query = `INSERT INTO books (title, author, download_count, image_link)
                  VALUES ($1, $2, $3, $4)
                  RETURNING *;`;

    const result = await client.query(query, [
      bookInfo.title,
      bookInfo.author,
      bookInfo.download_count,
      bookInfo.image_link,
    ]);

    const bookId = result.rows[0].id;

    for (const categoryName of bookInfo.categories) {
      if (categoryName.trim()) {
        const categoryResult = await client.query(
          `INSERT INTO categories (name)
                 VALUES ($1)
                 ON CONFLICT (name) DO UPDATE SET name = $1
                 RETURNING id`,
          [categoryName]
        );

        await client.query(
          `INSERT INTO book_categories (book_id,category_id) VALUES ($1,$2)`,
          [bookId, categoryResult.rows[0].id]
        );
      }
    }
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteBook(id) {
  if (!id || isNaN(parseInt(id))) {
    throw new Error("Invalid book ID provided");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const deleteRelationshipsQuery = `
    DELETE FROM book_categories
    WHERE book_id = $1
    `;
    await client.query(deleteRelationshipsQuery, [id]);

    const deleteBookQuery = `
    DELETE FROM books WHERE id = $1
    RETURNING *
    `;
    const result = await client.query(deleteBookQuery, [id]);
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error in deletion", error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  fetchBooks,
  getCategories,
  getAuthors,
  getDownloads,
  getBook,
  editBookInfos,
  newBook,
  deleteBook,
};

const db = require("../db/queries");

async function index(req, res) {
  const booksFetched = await db.fetchBooks();
  res.render("index", {
    title: "Homepage",
    books: booksFetched,
  });
}

async function getCategories(req, res) {
  const categories = await db.getCategories();
  res.render("categories", {
    title: "Categories",
    categories: categories,
  });
}

async function getAuthors(req, res) {
  const authors = await db.getAuthors();
  res.render("authors", {
    title: "Authors",
    authors: authors,
  });
}

async function getDownloads(req, res) {
  const downloads = await db.getDownloads();
  res.render("downloads", {
    title: "Downloads",
    downloads: downloads,
  });
}

async function getBook(req, res) {
  const book = await db.getBook(req.params.id);
  res.render("viewBook", {
    book: book[0],
  });
}

async function editBook(req, res) {
  const { id } = req.params;
  const bookInfos = req.body;
  await db.editBookInfos(id, bookInfos);
  res.redirect(`/book/${id}`);
}

async function newBook(req, res) {
  const bookInfos = req.body;
  const newRow = await db.newBook(bookInfos);
  res.redirect(`/book/${newRow.id}`);
}
async function deleteBook(req, res) {
  const bookId = req.body.id;
  await db.deleteBook(bookId);
  res.redirect("/");
}

module.exports = {
  index,
  getCategories,
  getAuthors,
  getDownloads,
  getBook,
  editBook,
  newBook,
  deleteBook,
};

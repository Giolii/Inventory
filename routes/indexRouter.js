const Router = require("express");
const indexRouter = Router();
const controller = require("../controllers/inventoryController");

indexRouter.get("/", controller.index);
indexRouter.get("/categories", controller.getCategories);
indexRouter.get("/authors", controller.getAuthors);
indexRouter.get("/downloads", controller.getDownloads);
indexRouter.get("/book/:id", controller.getBook);
indexRouter.post("/book/edit/:id", controller.editBook);
indexRouter.post("/book/new", controller.newBook);
indexRouter.post("/delete", controller.deleteBook);

module.exports = indexRouter;

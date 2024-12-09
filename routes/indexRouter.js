const Router = require("express");
const indexRouter = Router();
const controller = require("../controllers/inventoryController");

indexRouter.get("/", controller.index);

module.exports = indexRouter;

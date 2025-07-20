const express = require("express");
const router = express.Router();
const { getPaginatedNews } = require("../controllers/news");
router.get("/list", getPaginatedNews);

module.exports = router;

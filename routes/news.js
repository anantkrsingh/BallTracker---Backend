const express = require("express");
const router = express.Router();
const { getPaginatedNews , getShorts} = require("../controllers/news");
router.get("/list", getPaginatedNews);
router.get("/shorts", getShorts);
module.exports = router;

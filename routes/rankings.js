const express = require("express");
const router = express.Router();
const { getRankings } = require("../controllers/ranking");

router.get("/", getRankings);

module.exports = router;

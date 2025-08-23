const express = require("express");
const router = express.Router();
const {addExpoPushToken} = require("../controllers/push");
router.post("/add", addExpoPushToken); 

module.exports = router;

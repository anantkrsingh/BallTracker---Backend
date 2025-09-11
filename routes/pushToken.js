const express = require("express");
const router = express.Router();

const { addExpoPushToken, updatePushToken } = require("../controllers/push");

router.post("/add", addExpoPushToken);
router.put("/update", updatePushToken);

module.exports = router;    

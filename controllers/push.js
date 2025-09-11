const PushToken = require("../models/pushTokens");

async function addExpoPushToken(req, res) {
  try {
    const { pushToken } = req.body;
    await PushToken.create({ pushToken });
    res.status(200).json({ message: "Token Saved" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function updatePushToken(req, res) {
  try {
    console.log(req.body);

    const { pushToken } = req.body;
    await PushToken.findOneAndUpdate(
      { pushToken },
      { $set: req.body },
      { new: true, upsert: true }
    );
    res.status(200).json({ message: "Token Updated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  addExpoPushToken,
  updatePushToken,
};

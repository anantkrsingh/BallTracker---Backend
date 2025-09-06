const Bull = require("bull");
const { default: axios } = require("axios");
const pushTokens = require("../models/pushTokens");

const notificationQueue = new Bull("notifications", {
  redis: {
    url: process.env.REDIS_URL,
  },
});

function addNotification(title, message) {
  return notificationQueue.add({ title, message });
}

let PUSH_TOKENS = [];

async function getPushTokens() {
  const tokens = await pushTokens.find({});
  PUSH_TOKENS = tokens.map((token) => token.pushToken);
}

setInterval(async () => {
  await getPushTokens();
}, 10000);

async function sendNotification({ title, message }) {
  if (PUSH_TOKENS.length === 0) {
    await getPushTokens();
  }
  console.log(title, message);
  addNotification(title, message);
}
notificationQueue.process(async (job) => {
  const { title, message } = job.data;

  const chunkSize = 100;
  for (let i = 0; i < PUSH_TOKENS.length; i += chunkSize) {
    const chunk = PUSH_TOKENS.slice(i, i + chunkSize);

    const messages = chunk.map((token) => ({
      to: token,
      sound: "default",
      title,
      body: message,
    }));

    try {
      const response = await axios.post(
        "https://api.expo.dev/v2/push/send",
        messages
      );

      const data = await response.data;
      console.log("📨 Sent notification batch:", data);
    } catch (error) {
      console.error("❌ Error sending notification:", error);
    }
  }
});

module.exports = sendNotification;

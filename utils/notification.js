const Bull = require("bull");
const { default: axios } = require("axios");
const pushTokens = require("../models/pushTokens");

const notificationQueue = new Bull("notifications", {
  redis: {
    url: process.env.REDIS_URL,
  },
});

function addNotification(title, message, type) {
  return notificationQueue.add({ title, message, type });
}

let PUSH_TOKENS = [];

async function getPushTokens() {
  const tokens = await pushTokens.find({});
  PUSH_TOKENS = tokens;
}

setInterval(async () => {
  await getPushTokens();
}, 10000);

async function sendNotification({ title, message, type }) {
  if (PUSH_TOKENS.length === 0) {
    await getPushTokens();
  }
  console.log(title, message, type);
  addNotification(title, message, type);
}
notificationQueue.process(async (job) => {
  const { title, message, type } = job.data;

  const chunkSize = 100;
  for (let i = 0; i < PUSH_TOKENS.length; i += chunkSize) {
    const chunk = PUSH_TOKENS.slice(i, i + chunkSize);

    const filteredTokens = chunk.filter((token) => token[type]);

    const messages = filteredTokens.map((token) => ({
      to: token.pushToken,
      sound: "default",
      title,
      body: message,
      data: {
        type,
      },
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

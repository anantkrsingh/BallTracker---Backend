const ioredis = require("ioredis");
const Bull = require("bull");
const fetch = require("node-fetch");
const { default: axios } = require("axios");

const notificationQueue = new Bull("notifications", {
  redis: {
    url: process.env.REDIS_URL,
  },
});

function addNotification(title, message) {
  return notificationQueue.add({ title, message });
}

const PUSH_TOKENS = ["ExponentPushToken[vOVmiEPaVsDAfs_APAN9Sc]"];

async function sendNotification({ title, message }) {
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

const Bull = require("bull");
const { default: axios } = require("axios");
const pushTokens = require("../models/pushTokens");
const redisClient = require("../redis");

const notificationQueue = new Bull("notifications", {
  redis: {
    url: process.env.REDIS_URL,
  },
});

function addNotification(title, message, type) {
  return notificationQueue.add({ title, message, type });
}

function generateNotificationCacheKey(title, message, type) {
  const { createHash } = require("crypto");
  const content = `${title}|${message}|${type}`;
  return `notification:${createHash("md5").update(content).digest("hex")}`;
}

async function isNotificationAlreadySent(title, message, type) {
  const cacheKey = generateNotificationCacheKey(title, message, type);
  const cached = await redisClient.get(cacheKey);
  return cached !== null;
}

async function markNotificationAsSent(title, message, type) {
  const cacheKey = generateNotificationCacheKey(title, message, type);
  await redisClient.setEx(cacheKey, 3600, "sent");
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
  const alreadySent = await isNotificationAlreadySent(title, message, type);
  if (alreadySent) {
    console.log("🚫 Duplicate notification prevented:", title, message, type);
    return;
  }

  await markNotificationAsSent(title, message, type);

  if (PUSH_TOKENS.length === 0) {
    await getPushTokens();
  }
  console.log("📤 Sending notification:", title, message, type);
  addNotification(title, message, type);
}
notificationQueue.process(async (job) => {
  const { title, message, type } = job.data;
  console.log("📨 Processing notification:", title, message, type);

  const chunkSize = 100;
  for (let i = 0; i < PUSH_TOKENS.length; i += chunkSize) {
    console.log("📨 Sending notification batch:", title, message, type);
    const chunk = PUSH_TOKENS.slice(i, i + chunkSize);

    const filteredTokens = chunk.filter((token) => token[type]);

     console.log(" Filtered tokens "+filteredTokens.length)

    const messages = filteredTokens.map((token) => ({
      to: token.pushToken,
      sound: "default",
      title,
      body: message,
      data: {
        type,
      },
    }));
    console.log("📨 Sending notification batch messages:", messages.length);
    
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

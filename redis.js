const { createClient } = require('redis')

const redisClient = createClient({
    host: 'localhost',
    port: 6379
})


redisClient.on('error', (err) => {
    console.log(err)
})

redisClient.on('connect', () => {
    console.log('Connected to Redis')
})
redisClient.connect()

module.exports = redisClient;

import express from 'express';
import RateLimiter from './rate-limiter.js';
import RateLimiterSet from './rate-limiter-set.js';
import { createClient } from 'redis';

const app = express();
const port = 3000;

app.use(express.json());

const client = createClient({
    socket: {
        host: '127.0.0.1',
        port: 63790,
    }
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

const rateLimiter = new RateLimiterSet(client, 200, 100);

app.all('*', async (req, res) => {
    // try {
        const remainig = await rateLimiter.consume(req.ip);

        res.set('X-Ratelimit-Remaining', remainig);
        res.set('X-Ratelimit-Limit', rateLimiter.getCapacity());

        return res.status(200).json({ message: 'ok' });
    // } catch (err) {
    //     res.set('X-Ratelimit-Remaining', 0);
    //     res.set('X-Ratelimit-Limit', rateLimiter.getCapacity());

    //     return res.status(429).json({ message: 'Too many requests' });    
    // }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

setInterval(async () => {
    await rateLimiter.refill();
}, 1000);
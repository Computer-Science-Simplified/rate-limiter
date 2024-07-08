export default class RateLimiter {
    constructor(redis, capacity, refillRate) {
        this.redis = redis;
        this.capacity = capacity;
        this.refillRate = refillRate;
    }

    getCapacity() {
        return this.capacity;
    }

    /**
     * @returns int The remaining limit
     */
    async consume(ipAddress) {
        await this.init(ipAddress);

        const currentBuckets = await this.redis.hGet('rate-limiter', ipAddress);

        if (currentBuckets == 0) {
            throw new Error('Rate limit exceeded');
        }

        return await this.redis.hIncrBy('rate-limiter', ipAddress, -1);
    }

    async init(ipAddress) {
        if (!(await this.redis.hExists('rate-limiter', ipAddress))) {
            await this.redis.hSet('rate-limiter', ipAddress, this.capacity); 
        }
    }

    async refill() {
        const ipAddresses = await this.redis.hKeys('rate-limiter');

        for (let ipAddress of ipAddresses) {
            const remaining = await this.redis.hGet('rate-limiter', ipAddress);

            const increaseBy = Math.floor(this.refillRate / 60);

            if ((remaining + increaseBy) > this.capacity) {
                await this.redis.hSet('rate-limiter', ipAddress, this.capacity);

                return;
            }

            await this.redis.hIncrBy('rate-limiter', ipAddress, increaseBy);
        }
    }
}
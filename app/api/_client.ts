import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv(); // 使用环境变量：UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN

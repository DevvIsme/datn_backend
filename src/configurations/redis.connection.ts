import { createClient } from "redis";
import env from "./environment";

const client = createClient({
  url: `redis://${env.redis_password}@${env.redis_host}:${env.redis_port}`,
});

const redisConnection = async () => {
  try {
    await client.connect();
    const ping = await client.ping();
    console.log("Access to Redis successfully! ", ping);
  } catch (err) {
    console.error("An error occurred while connecting to Redis:", err);
    throw err;
  }
};

export { client, redisConnection };

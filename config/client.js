import redis from "@redis/client";
import dotenv from "dotenv";

dotenv.config();

const connectClient = async () => {
  try {
    const client = redis.createClient({
      url:
        "redis://" +
        process.env.REDIS_USER +
        ":" +
        process.env.REDIS_PASSWORD +
        "@" +
        process.env.REDIS_ENDPOINT +
        ":" +
        process.env.REDIS_PORT,
    });
    client.on("connect", () => {
      console.log("connected");
    });
    client.connect();
    return client;
  } catch (error) {
    console.log(error);
  }
};
export default connectClient;

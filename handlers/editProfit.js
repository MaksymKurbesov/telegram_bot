import { redisClient } from '../index.js';

export const editProfit = async userId => {
  const user = await redisClient.hgetall(`user:${userId}`);
  const { request_edit_profit_message_id } = user;
};

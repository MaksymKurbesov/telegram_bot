import { generateUser } from '../helpers.js';
import { getFullCabinetPage } from '../pages/cabinet.js';
import { redisClient } from '../index.js';
import FIREBASE_API from '../FIREBASE_API.js';

export const profileEntry = async (username, chatId) => {
  try {
    const userData = FIREBASE_API.getUser(chatId);

    if (!userData.exists) {
      const user = generateUser(chatId, username);
      await FIREBASE_API.addUser(user, chatId);

      await redisClient.hset(`user:${chatId}`, user);
    } else {
      await redisClient.hset(`user:${chatId}`, userData.data());
    }

    await getFullCabinetPage(chatId);
  } catch (e) {
    console.log(e, 'captcha lion error');
  }
};

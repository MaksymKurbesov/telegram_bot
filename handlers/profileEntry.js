import { generateUser } from '../helpers.js';
import { getFullCabinetPage } from '../pages/cabinet.js';
import { FirebaseApi, redisClient } from '../index.js';

export const profileEntry = async (username, chatId) => {
  try {
    const userData = FirebaseApi.getUser(chatId);

    if (!userData.exists) {
      const user = generateUser(chatId, username);
      await FirebaseApi.addUser(user, chatId);

      await redisClient.hset(`user:${chatId}`, user);
    } else {
      await redisClient.hset(`user:${chatId}`, userData.data());
    }

    await getFullCabinetPage(chatId);
  } catch (e) {
    console.log(e, 'captcha lion error');
  }
};

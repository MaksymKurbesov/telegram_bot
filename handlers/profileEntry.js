import { db } from "../db.js";
import { addUserFields } from "../helpers.js";
import { getFullCabinetPage } from "../pages/cabinet.js";
import { redisClient } from "../index.js";

export const profileEntry = async (username, chatId) => {
  try {
    const userData = await db.collection("users").doc(chatId).get();

    if (!userData.exists) {
      await db
        .collection("users")
        .doc(chatId)
        .set(addUserFields(chatId, username));

      const userFields = addUserFields(chatId, username);

      await redisClient.hset(`user:${chatId}`, userFields);
    } else {
      await redisClient.hset(`user:${chatId}`, userData.data());
    }

    await getFullCabinetPage(chatId);
  } catch (e) {
    console.log(e, "captcha lion error");
  }
};

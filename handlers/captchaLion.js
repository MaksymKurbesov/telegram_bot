import { db } from "../db.js";
import { addUserFields } from "../helpers.js";
import { getFullCabinetPage } from "../pages/cabinet.js";
import { usersCache } from "../index.js";

export const captchaLion = async (username, chatId) => {
  const userData = await db.collection("users").doc(username).get();

  if (!userData.exists) {
    await db
      .collection("users")
      .doc(username)
      .set(addUserFields(chatId, username));
    usersCache[username] = addUserFields(chatId, username);
  } else {
    usersCache[username] = userData.data();
  }

  await getFullCabinetPage(chatId, username);
};

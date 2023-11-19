import { db } from "../db.js";
import { sendCurrentPage } from "../helpers.js";
import { userPagination } from "../index.js";

export const getUserProfits = async (
  chatId,
  messageId,
  username,
  profitsType
) => {
  userPagination[chatId] = 1;

  const userData = await db.collection("users").doc(username).get();

  await sendCurrentPage(
    chatId,
    messageId,
    1,
    userData.data().profits,
    profitsType === "ukr" ? "UKR" : "F/F"
  );
};

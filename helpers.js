import { db } from "./db.js";
import { bot, usersCache } from "./index.js";

const addEmailsToDataBase = (emails, queryMsg) => {
  if (!usersCache[queryMsg.chat.username].isAdmin) {
    return;
  }
  const chatId = queryMsg.chat.id;

  const normalizedEmails = emails.split(",").map((email) => email.trim());

  const emailsPromises = normalizedEmails.map(async (email) => {
    await db.collection("emails").doc(email).set({
      balance: 0,
      email,
      limit: 1000,
      status: "Свободен",
    });
  });

  Promise.all(emailsPromises).then(async () => {
    await bot.sendMessage(chatId, "Email успешно добавлены!");
  });
};

const generateUniqueID = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let uniqueID = "";

  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    uniqueID += characters[randomIndex];
  }

  return uniqueID;
};

const isJSONField = (object, fieldName) => {
  if (typeof object[fieldName] !== "string") return false;
  try {
    JSON.parse(object[fieldName]);
    return true;
  } catch (e) {
    return false;
  }
};

const addUserFields = (chatId, nickname) => {
  return {
    chatId,
    nickname,
    nametag: `#${chatId}`,
    teamTopProfit: 0,
    profits: [],
    paypals: [],
    ibans: [],
    wallets: {
      bitcoin: "",
      trc20: "",
    },
  };
};

export { addEmailsToDataBase, addUserFields, isJSONField, generateUniqueID };

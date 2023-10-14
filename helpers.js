import { sendMailToUserOptions } from "./options.js";
import { NOTIFICATION_CHAT_ID } from "./consts.js";
import { db } from "./db.js";
import { bot, usersCache } from "./index.js";

const availableEmails = [
  "test1@gmail.com",
  "test2@gmail.com",
  "test3@gmail.com",
];

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

const sendPaypalRequest = async (chatId, messageId, data, nickname) => {
  const getPaypalAmount = data.split("_")[1];

  await bot.editMessageReplyMarkup(
    {
      inline_keyboard: [[{ text: "Назад", callback_data: "cabinet" }]],
    },
    {
      chat_id: chatId,
      message_id: messageId,
    }
  );

  await bot.sendMessage(
    NOTIFICATION_CHAT_ID,
    `REQUEST PAYPAL UKR!\nSum: ${getPaypalAmount}€\nUser: ${nickname}\n#TAG${chatId}`,
    sendMailToUserOptions(availableEmails)
  );
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
    profitsCount: 0,
    totalProfits: 0,
    personalTopProfit: 0,
    teamTopProfit: 0,
    paypals: [],
    ibans: [],
    walelts: {
      bitcoin: "",
      trc20: "",
    },
  };
};

export {
  addEmailsToDataBase,
  addUserFields,
  isJSONField,
  sendPaypalRequest,
  generateUniqueID,
};

import { MAIN_IMAGE } from "../consts.js";
import { db } from "../db.js";
import { bot } from "../index.js";

const cabinetCaption = (userData) => {
  const { nickname, profits, teamTopProfit } = userData;

  const totalProfitsAmount = profits
    .filter((profit) => profit.status === "ВЫПЛАЧЕНО!")
    .reduce((sum, profit) => sum + profit.amount, 0);

  const personalTopProfit = profits
    .filter((profit) => profit.status === "ВЫПЛАЧЕНО!")
    .reduce((max, profit) => {
      return max === null || profit.amount > max.amount ? profit : max;
    }, null);

  return `
Кабинет: <b>${nickname}</b>\n 
Количество профитов: <b>${profits.length} шт</b>.
💶 Общая сумма профитов: <b>${totalProfitsAmount}€</b>
💶 Личный топ профит: <b>${
    personalTopProfit ? personalTopProfit.amount : 0
  }€</b>
💶 Топ профит тимы: <b>${teamTopProfit}€</b>
    `;
};

const cabinetOptions = (userData) => {
  return {
    caption: cabinetCaption(userData),
    reply_markup: {
      inline_keyboard: [
        [{ text: "Профиль 🪪", callback_data: "profile" }],
        [
          {
            text: "Взять PayPal 🅿️",
            callback_data: "request_paypal",
          },
          {
            text: "Взять IBAN 💳",
            callback_data: "request_iban",
          },
        ],
        [
          {
            text: "Support 🆘",
            callback_data: "support",
          },
          {
            text: "Чаты 💬",
            callback_data: "chats",
          },
        ],
      ],
    },
    parse_mode: "HTML",
  };
};

const getFullCabinetPage = async (chatID, userNickname) => {
  const userRef = db.collection("users").doc(userNickname);
  const userDoc = await userRef.get();

  await bot.sendPhoto(chatID, MAIN_IMAGE, cabinetOptions(userDoc.data()));
};

const getCabinetPage = async (chatID, messageID, userNickname) => {
  const userRef = db.collection("users").doc(userNickname);
  const userDoc = await userRef.get();

  await bot.editMessageCaption(cabinetCaption(userDoc.data()), {
    chat_id: chatID,
    message_id: messageID,
    parse_mode: "HTML",
    reply_markup: cabinetOptions(userDoc.data()).reply_markup,
  });
};

export { getCabinetPage, getFullCabinetPage };

import { MAIN_IMAGE } from "../consts.js";
import { db } from "../db.js";
import { bot } from "../index.js";

const cabinetCaption = (userData) => {
  const {
    nickname,
    profitsCount,
    totalProfits,
    personalTopProfit,
    teamTopProfit,
  } = userData;

  return `
Кабинет: <b>${nickname}</b>\n
Количество профитов: <b>${profitsCount} шт</b>.
💶 Общая сумма профитов: <b>${totalProfits}€</b>
💶 Личный топ профит: <b>${personalTopProfit}€</b>
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

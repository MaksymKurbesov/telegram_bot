import { bot } from "./index.js";
import { ITEMS_PER_PAGE } from "./consts.js";

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

const getPaginationKeyboard = (page, items, type) => {
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const keyboard = [];

  if (page > 1) {
    keyboard.push({ text: "⬅️", callback_data: `prev_${page - 1}_${type}` });
  }

  if (page < totalPages) {
    keyboard.push({ text: "➡️", callback_data: `next_${page + 1}_${type}` });
  }

  return {
    reply_markup: {
      inline_keyboard: [
        keyboard,
        [{ text: "Назад", callback_data: "user_profits" }],
      ],
    },
  };
};

const sendCurrentPage = async (chatId, messageId, page, items, type) => {
  try {
    const filteredItems = items.filter((profit) => profit.type === type);

    const pageItems = filteredItems.slice(
      (page - 1) * ITEMS_PER_PAGE,
      page * ITEMS_PER_PAGE
    );
    const messageText = pageItems
      .map(
        (item, index) =>
          `${index + 1}. #${item.id} | ${item.email} | ${item.amount}€ | ${
            item.status
          }`
      )
      .join("\n");

    const options = {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: getPaginationKeyboard(page, filteredItems, type)
        .reply_markup,
    };

    await bot.editMessageCaption(
      `<b>Ваши профиты ${type}:</b>\n\n${messageText}`,
      options
    );
  } catch (e) {
    console.log(e, "error");
  }
};

const addUserFields = (chatId, nickname) => {
  return {
    chatId,
    nickname,
    nametag: `#${generateNametag(chatId)}`,
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

const generateNametag = (...numbers) => {
  let id = "";
  numbers.forEach((number) => {
    id += number.toString(16); // Преобразуем число в шестнадцатеричный формат
  });
  return id;
};

export { addUserFields, isJSONField, generateUniqueID, sendCurrentPage };

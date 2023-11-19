import { bot } from "../index.js";

export const getIbansPage = async (chatID, messageID) => {
  await bot.editMessageCaption(`<b>IBAN на данный момент нет в наличие.</b>`, {
    chat_id: chatID,
    message_id: messageID,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "Назад", callback_data: "cabinet" }]],
    },
  });
};

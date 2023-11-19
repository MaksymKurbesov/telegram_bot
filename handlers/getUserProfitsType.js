import { bot } from "../index.js";

export const getUserProfitsType = async (chatId, messageId) => {
  await bot.editMessageCaption(`<b>Выберите тип профитов</b>`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "UKR",
            callback_data: "get_user_profits_ukr",
          },
          {
            text: "EU F/F",
            callback_data: "get_user_profits_eu",
          },
        ],
        [{ text: "Назад", callback_data: "cabinet" }],
      ],
    },
  });
};

import { bot } from "../index.js";

export const getChats = async (chatId, messageId) => {
  await bot.editMessageCaption(`<b>Залетай и узнавай всю инфу первым</b>`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Выплаты 💸", url: "https://t.me/paymentnotifications" }],
        [{ text: "Общение 🗣", callback_data: "get_chat_invite_link" }],
        [{ text: "Назад", callback_data: "cabinet" }],
      ],
    },
  });
};

import { bot, userSupportState } from "../index.js";

export const getSupportPage = async (chatId, messageId, username) => {
  userSupportState[username] = true;

  await bot.editMessageCaption(
    `<b>Задайте любой интересующий вас вопрос и наш саппорт свяжется с вами для решение проблемы.</b>`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Назад", callback_data: "cabinet" }]],
      },
    }
  );
};

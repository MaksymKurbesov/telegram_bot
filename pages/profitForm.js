import { bot, userProfitFormStates } from "../index.js";
import { generateUniqueID } from "../helpers.js";

export const requestProfit = async (chatId, parsedData) => {
  const sendMessage = await bot.sendMessage(
    // chat.id,
    chatId,
    `Оформление профита на PayPal #UKR:\n\n${parsedData.userPaypal}`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Продолжить", callback_data: "request_profit_bill" }],
          [{ text: "Отмена", callback_data: "cabinet" }],
        ],
      },
    }
  );

  userProfitFormStates[chatId] = {
    step: 1,
    data: {
      id: generateUniqueID(),
      paypal: parsedData.userPaypal,
      message_id: sendMessage.message_id,
      // chat_id: chat.id,
      chat_id: chatId,
    },
  };
};

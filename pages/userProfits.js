import { bot } from "../index.js";

export const userProfitsCaption = (userProfits) => {
  const userProfitsStr = userProfits
    .map((userProfit) => {
      return `<b>🟢 ID:</b> #${userProfit.id}|<b>Email:</b> ${userProfit.email}|<b>Сумма:</b> ${userProfit.amount}€|<b>Имя:</b> ${userProfit.name}|<b>Статус:</b> ${userProfit.status}`;
    })
    .join("\n------------------\n");

  return `<b>🗂 Профиты: </b>\n\n${userProfitsStr}`;
};

const userProfitsOptions = () => {
  return {
    inline_keyboard: [
      [
        {
          text: `Назад`,
          callback_data: "cabinet",
        },
      ],
    ],
  };
};

const getUserProfitsPage = async (chatID, messageID, userPaypals) => {
  try {
    await bot.editMessageCaption(userProfitsCaption(userPaypals), {
      chat_id: chatID,
      message_id: messageID,
      parse_mode: "HTML",
      reply_markup: userProfitsOptions(userPaypals),
    });
  } catch (e) {
    console.log(e);
  }
};

export { getUserProfitsPage };

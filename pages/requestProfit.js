import { bot } from "../index.js";

const requestProfitCaption = (userPaypals) => {
  const userPaypalsStr = userPaypals
    .map((userPaypal) => {
      return `<b>${userPaypal.type}</b> | ${userPaypal.email} | На сумму: ${userPaypal.limit}`;
    })
    .join("\n");

  return `<b>🅿️ Ваши PayPal:</b>\n\n${userPaypalsStr}`;
};

const requestProfitOptions = (userPaypals) => {
  const userPaypalsButtons = userPaypals.map((userPaypal) => {
    return [
      {
        text: `${userPaypal.email}`,
        callback_data: JSON.stringify({
          action: "rp",
          userPaypal: userPaypal.email,
        }),
      },
    ];
  });

  return {
    inline_keyboard: [
      ...userPaypalsButtons,
      [
        {
          text: `Назад`,
          callback_data: "cabinet",
        },
      ],
    ],
  };
};

const requestProfit = async (chatID, messageID, userPaypals) => {
  await bot.editMessageCaption(requestProfitCaption(userPaypals), {
    chat_id: chatID,
    message_id: messageID,
    parse_mode: "HTML",
    reply_markup: requestProfitOptions(userPaypals),
  });
};

export { requestProfit };

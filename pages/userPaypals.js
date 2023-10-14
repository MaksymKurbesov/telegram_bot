import { bot } from "../index.js";

const userPaypalsCaption = (userPaypals) => {
  const userPaypalsStr = userPaypals
    .map((userPaypal) => {
      return `${userPaypal.email} | На сумму: ${userPaypal.limit}`;
    })
    .join("\n");

  return `<b>PayPal #UKR: </b>\n\n${userPaypalsStr}`;
};

const userPaypalsOptions = (userPaypals) => {
  const userPaypalsButtons = userPaypals.map((userPaypal) => {
    return [
      {
        text: `${userPaypal.email}`,
        callback_data: JSON.stringify({
          action: "request_profit",
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

const getUserPaypalsPage = async (chatID, messageID, userPaypals) => {
  await bot.editMessageCaption(userPaypalsCaption(userPaypals), {
    chat_id: chatID,
    message_id: messageID,
    parse_mode: "HTML",
    reply_markup: userPaypalsOptions(userPaypals),
  });
};

export { getUserPaypalsPage };

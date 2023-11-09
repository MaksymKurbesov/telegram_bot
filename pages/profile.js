import { bot } from "../index.js";

const profileCaption = () => {
  return `<b>Профиль</b>\n\nЗдесь можно посмотреть статусы ваших профитов, взятые вами PayPal и IBAN, так же указать реквизиты для выплат.`;
};

const profileOptions = () => {
  return {
    inline_keyboard: [
      [
        {
          text: `Профиты`,
          callback_data: "user_profits",
        },
      ],
      [
        {
          text: `Оформить профит`,
          callback_data: "request_profit",
        },
        {
          text: `Мои IBAN`,
          callback_data: "my_ibans",
        },
      ],
      [
        {
          text: `Реквизиты для выплат`,
          callback_data: "payment_details",
        },
        {
          text: `NAMETAG`,
          callback_data: "nametag",
        },
      ],
      [
        {
          text: `Назад`,
          callback_data: "cabinet",
        },
      ],
    ],
    parse_mode: "HTML",
  };
};

const getProfilePage = async (chatID, messageID) => {
  await bot.editMessageCaption(profileCaption(), {
    chat_id: chatID,
    message_id: messageID,
    parse_mode: "HTML",
    reply_markup: profileOptions(),
  });
};

export { getProfilePage };

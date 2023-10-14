const STATUS_EMOJI = {
  Выдан: "✅",
  Статус1: "⛱",
  Статус2: "🎲",
  Статус3: "🏆",
  Ожидание: "⌛",
};

const ORDER_CAPTION_TEXT = `Если необходимо, тут будет указываться дополнительная информация по типу: ник, сколько взято имейлов и любая другая информация которую можно попросить у пользователя.`;

const captchaOptions = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🦬", callback_data: "captcha_bull" },
        { text: "🐻", callback_data: "captcha_bear" },
        { text: "🦁", callback_data: "captcha_lion" },
        { text: "🐇", callback_data: "captcha_rabbit" },
      ],
    ],
  },
};

const sendMailToUserOptions = (emails) => {
  const inlineKeyboard = emails.map((email) => {
    return [
      {
        text: email,
        callback_data: JSON.stringify({
          action: "email_selected",
          email: email,
        }),
      },
    ];
  });

  return {
    reply_markup: {
      inline_keyboard: [
        ...inlineKeyboard,
        [
          {
            text: "Отмена",
            callback_data: "emailRequestCanceled",
          },
        ],
      ],
    },
  };
};

const getPaypalOptions = () => {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "20€ - 50€", callback_data: "paypal_20-50" },
          { text: "50€ - 200€", callback_data: "paypal_50-200" },
          { text: "200€ - 500€", callback_data: "paypal_200-500" },
        ],
        [
          {
            text: `Назад`,
            callback_data: "cabinet",
          },
        ],
      ],
    },
  };
};

const sendBillOptions = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "Отмена ❌", callback_data: "cancel_order_by_user" }],
    ],
  },
};

const emailOptions = (status) => {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: `Статус: ${status} ${STATUS_EMOJI[status]}`,
            callback_data: "email_status",
          },
        ],
      ],
    },
    parse_mode: "HTML",
  };
};

const checkBillOptions = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "Отмена ❌", callback_data: "cancel_order_by_admin" },
        { text: "Подтвердить ✅", callback_data: "confirm_order_by_admin" },
      ],
    ],
  },
  caption: ORDER_CAPTION_TEXT,
};

export {
  captchaOptions,
  sendBillOptions,
  emailOptions,
  checkBillOptions,
  STATUS_EMOJI,
  getPaypalOptions,
  sendMailToUserOptions,
};

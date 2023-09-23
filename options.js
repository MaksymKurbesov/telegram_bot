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

const cabinetOptions = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "Получить Email 📩", callback_data: "get_email" }],
      [
        {
          text: "Посмотреть список полученных Email 📋",
          callback_data: "get_all_emails",
        },
      ],
    ],
  },
  parse_mode: "HTML",
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
  cabinetOptions,
  sendBillOptions,
  emailOptions,
  checkBillOptions,
  STATUS_EMOJI,
};

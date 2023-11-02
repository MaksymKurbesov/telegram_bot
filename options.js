const STATUS_EMOJI = {
  Выдан: "✅",
  Статус1: "⛱",
  Статус2: "🎲",
  Статус3: "🏆",
  Ожидание: "⌛",
};

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

export { captchaOptions, STATUS_EMOJI };

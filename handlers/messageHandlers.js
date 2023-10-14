import { captchaOptions } from "../options.js";
import { bot } from "../index.js";

const sendCaptchaMessage = (msg) => {
  const chatId = msg.chat.id;

  return bot.sendMessage(
    chatId,
    "Для продолжения определите, какое изображение содержит льва.",
    captchaOptions
  );
};

export { sendCaptchaMessage };

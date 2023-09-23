import { captchaOptions } from "../options.js";

const sendCaptchaMessage = (msg, bot) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username;

  // if (msg.text === "/start") {
  return bot.sendMessage(
    chatId,
    "Для продолжения определите, какое изображение содержит льва.",
    captchaOptions
  );
  // }
};

export { sendCaptchaMessage };

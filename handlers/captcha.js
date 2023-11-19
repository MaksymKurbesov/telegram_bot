import { bot } from "../index.js";
import { ANIMALS } from "../consts.js";

const generateCaptcha = (animalEmojis) => {
  let selectedAnimals = [];
  let captchaObjects = [];
  let indexes = new Set();

  // Выбор 4 уникальных случайных индексов
  while (indexes.size < 4) {
    indexes.add(Math.floor(Math.random() * animalEmojis.length));
  }

  // Получение выбранных животных и создание объектов для капчи
  indexes.forEach((index) => selectedAnimals.push(animalEmojis[index]));
  selectedAnimals.forEach((animal) => {
    captchaObjects.push({ text: animal, callback_data: "false" });
  });

  // Назначение одного животного как правильного ответа
  let correctAnswerIndex = Math.floor(Math.random() * captchaObjects.length);
  captchaObjects[correctAnswerIndex].callback_data = "correct_captcha";

  const captchaMessage = `Выберите  ${captchaObjects[correctAnswerIndex].text}  чтобы пройти капчу!`;

  return { captchaObjects, captchaMessage };
};

const sendCaptchaMessage = (msg) => {
  const chatId = msg.chat.id;

  const { captchaObjects, captchaMessage } = generateCaptcha(ANIMALS);

  return bot.sendMessage(chatId, captchaMessage, {
    reply_markup: {
      inline_keyboard: [captchaObjects],
    },
  });
};

export { sendCaptchaMessage };

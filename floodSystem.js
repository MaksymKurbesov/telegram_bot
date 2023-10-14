import { bot } from "./index.js";

const MAX_MESSAGES = 5;
const MILLISECONDS_FLOOD = 60000;
let floodStatus = false;
let messageCount = 0;
let floodWarningIsSend = false;
let antiFloodTimerIsStarted = false;

setInterval(() => {
  messageCount = 0;
}, 5000);

export const checkAntiFloodStatus = async (chatId) => {
  if (messageCount >= MAX_MESSAGES) {
    floodStatus = true;
  }

  messageCount++;

  if (floodStatus && !floodWarningIsSend) {
    floodWarningIsSend = true;
    await bot.sendMessage(
      chatId,
      "Анти-флуд система. Подождите пожалуйста 1 минуту."
    );
  }

  if (!antiFloodTimerIsStarted) {
    antiFloodTimerIsStarted = true;
    setTimeout(() => {
      floodWarningIsSend = false;
      floodStatus = false;
      antiFloodTimerIsStarted = false;
    }, MILLISECONDS_FLOOD);
  }

  return floodStatus;
};

import { bot, redisClient } from '../index.js';
import { ADMIN_PANEL_CHAT_ID } from '../consts.js';

export const getSupportPage = async (chatId, messageId) => {
  await redisClient.hset(`user:${chatId}`, 'request_support', true);

  await bot.editMessageCaption(`<b>Задайте любой интересующий вас вопрос и наш саппорт свяжется с вами для решение проблемы.</b>`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'Назад', callback_data: 'cabinet' }]],
    },
  });
};

export const sendMessageToAdminChat = async (chatId, messageId, username, messageText) => {
  try {
    await bot.sendMessage(
      ADMIN_PANEL_CHAT_ID,
      `<b>🆘 SUPPORT MESSAGE!</b>\n\nПользователь: <b>@${username}</b>\nВопрос: <b>${messageText}</b>`,
      {
        parse_mode: 'HTML',
      }
    );

    await bot.deleteMessage(chatId, messageId);
    await bot.sendMessage(chatId, '✅ Запрос в саппорт успешно отправлен!');
    await redisClient.hset(`user:${chatId}`, 'request_support', false);
  } catch (e) {
    console.log(e, 'sendMessageToAdminChat');
  }
};

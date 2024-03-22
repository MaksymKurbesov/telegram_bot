import { bot, redisClient } from '../index.js';
import { db } from '../db.js';

export const getNameTag = async (chatId, messageId, nametag) => {
  await bot.editMessageCaption(`<b>NAMETAG: \n\n${nametag}\n\nДанный тег будет показан в канале выплат!</b>`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Изменить',
            callback_data: 'request_change_nametag',
          },
        ],
        [{ text: 'Назад', callback_data: 'cabinet' }],
      ],
    },
  });
};

export const changeNameTag = async (chatId, messageId) => {
  try {
    await redisClient.hset(
      `user:${chatId}`,
      'request_change_nametag',
      true,
      'request_change_nametag_message_id',
      messageId
    );

    await bot.editMessageCaption(`<b>Укажите свой новый NAMETAG</b>`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'cabinet' }]],
      },
    });
  } catch (e) {
    console.log(e, 'data === "change_nametag"');
  }
};

export const updateNameTag = async (chatId, messageId, user, nametag) => {
  try {
    await db.collection('users').doc(user.chatId).update({
      nametag: nametag,
    });

    await redisClient.hset(`user:${chatId}`, `nametag`, nametag);

    const lastMessageId = await redisClient.hget(`user:${chatId}`, 'request_change_nametag_message_id');

    await bot.editMessageCaption(`<b>NAMETAG успешно изменён.</b>`, {
      chat_id: chatId,
      message_id: lastMessageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'cabinet' }]],
      },
    });

    await redisClient.hset(`user:${chatId}`, 'request_change_nametag', false);
  } catch (e) {
    console.log(e, 'nametag error');
  }
};

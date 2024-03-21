import { bot, redisClient } from '../index.js';
import { db } from '../db.js';

export const getPaymentDetails = async (chatId, messageId) => {
  try {
    const userData = await db.collection('users').doc(`${chatId}`).get();
    const { ethereum, trc20, bitcoin } = userData.data();

    await bot.editMessageCaption(
      `<b>💸 Кошельки:</b>\n\n<b>TRC20:</b> ${trc20}\n<b>Bitcoin:</b> ${bitcoin}\n<b>Ethereum:</b> ${ethereum}`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Изменить TRC20',
                callback_data: 'change_payment_details_trc20',
              },
            ],
            [
              {
                text: 'Изменить Bitcoin',
                callback_data: 'change_payment_details_bitcoin',
              },
            ],
            [
              {
                text: 'Изменить Ethereum',
                callback_data: 'change_payment_details_ethereum',
              },
            ],
            [{ text: 'Назад', callback_data: 'cabinet' }],
          ],
        },
      }
    );
  } catch (e) {
    console.log(e, 'data === "payment_details"');
  }
};

export const changePaymentDetails = async (chatId, messageId, wallet) => {
  await redisClient.hset(
    `user:${chatId}`,
    'request_wallet_change',
    true,
    'request_wallet_type',
    wallet,
    'request_wallet_message_id',
    messageId
  );

  await bot.editMessageCaption(`Укажите ${wallet} кошелёк, на который будет производиться вывод средств.`, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Отмена',
            callback_data: 'cabinet',
          },
        ],
      ],
    },
  });
};

export const updatePaymentDetails = async (userWallet, chatId, messageId) => {
  try {
    const walletType = await redisClient.hget(`user:${chatId}`, 'request_wallet_type');
    const lastMessageId = await redisClient.hget(`user:${chatId}`, 'request_wallet_message_id');

    await db
      .collection('users')
      .doc(`${chatId}`)
      .update({
        [walletType]: userWallet,
      });

    await bot.editMessageCaption('Кошелёк успешно изменён!', {
      chat_id: chatId,
      message_id: lastMessageId,
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'cabinet' }]],
      },
    });

    await bot.deleteMessage(chatId, messageId);

    await redisClient.hset(`user:${chatId}`, 'request_wallet_change', 'false');
  } catch (e) {
    console.log(e, 'updatePaymentDetails');
  }
};

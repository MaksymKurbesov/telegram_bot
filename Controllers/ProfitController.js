import { db } from '../db.js';
import { sendCurrentPage } from '../helpers.js';
import { paypalController, redisClient } from '../index.js';
import { editMessageText, editMessageWithInlineKeyboard, sendMessageWithInlineKeyboard } from '../NEWhelpers.js';
import { WALLET_BUTTONS } from '../BUTTONS.js';

const generateCaptionFromUserPaypals = userPaypals => {
  const userPaypalsStr = userPaypals
    .map(userPaypal => {
      return `<b>${userPaypal.type}</b> | ${userPaypal.email} | На сумму: ${userPaypal.limit}`;
    })
    .join('\n');

  return `<b>🅿️ Ваши PayPal:</b>\n\n${userPaypalsStr}`;
};

const generateButtonsFromUserPaypals = userPaypals => {
  const userPaypalsButtons = userPaypals.map(userPaypal => {
    return [
      {
        text: `${userPaypal.email}`,
        callback_data: `request_profit_paypal_${userPaypal.email}`,
      },
    ];
  });

  return [
    ...userPaypalsButtons,
    [
      {
        text: `Назад`,
        callback_data: 'cabinet',
      },
    ],
  ];
};

const updateCaption = (request_paypal_type, request_profit_paypalEmail, text) => {
  return `<b>Оформление профита на PayPal ${request_paypal_type.toUpperCase()}:\n\n${request_profit_paypalEmail}\n\n${text}!</b>`;
};

export class ProfitController {
  constructor() {}

  async getUserProfitsByType(type, chatId, messageId) {
    try {
      const userData = await db.collection('users').doc(`${chatId}`).get();

      await sendCurrentPage(chatId, messageId, 1, userData.data().profits, type === 'ukr' ? 'UKR' : 'F/F');
    } catch (e) {
      console.log(e, 'getUserProfitsByType');
    }
  }

  async requestProfit(chatId, messageId) {
    try {
      const userPaypals = await paypalController.getUserPaypals(chatId);
      const caption = generateCaptionFromUserPaypals(userPaypals);
      const buttons = generateButtonsFromUserPaypals(userPaypals);

      await editMessageWithInlineKeyboard(chatId, messageId, caption, buttons);
    } catch (e) {
      console.log(e, 'requestProfit');
    }
  }

  async startRequestProfit(chatId, paypalEmail) {
    try {
      const buttons = [
        [{ text: 'Продолжить', callback_data: 'request_profit_bill' }],
        [{ text: 'Отмена', callback_data: 'cancel_profit' }],
      ];

      const sentMessage = await sendMessageWithInlineKeyboard(chatId, `<b>Оформление профита на PayPal:\n\n${paypalEmail}</b>`, buttons);

      await redisClient.hset(`user:${chatId}`, {
        request_profit_paypalEmail: paypalEmail,
        form_step: 0,
        profit_message_id: sentMessage.message_id,
      });
    } catch (e) {
      console.log(e, 'startRequestProfit');
    }
  }

  async changeRequestProfitStep(step, chatId, messageId, bill = null, amount = null) {
    try {
      const user = await redisClient.hgetall(`user:${chatId}`);
      const { request_paypal_type, request_profit_paypalEmail, profit_message_id } = user;

      const withoutPhotoButtons = [
        [{ text: 'Без фото', callback_data: 'skip_photo:request_profit_amount' }],
        [{ text: 'Отмена', callback_data: 'cancel_profit' }],
      ];

      const cancelButtons = [[{ text: 'Отмена', callback_data: 'cancel_profit' }]];

      switch (step) {
        case 0:
          const updatedCaption = updateCaption(request_paypal_type, request_profit_paypalEmail, 'Отправьте фото перевода');
          await editMessageText(chatId, messageId, updatedCaption, withoutPhotoButtons);
          break;
        case 1:
          const updatedCaption2 = updateCaption(request_paypal_type, request_profit_paypalEmail, 'Введите ровную сумму профита в €');
          await redisClient.hset(`user:${chatId}`, { request_profit_bill: bill });
          await editMessageText(chatId, profit_message_id, updatedCaption2, cancelButtons);
          break;
        case 2:
          const updatedCaption3 = updateCaption(
            request_paypal_type,
            request_profit_paypalEmail,
            'Введите имя отправителя или вашу товарку'
          );
          await redisClient.hset(`user:${chatId}`, { request_profit_amount: amount });
          await editMessageText(chatId, profit_message_id, updatedCaption3, cancelButtons);
          break;
        case 3:
          const updatedCaption4 = updateCaption(
            request_paypal_type,
            request_profit_paypalEmail,
            'Укажите на какой кошелёк производить выплату'
          );
          await redisClient.hset(`user:${chatId}`, { request_profit_name: name });
          await editMessageText(chatId, profit_message_id, updatedCaption4, WALLET_BUTTONS);
          break;
      }

      await redisClient.hincrby(`user:${chatId}`, 'form_step', 1);
    } catch (e) {
      console.log(e, 'changeRequestProfitStep');
    }
  }

  async sendRequestProfit() {}
}

import { bot, redisClient } from '../index.js';
import { REQUEST_PAYPAL_UKR_ID, REQUEST_PAYPAL_EU_ID } from '../consts.js';
import { db } from '../db.js';
import { getEmailButtons } from '../helpers.js';

export const PAYPAL_MAP = {
  ukr: 'UKR',
  ff: 'F/F',
};

const requestPaypalByUser = async (chatId, messageId) => {
  try {
    await bot.editMessageCaption(
      `<b>🅿️ ПАЛКИ!</b>\n\n<b>PayPal UKR!</b>\nВаш процент: <b>70%</b>\n\n<b>PayPal EU F/F!</b>\nВаш процент: <b>70%</b>`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'UKR', callback_data: 'request_paypal_type_ukr' },
              { text: 'EU F/F', callback_data: 'request_paypal_type_ff' },
            ],
            [
              {
                text: `Отмена`,
                callback_data: 'cabinet',
              },
            ],
          ],
        },
      }
    );
  } catch (e) {
    console.log(e, 'data === "request_paypal"');
  }
};

const sendWaitMessage = async (chatId, messageId) => {
  await bot.editMessageCaption(`<b>Подождите 1 минуту для создания новой заявки!</b>`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: `Назад`,
            callback_data: 'cabinet',
          },
        ],
      ],
    },
  });
};

const requestTypePaypal = async (chatId, messageId, type) => {
  try {
    await redisClient.hset(`user:${chatId}`, 'request_paypal_type', type);

    await bot.editMessageCaption(`<b>Выберите сумму в €.</b>`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: type === 'ukr' ? getPaypalUKROptions().reply_markup : getPaypalFFOptions().reply_markup,
    });
  } catch (e) {
    console.log(e, 'requestTypePaypal');
  }
};

const sendPaypalRequest = async (chatId, messageId, amount) => {
  try {
    const userData = await db.collection('users').doc(`${chatId}`).get();
    const paypalType = await redisClient.hget(`user:${chatId}`, 'request_paypal_type');

    await bot.editMessageCaption(`Заявка на получение PayPal успешно отправлена!`, {
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'cabinet' }]],
      },
      chat_id: chatId,
      message_id: messageId,
    });

    const availablePaypalsRef = await db.collection('emails');
    const availablePaypalsSnap = await availablePaypalsRef
      .where('type', '==', PAYPAL_MAP[paypalType])
      .where('status', '==', 'Свободен')
      .get();

    const availablePaypals = [];

    await availablePaypalsSnap.docs.forEach(paypal => {
      availablePaypals.push(paypal.data());
    });

    const requestChatId = paypalType === 'ukr' ? REQUEST_PAYPAL_UKR_ID : REQUEST_PAYPAL_EU_ID;

    await bot.sendMessage(
      requestChatId,
      `<b>REQUEST ${
        PAYPAL_MAP[paypalType]
      }!</b>\n\n\n💶 Sum: <b>${amount}€</b>\n👤 User: <b>${chatId}</b>\n🪪 Nametag: ${userData.data().nametag}`,
      {
        reply_markup: {
          inline_keyboard: getEmailButtons(availablePaypals, 0, PAYPAL_MAP[paypalType]),
        },
        parse_mode: 'HTML',
      }
    );
  } catch (e) {
    console.log(e, 'data === isPaypalAmount');
  }
};

const getPaypalFFOptions = () => {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '0€ - 100€', callback_data: 'paypal_request_amount_0-100' },
          { text: '100€+', callback_data: 'paypal_request_amount_100+' },
        ],
        [
          {
            text: `Отмена`,
            callback_data: 'cabinet',
          },
        ],
      ],
    },
  };
};

const getPaypalUKROptions = () => {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '40€ - 100€', callback_data: 'paypal_request_amount_40-100' },
          {
            text: '100€ - 250€',
            callback_data: 'paypal_request_amount_100-250',
          },
        ],
        [
          {
            text: '250€ - 400€',
            callback_data: 'paypal_request_amount_250-400',
          },
          {
            text: '400€ - 500€',
            callback_data: 'paypal_request_amount_400-500',
          },
        ],
        [
          { text: '500€+', callback_data: 'paypal_request_amount_500+' },
          {
            text: `Отмена`,
            callback_data: 'cabinet',
          },
        ],
      ],
    },
  };
};

export { requestPaypalByUser, requestTypePaypal, sendPaypalRequest, sendWaitMessage };

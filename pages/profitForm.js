import { bot, redisClient, renewPaypalUserState } from '../index.js';

import { REQUEST_PROFIT_EU_ID, REQUEST_PROFIT_UKR_ID } from '../consts.js';
import { db } from '../db.js';
import { FieldValue } from 'firebase-admin/firestore';
import { PAYPAL_MAP } from './paypalController.js';
import { generateUniqueID } from '../helpers.js';

const NO_PHOTO_PLACEHOLDER = 'https://i.imgur.com/4URRyma.jpg';

const getRequestProfitMessageText = async (chatId, wallet, profitID) => {
  const userData = await db.collection('users').doc(`${chatId}`).get();

  const user = await redisClient.hgetall(`user:${chatId}`);
  const {
    request_paypal_type,
    request_profit_paypalEmail,
    request_profit_amount,
    profit_message_id,
    request_profit_name,
    nickname,
    nametag,
  } = user;

  return `<b>REQUEST PROFIT!</b>\n\n<b>Профит ID:</b> #${profitID}\n<b>Тип:</b> ${request_paypal_type}\n<b>Paypal:</b> ${request_profit_paypalEmail}\n<b>Сумма:</b> ${request_profit_amount}€\n<b>Имя:</b> ${request_profit_name}\n<b>Кошелёк ${wallet}:\n<code>${
    userData.data()[wallet]
  }</code></b>\n\n🟢 Текущий статус профита: Ожидание\n\n---------------------\nprofit_message_id: ${profit_message_id}\nuser_chat_id: ${chatId}\nuser: @${nickname}\nnametag: ${nametag}\npayment_message_id: пусто`;
};

export const continueRequestProfit = async (chatId, paypalEmail) => {
  try {
    const sendMessage = await bot.sendMessage(chatId, `<b>Оформление профита на PayPal:\n\n${paypalEmail}</b>`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Продолжить', callback_data: 'request_profit_bill' }],
          [{ text: 'Отмена', callback_data: 'cancel_profit' }],
        ],
      },
    });

    await redisClient.hset(
      `user:${chatId}`,
      `request_profit_paypalEmail`,
      paypalEmail,
      `form_step`,
      1,
      `profit_message_id`,
      sendMessage.message_id
    );
  } catch (e) {
    console.log(e, 'continueRequestProfit');
  }
};

export const requestProfitBill = async (chatId, messageId) => {
  try {
    const paypalEmail = await redisClient.hget(`user:${chatId}`, `request_profit_paypalEmail`);

    await bot.editMessageText(`<b>Оформление профита на PayPal:\n\n${paypalEmail}\n\nОтправьте фото перевода!</b>`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Без фото', callback_data: 'skip_photo:request_profit_amount' }],
          [{ text: 'Отмена', callback_data: 'cancel_profit' }],
        ],
      },
    });
  } catch (e) {
    console.log(e, 'requestProfitBill');
  }
};

export const requestProfitAmount = async (chatId, messageId, bill) => {
  try {
    const user = await redisClient.hgetall(`user:${chatId}`);
    const { request_paypal_type, request_profit_paypalEmail, profit_message_id } = user;

    await redisClient.hset(`user:${chatId}`, 'request_profit_bill', bill);

    await bot.editMessageText(
      `<b>Оформление профита на PayPal ${request_paypal_type}:\n\n${request_profit_paypalEmail}\n\nВведите ровную сумму профита в €!</b>`,
      {
        chat_id: chatId,
        message_id: profit_message_id,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: 'Отмена', callback_data: 'cancel_profit' }]],
        },
      }
    );

    await redisClient.hincrby(`user:${chatId}`, 'form_step', 1);
  } catch (e) {
    console.log(e, 'requestProfitAmount');
  }
};

export const requestProfitName = async (chatId, msg, amount) => {
  try {
    const user = await redisClient.hgetall(`user:${chatId}`);
    const { request_paypal_type, request_profit_paypalEmail, profit_message_id } = user;

    await redisClient.hset(`user:${chatId}`, 'request_profit_amount', amount);
    await redisClient.hincrby(`user:${chatId}`, 'form_step', 1);

    return await bot.editMessageText(
      `<b>Оформление профита на PayPal ${request_paypal_type}:\n\n${request_profit_paypalEmail}\n\nВведите имя отправителя или вашу товарку!</b>`,
      {
        chat_id: chatId,
        message_id: profit_message_id,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: 'Отмена', callback_data: 'cancel_profit' }]],
        },
      }
    );
  } catch (e) {
    console.log(e, 'profitFormStep2');
  }
};

export const requestProfitWallet = async (chatId, msg, name) => {
  try {
    const user = await redisClient.hgetall(`user:${chatId}`);
    const { request_paypal_type, request_profit_paypalEmail, profit_message_id } = user;

    await redisClient.hset(`user:${chatId}`, 'request_profit_name', name);

    await bot.editMessageText(
      `<b>Оформление профита на PayPal ${request_paypal_type}:\n\n${request_profit_paypalEmail}\n\nУкажите на какой кошелёк производить выплату!</b>`,
      {
        chat_id: chatId,
        message_id: profit_message_id,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'TRC20', callback_data: 'request_profit_wallet_trc20' }],
            [
              {
                text: 'Ethereum',
                callback_data: 'request_profit_wallet_ethereum',
              },
            ],
            [
              {
                text: 'Bitcoin',
                callback_data: 'request_profit_wallet_bitcoin',
              },
            ],
            [{ text: 'Отмена', callback_data: 'cancel_profit' }],
          ],
        },
      }
    );

    await redisClient.hincrby(`user:${chatId}`, 'form_step', 1);
  } catch (e) {
    console.log(e, 'requestProfitAmount 123');
  }
};

const sendMessageToRequestProfitChat = async (chat, photo, chatId, wallet, profitID) => {
  await bot.sendPhoto(chat, photo, {
    caption: await getRequestProfitMessageText(chatId, wallet, profitID),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: profitStatusButtons(),
    },
  });
};

export const submitRequestProfit = async (chatId, msg, wallet) => {
  try {
    const user = await redisClient.hgetall(`user:${chatId}`);
    const {
      request_paypal_type,
      request_profit_paypalEmail,
      request_profit_bill,
      request_profit_amount,
      request_profit_name,
      profit_message_id,
    } = user;

    const userRef = db.collection('users').doc(`${chatId}`);
    const doc = await userRef.get();
    const userData = doc.data();
    const localDate = new Date().toLocaleDateString('ru-RU');
    const localTime = new Date().toLocaleTimeString('ru-RU');
    const photo = request_profit_bill ? request_profit_bill : NO_PHOTO_PLACEHOLDER;
    const profitChatID = PAYPAL_MAP[request_paypal_type] === 'UKR' ? REQUEST_PROFIT_UKR_ID : REQUEST_PROFIT_EU_ID;
    const profitID = generateUniqueID();

    await sendMessageToRequestProfitChat(profitChatID, photo, chatId, wallet, profitID);

    await bot.editMessageText(
      `💸 <b>Профит PayPal ${request_paypal_type}!</b>\n\n🗂<b>Айди профита:</b> #${profitID}\n\n${request_profit_paypalEmail}\n<b>Сумма:</b> ${request_profit_amount}€\n<b>Имя:</b> ${request_profit_name}\n\n<b>Дата:</b> ${localTime} ${localDate}`,
      {
        chat_id: chatId,
        message_id: profit_message_id,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: 'Ожидание 🕐', callback_data: 'profit_status' }]],
        },
      }
    );

    const newPaypals = userData.paypals.filter(paypal => paypal.email !== request_profit_paypalEmail);

    await userRef.update({
      profits: FieldValue.arrayUnion({
        id: profitID,
        email: request_profit_paypalEmail,
        amount: +request_profit_amount,
        name: request_profit_name,
        type: request_paypal_type,
        date: `${localDate} ${localTime}`,
        status: 'Ожидание',
      }),
      paypals: newPaypals,
    });

    // const userPaypalIndex = renewPaypalUserState[chatId]?.findIndex(obj => obj['email'] === request_profit_paypalEmail);

    // renewPaypalUserState[chatId][userPaypalIndex] = {
    //   ...renewPaypalUserState[chatId][userPaypalIndex],
    //   emailProfited: true,
    // };
  } catch (e) {
    console.log(e, 'profitFormStep3');
  }
};

export const profitStatusButtons = () => {
  return [
    [
      { text: '🟢 НА ПАЛКЕ!', callback_data: 'profit-status-money_on_paypal' },
      { text: '⚪ ПУСТО!', callback_data: 'profit-status-empty' },
    ],
    [{ text: ' 🎉 ИНСТАНТ!', callback_data: 'profit-status-instant' }],
    [
      { text: '⛔ СТОП!', callback_data: 'profit-status-stop' },
      { text: '🕐 24ч', callback_data: 'profit-status-24_hours' },
    ],
    [
      { text: '💊 ФРОД!', callback_data: 'profit-status-fraud' },
      { text: '🔑 ВЕРИФ!', callback_data: 'profit-status-verification' },
    ],
    [
      { text: '❌ ЛОК!', callback_data: 'profit-status-lock' },
      { text: '✋ ДИСПУТ!', callback_data: 'profit-status-dispute' },
    ],
    [
      {
        text: '✏ ПЕРЕОФОРМИТЬ!',
        callback_data: 'profit-status-reissue',
      },
    ],
    [{ text: '✅ ВЫПЛАЧЕНО!', callback_data: 'profit-status-paid' }],
  ];
};

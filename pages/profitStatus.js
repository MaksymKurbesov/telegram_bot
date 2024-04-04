import { bot, profitMessages, redisClient } from '../index.js';
import { db } from '../db.js';
import { PAYMENTS_CHAT_ID, REQUEST_PROFIT_EU_ID, REQUEST_PROFIT_UKR_ID, STATUS_EMOJI_MAP } from '../consts.js';
import { extractFieldValue, extractValue, getInfoFromMessage } from '../helpers.js';
import { getUserProfits } from '../handlers/getUserProfits.js';
import FIREBASE_API from '../FIREBASE_API.js';

const updateProfitStatus = (message, newStatus, id) => {
  const regex = /(🟢 Текущий статус профита: )[^\n]+/;
  const updatedStatus = message.replace(regex, `$1${newStatus}`);
  return updatedStatus.replace(/payment_message_id: .*/, 'payment_message_id: ' + id);
};

export const setProfitStatus = async (status, message, profitChatId, adminID) => {
  try {
    const { profit_message_id, user_chat_id, profitId } = getInfoFromMessage(message);

    const type = extractValue(message.caption, 'Тип: ');
    const amount = extractValue(message.caption, 'Сумма: ');
    const nametag = extractValue(message.caption, 'nametag: ');

    if (status === 'НА ПАЛКЕ!') {
      const sendMessage = await bot.sendMessage(
        PAYMENTS_CHAT_ID,
        `${
          type === 'ukr' ? '🇺🇦' : '🇪🇺'
        } Paypal: <b>${type}</b>\n👤 Пользователь: <b>${nametag}</b>\n💶 Сумма: <b>${amount}</b>`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{ text: '🟢 НА ПАЛКЕ!', callback_data: 'status' }]],
          },
        }
      );

      await redisClient.hset(`user:${adminID}`, { request_edit_profit_payment_message_id: sendMessage.message_id });
    }

    const payment_message_id = await redisClient.hget(`user:${adminID}`, `request_edit_profit_payment_message_id`);

    if (status === 'ИНСТАНТ!') {
      profitMessages.push({
        id: profitId,
        amount: amount,
        message_id: message.message_id,
        type: type,
      });
    }

    if (status === 'ПЕРЕОФОРМИТЬ!') {
      return await bot.editMessageReplyMarkup(
        {
          inline_keyboard: [
            [{ text: 'Изменить сумму', callback_data: 'change_profit_amount' }],
            [{ text: 'Изменить имя', callback_data: 'change_profit_name' }],
            [{ text: 'Назад', callback_data: 'back_to_profit_status' }],
          ],
        },
        {
          chat_id: profitChatId,
          message_id: message.message_id,
        }
      );
    }

    const userProfits = await FIREBASE_API.getUserProfits(user_chat_id);

    const profitToUpdate = userProfits.find(profit => profit.id === profitId);
    profitToUpdate.status = status;

    await FIREBASE_API.updateUser(user_chat_id, { profits: userProfits });

    await bot.sendMessage(
      user_chat_id,
      `<b>ℹ️ Статус профита #${profitId}:\n\n${STATUS_EMOJI_MAP[status]} ${status}${
        status === 'НА ПАЛКЕ!'
          ? `\n\nСсылка на профит в чате выплат: https://t.me/c/2017066381/${payment_message_id}`
          : ''
      }</b>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: 'Закрыть ❌', callback_data: 'delete_message' }]],
        },
      }
    );

    // edit profit in profit channel
    // if (payment_message_id) {
    await bot.editMessageCaption(`${updateProfitStatus(message.caption, status, profit_message_id)}`, {
      reply_markup: {
        inline_keyboard: [[{ text: 'Назад', callback_data: 'back_to_profit_status' }]],
      },
      chat_id: type === 'ukr' ? REQUEST_PROFIT_UKR_ID : REQUEST_PROFIT_EU_ID,
      message_id: message.message_id,
      parse_mode: 'HTML',
    });
    // }

    // edit profit in user bot
    await bot.editMessageReplyMarkup(
      {
        inline_keyboard: [
          [
            {
              text: `${STATUS_EMOJI_MAP[status]} ${status}`,
              callback_data: 'profit_status',
            },
          ],
        ],
      },
      {
        chat_id: user_chat_id,
        message_id: profit_message_id,
      }
    );

    // edit profit in payment chat
    if (payment_message_id) {
      await bot.editMessageReplyMarkup(
        {
          inline_keyboard: [
            [
              {
                text: `${STATUS_EMOJI_MAP[status]} ${status}`,
                callback_data: 'profit_status',
              },
            ],
          ],
        },
        {
          chat_id: PAYMENTS_CHAT_ID,
          message_id: payment_message_id,
        }
      );
    }
  } catch (e) {
    console.log(e, 'setProfitStatus');
  }
};

import { db } from '../../db.js';
import {
  extractFieldValue,
  extractValue,
  generateDateString,
  generateUniqueID,
  getInfoFromMessage,
  sendCurrentPage,
  updateProperty,
} from '../../helpers.js';
import { bot, FirebaseApi, paypalController, redisClient } from '../../index.js';
import {
  editMessageReplyMarkup,
  editMessageText,
  editMessageWithInlineKeyboard,
  sendMessage,
  sendPhotoWithInlineKeyboard,
} from '../../NEWhelpers.js';
import {
  BACK_TO_PROFIT_STATUS_BUTTON,
  DEFAULT_PROFIT_STATUS_BUTTONS,
  DELETE_MESSAGE_BUTTON,
  EDIT_PROFIT_BUTTONS,
  ON_PAYPAL_PROFIT_STATUS_BUTTONS,
  PROFIT_STATUS_BUTTONS,
  WALLET_BUTTONS,
} from '../../BUTTONS.js';
import { NO_IMAGE, PAYMENTS_CHAT_ID, STATUS_EMOJI_MAP, STATUS_MAP } from '../../consts.js';
import {
  generateButtonsFromUserPaypals,
  generateCaptionFromUserPaypals,
  generateStatusMessage,
  getUpdateProfitTextByType,
  PROFIT_TYPE_EMOJI,
  REQUEST_PROFIT_CHATS,
  SUCCESS_EDIT_PROFIT_MESSAGE,
  updateCaption,
  updateObjectInList,
  updateProfitStatus,
} from './helpers.js';

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

      const sentMessage = await sendMessage(chatId, `<b>Оформление профита на PayPal:\n\n${paypalEmail}</b>`, buttons);

      await redisClient.hset(`user:${chatId}`, {
        request_profit_paypalEmail: paypalEmail,
        form_step: 0,
        profit_message_id: sentMessage.message_id,
      });
    } catch (e) {
      console.log(e, 'startRequestProfit');
    }
  }

  async changeRequestProfitStep(step, chatId, messageId, bill = null, amount = null, name = null) {
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
            'Введите имя отправителя или вашу товарку',
          );
          await redisClient.hset(`user:${chatId}`, { request_profit_amount: amount });
          await editMessageText(chatId, profit_message_id, updatedCaption3, cancelButtons);
          break;
        case 3:
          const updatedCaption4 = updateCaption(
            request_paypal_type,
            request_profit_paypalEmail,
            'Укажите на какой кошелёк производить выплату',
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

  async sendRequestProfit(chatId, wallet) {
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

      const photo = request_profit_bill ? request_profit_bill : NO_IMAGE;
      const profitChatID = REQUEST_PROFIT_CHATS[request_paypal_type];
      const profitID = generateUniqueID();
      const timestamp = generateDateString();
      const userWallet = await FirebaseApi.getUserWalletNumber(chatId, wallet);

      const profitMessage = this.formatProfitMessage(user, chatId, userWallet, profitID);

      await sendPhotoWithInlineKeyboard(profitChatID, photo, profitMessage, PROFIT_STATUS_BUTTONS);

      await editMessageText(
        chatId,
        profit_message_id,
        `💸 <b>Профит PayPal ${request_paypal_type}!</b>\n\n🗂<b>Айди профита:</b> #${profitID}\n\n${request_profit_paypalEmail}\n<b>Сумма:</b> ${request_profit_amount}€\n<b>Имя:</b> ${request_profit_name}\n\n<b>Дата:</b> ${timestamp}`,
        DEFAULT_PROFIT_STATUS_BUTTONS,
      );

      const profit = {
        id: profitID,
        email: request_profit_paypalEmail,
        amount: +request_profit_amount,
        name: request_profit_name,
        type: request_paypal_type,
        date: timestamp,
        status: 'Ожидание',
      };

      await FirebaseApi.addProfit(chatId, profit);
      await FirebaseApi.removePaypalFromUser(chatId, request_profit_paypalEmail);

      // const userPaypalIndex = renewPaypalUserState[chatId]?.findIndex(obj => obj['email'] === request_profit_paypalEmail);

      // renewPaypalUserState[chatId][userPaypalIndex] = {
      //   ...renewPaypalUserState[chatId][userPaypalIndex],
      //   emailProfited: true,
      // };
    } catch (e) {
      console.log(e, 'profitFormStep3');
    }
  }

  async initUpdateProfitStatus(chatId, messageId, status) {
    const buttons = [
      [
        {
          text: `${STATUS_EMOJI_MAP[STATUS_MAP[status]]} ${STATUS_MAP[status]}`,
          callback_data: `confirm-status-${status}`,
        },
        {
          text: 'Отмена',
          callback_data: 'back_to_profit_status',
        },
      ],
    ];

    await editMessageReplyMarkup(chatId, messageId, buttons);
  }

  async addProfitToDailyProfits(profit) {
    const serializedProfit = JSON.stringify(profit);
    await redisClient.lpush('dailyProfits', serializedProfit);
  }

  async updateProfitStatus(status, message, profitChatId, adminID) {
    try {
      const { profit_message_id, user_chat_id, profitId } = getInfoFromMessage(message);

      const paypalType = extractValue(message.caption, 'Тип: ');
      const amount = extractValue(message.caption, 'Сумма: ');
      const nametag = extractValue(message.caption, 'nametag: ');

      if (status === 'НА ПАЛКЕ!') {
        const caption = `${PROFIT_TYPE_EMOJI[paypalType]} Paypal: <b>${paypalType}</b>\n👤 Пользователь: <b>${nametag}</b>\n💶 Сумма: <b>${amount}</b>`;

        const sentMessageInPaymentChat = await sendMessage(PAYMENTS_CHAT_ID, caption, ON_PAYPAL_PROFIT_STATUS_BUTTONS);

        await redisClient.hset(`user:${adminID}`, { request_edit_profit_payment_message_id: sentMessageInPaymentChat.message_id });
      }

      if (status === 'ИНСТАНТ!') {
        const profit = {
          id: profitId,
          amount: amount,
          message_id: message.message_id,
          type: paypalType,
        };

        await this.addProfitToDailyProfits(profit);
      }

      if (status === 'ПЕРЕОФОРМИТЬ!') {
        return await editMessageReplyMarkup(profitChatId, message.message_id, EDIT_PROFIT_BUTTONS);
      }

      await FirebaseApi.updateProfitStatus(user_chat_id, profitId, status);
      const payment_message_id = await redisClient.hget(`user:${adminID}`, `request_edit_profit_payment_message_id`);

      // send message in user chat
      const statusMessage = generateStatusMessage(profitId, status, payment_message_id);
      await sendMessage(user_chat_id, statusMessage, DELETE_MESSAGE_BUTTON);

      // edit profit in profit channel
      const requestProfitChatId = REQUEST_PROFIT_CHATS[paypalType];
      const updatedProfitMessage = updateProfitStatus(message.caption, status, profit_message_id);
      await editMessageWithInlineKeyboard(requestProfitChatId, message.message_id, updatedProfitMessage, BACK_TO_PROFIT_STATUS_BUTTON);

      // edit profit in user chat
      const statusButton = [[{ text: `${STATUS_EMOJI_MAP[status]} ${status}`, callback_data: 'profit_status' }]];
      await editMessageReplyMarkup(user_chat_id, profit_message_id, statusButton);

      if (payment_message_id) {
        await editMessageReplyMarkup(PAYMENTS_CHAT_ID, payment_message_id, statusButton);
      }
    } catch (e) {
      console.log(e, 'setProfitStatus');
    }
  }

  async startEditProfitByAdmin(chatId, updateType, message, fromID) {
    const profitId = extractFieldValue(message.caption, `Профит ID`);
    const userChatId = extractFieldValue(message.caption, `user_chat_id`);

    const requestProfitData = {
      request_edit_profit: true,
      request_edit_profit_type: updateType,
      request_edit_profit_message_id: message.message_id,
      request_edit_profit_caption: message.caption,
      request_edit_profit_user_chat_id: userChatId,
      request_edit_profit_chat_id: chatId,
      request_edit_profit_from_id: fromID,
    };

    await redisClient.hset(`user:${userChatId}`, requestProfitData);

    await sendMessage(chatId, getUpdateProfitTextByType(updateType, profitId));
  }

  async editProfitByAdmin(chatId, text, user) {
    const { request_edit_profit_type, request_edit_profit_caption, request_edit_profit_message_id, request_edit_profit_chat_id } = user;

    const userChatID = extractFieldValue(request_edit_profit_caption, 'user_chat_id');
    const profitId = extractFieldValue(request_edit_profit_caption, 'Профит ID').split('#')[1];

    const editedProfitUser = await redisClient.hgetall(`user:${userChatID}`);
    const userProfits = await FirebaseApi.getUserProfits(editedProfitUser.request_edit_profit_user_chat_id);

    const updatedProfits = updateProperty(userProfits, profitId, request_edit_profit_type, text);
    let updatedCaption = request_edit_profit_caption.replace(
      new RegExp(`(${request_edit_profit_type === 'amount' ? 'Сумма' : 'Имя'}:\\s*)[^\\n]+`),
      '$1' + text + (request_edit_profit_type === 'amount' ? '€' : ''),
    );

    await updateObjectInList('dailyProfits', 'id', profitId, request_edit_profit_type, text);

    await FirebaseApi.updateUser(editedProfitUser.request_edit_profit_user_chat_id, { profits: updatedProfits });
    await editMessageWithInlineKeyboard(request_edit_profit_chat_id, request_edit_profit_message_id, updatedCaption, EDIT_PROFIT_BUTTONS);
    await redisClient.hset(`user:${userChatID}`, { request_edit_profit: false });
    await bot.sendMessage(chatId, SUCCESS_EDIT_PROFIT_MESSAGE[request_edit_profit_type]);
  }

  formatProfitMessage(user, chatId, wallet, profitID) {
    const {
      request_paypal_type,
      request_profit_paypalEmail,
      request_profit_amount,
      request_profit_name,
      profit_message_id,
      nametag,
      nickname,
    } = user;
    return `<b>REQUEST PROFIT!</b>\n\n<b>Профит ID:</b> #${profitID}\n<b>Тип:</b> ${request_paypal_type}\n<b>Paypal:</b> ${request_profit_paypalEmail}\n<b>Сумма:</b> ${request_profit_amount}€\n<b>Имя:</b> ${request_profit_name}\n<b>Кошелёк: ${wallet}\n<code>${wallet}</code>\n</b>🟢 Текущий статус профита: Ожидание\n\n---------------------\nprofit_message_id: ${profit_message_id}\nuser_chat_id: ${chatId}\nuser: @${nickname}\nnametag: ${nametag}\npayment_message_id: пусто`;
  }
}

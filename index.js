import { getIbansPage } from './handlers/ibans.js';
import Redis from 'ioredis';

process.env['NTBA_FIX_350'] = 1;

import TelegramBot from 'node-telegram-bot-api';
import { checkAntiFloodStatus } from './floodSystem.js';
import {
  extractFieldValue,
  getEmailButtons,
  isArrayOfEmails,
  isChatWithoutCaptcha,
  isEmpty,
  sendCurrentPage,
  updateAmountInPaymentsChat,
  updateProfitAmount,
  updateProfitName,
} from './helpers.js';

import { sendCaptchaMessage } from './handlers/captcha.js';
import { db } from './db.js';
import { getCabinetPage, getFullCabinetPage } from './pages/cabinet.js';
import { getProfilePage } from './pages/profile.js';
import { requestProfit } from './pages/requestProfit.js';
import {
  continueRequestProfit,
  profitStatusButtons,
  requestProfitAmount,
  requestProfitBill,
  requestProfitName,
  requestProfitWallet,
  submitRequestProfit,
} from './pages/profitForm.js';
import { setProfitStatus } from './pages/profitStatus.js';
import { changePaymentDetails, getPaymentDetails, updatePaymentDetails } from './pages/paymentDetails.js';
import {
  requestPaypalByUser,
  requestTypePaypal,
  sendPaypalRequest,
  sendWaitMessage,
} from './pages/paypalController.js';
import {
  addEmailsToDataBase,
  cardIn,
  deletePaypal,
  getAdminPanel,
  getDeletePaypal,
  getLoadingPaypalType,
  loadPaypal,
  sendAdminPanel,
  sendMessageToAllUser,
} from './pages/adminFunctions.js';
import {
  ADMIN_PANEL_CHAT_ID,
  ITEMS_PER_PAGE,
  PAPA_BOT_CHAT_ID,
  PAYMENTS_CHAT_ID,
  STATUS_EMOJI_MAP,
  STATUS_MAP,
} from './consts.js';
import { profileEntry } from './handlers/profileEntry.js';
import { renewPaypalValidity, sendPaypalEmailToUser } from './handlers/sendPaypalEmailToUser.js';
import { getUserProfitsType } from './handlers/getUserProfitsType.js';
import { getUserProfits } from './handlers/getUserProfits.js';
import { changeNameTag, getNameTag, updateNameTag } from './handlers/nametag.js';
import { getSupportPage, sendMessageToAdminChat } from './handlers/support.js';
import { getChats } from './handlers/chats.js';
import FIREBASE_API from './FIREBASE_API.js';

export const bot = new TelegramBot(process.env.TOKEN_BOT, { polling: true });

export const redisClient = new Redis();

export const renewPaypalUserState = {
  chat_id: ['test@gmail.com'],
};

export let profitMessages = [];
const usersPaypalTimeout = {};
export let adminAddEmailType = null;
export let adminDeleteEmail = null;
export let WORK_STATUS = false;

const updatedObjects = {
  amount: {
    message: `🟢 Сумма профита успешно изменена!`,
  },
  name: {
    message: `🟢 Имя профита успешно изменено!`,
  },
};

const start = async () => {
  await bot.setMyCommands([
    {
      command: '/profile',
      description: 'Личный кабинет',
    },
  ]);

  bot.on('message', async msg => {
    try {
      const { text, chat, photo } = msg;
      const chatId = chat.id;
      const isAdminChat = chatId === Number(ADMIN_PANEL_CHAT_ID);

      const user = await redisClient.hgetall(`user:${msg.from.id}`);

      const {
        form_step,
        request_change_nametag,
        request_support,
        request_edit_profit,
        request_edit_profit_type,
        request_edit_profit_caption,
        request_edit_profit_message_id,
        request_edit_profit_chat_id,
      } = user;

      if (isAdminChat && text?.startsWith('/all')) {
        const parts = text.split('/all');
        const message = parts[1].trim();
        return await sendMessageToAllUser(message);
      }

      if (request_edit_profit === 'true') {
        const userChatID = extractFieldValue(request_edit_profit_caption, 'user_chat_id');
        const profitId = extractFieldValue(request_edit_profit_caption, 'Профит ID');
        const correctProfitId = profitId.split('#')[1];

        const editedProfitUser = await redisClient.hgetall(`user:${userChatID}`);
        const { request_edit_profit_user_chat_id } = editedProfitUser;

        let updatedCaption;

        const profitInCache = profitMessages.find(profit => {
          return profit.id === profitId.split('#')[1];
        });

        const userProfits = await FIREBASE_API.getUserProfits(request_edit_profit_user_chat_id);

        if (request_edit_profit_type === 'amount') {
          const updatedProfits = updateProfitAmount(userProfits, correctProfitId, text);

          updatedCaption = request_edit_profit_caption.replace(/(Сумма:\s*)[^\n]+/, '$1' + `${text}€`);

          if (profitInCache) {
            profitInCache.amount = text;
          }

          await FIREBASE_API.updateUser(request_edit_profit_user_chat_id, { profits: updatedProfits });
        }

        if (request_edit_profit_type === 'name') {
          const updatedProfits = updateProfitName(userProfits, correctProfitId, text);

          updatedCaption = request_edit_profit_caption.replace(/(Имя:\s*)[^\n]+/, '$1' + `${text}`);

          if (profitInCache) {
            profitInCache.name = text;
          }

          await FIREBASE_API.updateUser(request_edit_profit_user_chat_id, { profits: updatedProfits });
        }

        // if (request_edit_profit_type === 'amount') {
        //   await bot.editMessageText(
        //     updateAmountInPaymentsChat(editableProfit.paypalType, editableProfit.nametag, text),
        //     {
        //       message_id: editableProfit.payment_message_id,
        //       chat_id: PAYMENTS_CHAT_ID,
        //       reply_markup: {
        //         inline_keyboard: [
        //           [
        //             {
        //               text: `${STATUS_EMOJI_MAP[editableProfit.status]} ${editableProfit.status}`,
        //               callback_data: 'profit_status',
        //             },
        //           ],
        //         ],
        //       },
        //       parse_mode: 'HTML',
        //     }
        //   );
        // }
        //
        await bot.editMessageCaption(updatedCaption, {
          chat_id: request_edit_profit_chat_id,
          message_id: request_edit_profit_message_id,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Изменить сумму',
                  callback_data: 'change_profit_amount',
                },
              ],
              [
                {
                  text: 'Изменить имя',
                  callback_data: 'change_profit_name',
                },
              ],
              [{ text: 'Назад', callback_data: 'back_to_profit_status' }],
            ],
          },
        });

        await redisClient.hset(`user:${userChatID}`, { request_edit_profit: false });

        await bot.sendMessage(chatId, updatedObjects[request_edit_profit_type].message);
      }

      if (isAdminChat && text === '/admin') {
        adminAddEmailType = null;
        adminDeleteEmail = null;
        return sendAdminPanel(chatId, WORK_STATUS);
      }

      if (adminDeleteEmail && isAdminChat) {
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

        if (emailRegex.test(text)) {
          await deletePaypal(text, chatId);
          adminDeleteEmail = null;
        }
      }

      if (adminAddEmailType && isAdminChat) {
        const emails = text.split(';');

        if (emails.length === 0 || !isArrayOfEmails(emails)) {
          return;
        }

        await addEmailsToDataBase(emails, adminAddEmailType, msg);
        adminAddEmailType = null;
      }

      const floodStatus = await checkAntiFloodStatus(chatId);

      if (floodStatus || isChatWithoutCaptcha(chatId)) {
        return;
      }

      if (isEmpty(user)) {
        return await sendCaptchaMessage(msg);
      }

      if (request_support === 'true') {
        await sendMessageToAdminChat(chat.id, msg.message_id, chat.username, text);
      }

      const isRequestChangeWallet = await redisClient.hget(`user:${chatId}`, 'request_wallet_change');

      if (isRequestChangeWallet === 'true') {
        await updatePaymentDetails(text, chatId, msg.message_id);
      }

      if (photo && form_step === '1') {
        const photoId = photo[photo.length - 1].file_id;

        await bot.deleteMessage(chatId, msg.message_id);
        return await requestProfitAmount(chatId, msg.message_id, photoId);
      }

      if (form_step === '2') {
        await bot.deleteMessage(chatId, msg.message_id);
        return await requestProfitName(chatId, msg, text);
      }

      if (form_step === '3') {
        await bot.deleteMessage(chatId, msg.message_id);
        return await requestProfitWallet(chatId, msg, text);
      }

      if (request_change_nametag === 'true') {
        await bot.deleteMessage(chat.id, msg.message_id);
        await updateNameTag(chat.id, msg.message_id, user, text);
      }

      if (text === '/profile') {
        return getFullCabinetPage(chatId, chat.username);
      }
    } catch (e) {
      console.log(e, 'error message');
    }
  });

  bot.on('callback_query', async msg => {
    const { data, message } = msg;
    const { chat, message_id } = message;

    const user = await redisClient.hgetall(`user:${chat.id}`);

    if (!isChatWithoutCaptcha(chat.id) && !user && data !== 'correct_captcha') {
      return await sendCaptchaMessage(message);
    }

    if (data === 'start_work') {
      WORK_STATUS = true;
      await sendMessageToAllUser('<b>Начинаем работу! 💸</b>');
      await getAdminPanel(chat.id, message_id, WORK_STATUS);
    }

    if (data === 'stop_work') {
      WORK_STATUS = false;
      await sendMessageToAllUser('<b>Заканчиваем работу! 👹</b>');
      await getAdminPanel(chat.id, message_id, WORK_STATUS);
    }

    if (data === 'card_in') {
      await cardIn();
    }

    if (data === 'restart_card_in') {
      await bot.editMessageReplyMarkup(
        {
          inline_keyboard: [
            [
              { text: 'Выплачено! 💸', callback_data: 'confirm_card_in' },
              { text: 'Отмена 🔴', callback_data: 'admin_panel' },
            ],
          ],
        },
        {
          chat_id: chat.id,
          message_id: message_id,
        }
      );
    }

    if (data === 'confirm_card_in') {
      profitMessages = [];
      await bot.sendMessage(chat.id, 'Выплаты сделаны! 👌');
      await getAdminPanel(chat.id, message_id, WORK_STATUS);
    }

    if (data === 'cabinet') {
      await getCabinetPage(chat.id, message_id, chat.username);
    }

    if (data === 'profile') {
      await getProfilePage(chat.id, message_id);
    }

    if (data === 'request_iban') {
      await getIbansPage(chat.id, message_id);
    }

    if (data === 'chats') {
      await getChats(chat.id, message_id);
    }

    if (data === 'support') {
      await getSupportPage(chat.id, message_id);
    }

    if (data === 'nametag') {
      await getNameTag(chat.id, message_id, user.nametag);
    }

    if (data === 'get_chat_invite_link') {
      if (user.linkIsGenerated) {
        return await bot.sendMessage(chat.id, `<b>🔴 Вы уже получили ссылку на чат.</b>`, {
          parse_mode: 'HTML',
        });
      }

      const inviteLink = await bot.createChatInviteLink(PAPA_BOT_CHAT_ID, {
        member_limit: 1,
      });

      // await redisClient.set(
      //   `${chatId}`,
      //   JSON.stringify({
      //     ...user,
      //     linkIsGenerated: true,
      //   })
      // );

      await bot.sendMessage(chat.id, `Ссылка на чат: ${inviteLink.invite_link}`);
    }

    if (data === 'request_change_nametag') {
      await changeNameTag(chat.id, message_id);
    }

    if (data === 'request_paypal_by_user') {
      if (!usersPaypalTimeout[chat.id]) {
        await requestPaypalByUser(chat.id, message_id);
      } else {
        await sendWaitMessage(chat.id, message_id);
      }
    }

    if (data.startsWith('request_paypal_type')) {
      const paypalType = data.split('_')[3];
      await requestTypePaypal(chat.id, message_id, paypalType);
    }

    if (data.startsWith('paypal_request_amount')) {
      const paypalAmount = data.split('_')[3];
      await sendPaypalRequest(chat.id, message_id, paypalAmount);

      // usersPaypalTimeout[chat.id] = true;
      //
      // setTimeout(() => {
      //   usersPaypalTimeout[chat.id] = false;
      // }, 60000);
    }

    if (data === 'user_profits') {
      await getUserProfitsType(chat.id, message_id);
    }

    if (data.startsWith('get_user_profits')) {
      try {
        const userProfitsType = data.split('_')[3];
        await getUserProfits(chat.id, message_id, userProfitsType);
      } catch (e) {
        console.log(e, 'data === "get_ukr_user_profits"');
      }
    }

    ///////////////// ADMIN /////////////////

    if (data === 'admin_panel') {
      await getAdminPanel(chat.id, message_id, WORK_STATUS);
    }

    if (data === 'add_paypals') {
      await getLoadingPaypalType(chat.id, message_id);
    }

    if (data.startsWith('add_paypals_')) {
      const paypalType = data.split('_')[2];
      adminAddEmailType = paypalType === 'f/f' ? 'F/F' : 'UKR';
      await loadPaypal(paypalType, chat.id, message_id);
    }

    if (data === 'delete_paypal') {
      adminDeleteEmail = true;
      await getDeletePaypal(chat.id, message_id);
    }

    if (data.startsWith('change_profit')) {
      const changeProfitType = data.split('_')[2];

      const profitId = extractFieldValue(message.caption, `Профит ID`);
      const chatId = extractFieldValue(message.caption, `user_chat_id`);

      const requestProfitData = {
        request_edit_profit: true,
        request_edit_profit_type: changeProfitType,
        request_edit_profit_message_id: message_id,
        request_edit_profit_caption: message.caption,
        request_edit_profit_user_chat_id: chatId,
        request_edit_profit_chat_id: chat.id,
      };

      await redisClient.hset(`user:${chatId}`, requestProfitData);

      if (changeProfitType === 'amount') {
        await bot.sendMessage(chat.id, `<b>ℹ️ Укажите новую сумму для профита ${profitId}!</b>`, {
          parse_mode: 'HTML',
        });
      }

      if (changeProfitType === 'name') {
        await bot.sendMessage(chat.id, `<b>ℹ️ Укажите новое имя для профита ${profitId}!</b>`, {
          parse_mode: 'HTML',
        });
      }
    }

    if (data === 'back_to_profit_status') {
      await bot.editMessageReplyMarkup(
        { inline_keyboard: profitStatusButtons() },
        {
          chat_id: chat.id,
          message_id: message_id,
        }
      );
    }

    ///////////////// ADMIN /////////////////

    if (data.startsWith('profit-status')) {
      const status = data.split('-')[2];

      await bot.editMessageReplyMarkup(
        {
          inline_keyboard: [
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
          ],
        },
        {
          chat_id: chat.id,
          message_id: message_id,
        }
      );
    }

    if (data.startsWith('confirm-status')) {
      const status = STATUS_MAP[data.split('-')[2]];

      await setProfitStatus(status, message, chat.id, msg.from.id);
    }

    if (data === 'delete_message') {
      await bot.deleteMessage(chat.id, message_id);
    }

    if (data.startsWith('prev_') || data.startsWith('next_')) {
      const page = parseInt(data.split('_')[1]);
      const type = data.split('_')[2];

      const userData = await db.collection('users').doc(chat.username).get();
      await sendCurrentPage(chat.id, message_id, page, userData.data().profits, type);
    }

    if (data.startsWith('emails_page') || data.startsWith('emails_page')) {
      try {
        const type = data.split('_')[2];
        const action = data.split('_')[3];
        let currentPage = parseInt(data.split('_')[4]);
        const emailsRef = await db.collection('emails');
        const emailsCountSnap = await emailsRef
          .where('type', '==', type)
          .where('status', '==', 'Свободен')
          .count()
          .get();
        const emailsCount = emailsCountSnap.data().count;
        const totalPage = Math.ceil(emailsCount / ITEMS_PER_PAGE);

        if (action === 'next') {
          currentPage++;
          if (currentPage >= totalPage) {
            return;
          }
        }

        if (action === 'back') {
          if (currentPage === 0) {
            return;
          } else {
            currentPage = currentPage > 0 ? currentPage - 1 : 0;
          }
        }

        const emails = await emailsRef.where('type', '==', type).where('status', '==', 'Свободен').get();

        const emailsData = emails.docs.map(email => {
          return email.data();
        });

        const buttons = getEmailButtons(emailsData, currentPage, type);

        await bot.editMessageReplyMarkup(
          { inline_keyboard: buttons },

          {
            chat_id: chat.id,
            message_id: message_id,
          }
        );
      } catch (e) {
        console.log(e, 'startswith emails page');
      }
    }

    if (data === 'request_profit') {
      await requestProfit(chat.id, message_id);
    }

    if (data.startsWith('request_profit_paypal')) {
      const paypalEmail = data.split('_')[3];

      await continueRequestProfit(chat.id, paypalEmail);
    }

    if (data === 'request_profit_bill') {
      await requestProfitBill(chat.id, message_id);
    }

    if (data === 'skip_photo:request_profit_amount') {
      await requestProfitAmount(chat.id, message_id);
    }

    ////// FINAL PROFIT STEP /////////

    if (data.startsWith('request_profit_wallet')) {
      const wallet = data.split('_')[3];

      return await submitRequestProfit(chat.id, message, wallet);
    }

    if (data === 'cancel_profit') {
      await redisClient.hset(`user:${chat.id}`, `request_edit_profit`, false, 'form_step', 0);
      await bot.deleteMessage(chat.id, message_id);
    }

    if (data === 'renew_paypal') {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
      const email = message.text.match(emailRegex);

      if (email && renewPaypalUserState[chat.id]) {
        const userPaypalIndex = renewPaypalUserState[chat.id].findIndex(obj => obj['email'] === email[0]);
        renewPaypalUserState[chat.id][userPaypalIndex] = {
          ...renewPaypalUserState[chat.id][userPaypalIndex],
          emailKept: true,
        };

        renewPaypalValidity(chat.id, email[0], renewPaypalUserState[chat.id][0].nickname);

        await bot.editMessageReplyMarkup(
          {
            inline_keyboard: [[{ text: 'Продлена 🟢', callback_data: 'null_callback_data' }]],
          },
          {
            chat_id: chat.id,
            message_id: message_id,
          }
        );
      }
    }

    if (data === 'refuse_renew_paypal') {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
      const matches = message.text.match(emailRegex);

      if (matches) {
        await db.collection('emails').doc(matches[0]).update({
          status: 'Свободен',
        });

        const userData = await db.collection('users').doc(msg.from.username).get();

        const updatedUserPaypals = userData.data().paypals.filter(paypal => paypal.email !== matches[0]);

        await db.collection('users').doc(msg.from.username).update({
          paypals: updatedUserPaypals,
        });

        await bot.editMessageReplyMarkup(
          {
            inline_keyboard: [[{ text: 'Отказ 🔴', callback_data: 'null_callback_data' }]],
          },
          {
            chat_id: chat.id,
            message_id: message_id,
          }
        );
      }
    }

    if (data === 'payment_details') {
      await getPaymentDetails(chat.id, message_id);
    }

    if (data.startsWith('change_payment_details')) {
      const wallet = data.split('_')[3];

      await changePaymentDetails(chat.id, message_id, wallet);
    }

    if (data.startsWith('paypal_email_')) {
      const paypalEmail = data.split('_')[2];

      await sendPaypalEmailToUser(paypalEmail, msg, chat.id);
    }

    if (data === 'correct_captcha') {
      await profileEntry(msg.from.username, String(chat.id));
    }

    try {
      await bot.answerCallbackQuery(msg.id);
    } catch (e) {
      console.log(e, 'answer');
    }
  });
};

start();

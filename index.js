import Redis from 'ioredis';
import TelegramBot from 'node-telegram-bot-api';
import { checkAntiFloodStatus } from './floodSystem.js';
import { getEmailButtons, isArrayOfEmails, isChatWithoutCaptcha, isEmpty, sendCurrentPage } from './helpers.js';

import { sendCaptchaMessage } from './handlers/captcha.js';
import { db } from './db.js';
import { getCabinetPage, getFullCabinetPage } from './pages/cabinet.js';
import { getProfilePage } from './pages/profilePage.js';
import { changePaymentDetails, getPaymentDetails, updatePaymentDetails } from './pages/paymentDetails.js';
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
import { ADMIN_PANEL_CHAT_ID, ITEMS_PER_PAGE, PAPA_BOT_CHAT_ID, STATUS_MAP } from './consts.js';
import { profileEntry } from './handlers/profileEntry.js';
import { renewPaypalValidity } from './handlers/sendPaypalEmailToUser.js';
import { changeNameTag, getNameTag, updateNameTag } from './handlers/nametag.js';
import { getSupportPage, sendMessageToAdminChat } from './handlers/support.js';
import { ProfitController } from './Controllers/Profit/ProfitController.js';
import { PaypalController } from './Controllers/Paypal/PaypalController.js';
import { editMessageReplyMarkup, editMessageWithInlineKeyboard } from './NEWhelpers.js';
import { CHATS_BUTTONS, PROFIT_STATUS_BUTTONS, PROFIT_TYPE_BUTTONS } from './BUTTONS.js';
import { FirebaseAPI } from './FIREBASE_API.js';
import { PaginationController } from './Controllers/Pagination/PaginationController.js';

process.env['NTBA_FIX_350'] = 1;

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

export const profitController = new ProfitController();
export const paypalController = new PaypalController();
export const paginationController = new PaginationController();
export const FirebaseApi = new FirebaseAPI();

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

      const { form_step, request_change_nametag, request_support, request_edit_profit, request_edit_profit_from_id } = user;

      const isProfitCanEdit = request_edit_profit_from_id === msg.from.id.toString() && request_edit_profit === 'true';

      if (isProfitCanEdit) {
        await profitController.editProfitByAdmin(chatId, text, user);
      }

      if (isAdminChat && text?.startsWith('/all')) {
        const parts = text.split('/all');
        const message = parts[1].trim();
        return await sendMessageToAllUser(message);
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
        return await profitController.changeRequestProfitStep(1, chatId, msg.message_id, photoId);
      }

      if (form_step === '2') {
        await bot.deleteMessage(chatId, msg.message_id);
        return await profitController.changeRequestProfitStep(2, chatId, msg.message_id, null, text);
      }

      if (form_step === '3') {
        await bot.deleteMessage(chatId, msg.message_id);
        return await profitController.changeRequestProfitStep(3, chatId, msg.message_id, null, null, text);
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
      await editMessageWithInlineKeyboard(chat.id, message.id, '<b>IBAN на данный момент нет в наличие.</b>', [
        [{ text: 'Назад', callback_data: 'cabinet' }],
      ]);
    }

    if (data === 'chats') {
      await editMessageWithInlineKeyboard(chat.id, message.id, `<b>Залетай и узнавай всю инфу первым</b>`, CHATS_BUTTONS);
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
        await paypalController.requestPaypalByUser(chat.id, message_id);
      } else {
        await paypalController.sendWaitMessage(chat.id, message_id);
      }
    }

    if (data.startsWith('request_paypal_type')) {
      const paypalType = data.split('_')[3];
      await paypalController.requestPaypalType(chat.id, message_id, paypalType);
    }

    if (data.startsWith('paypal_request_amount')) {
      const paypalAmount = data.split('_')[3];
      await paypalController.sendRequest(chat.id, message_id, paypalAmount);

      // usersPaypalTimeout[chat.id] = true;
      //
      // setTimeout(() => {
      //   usersPaypalTimeout[chat.id] = false;
      // }, 60000);
    }

    if (data === 'user_profits') {
      await editMessageWithInlineKeyboard(chat.id, message_id, '<b>Выберите тип профитов</b>', PROFIT_TYPE_BUTTONS);
    }

    if (data.startsWith('get_user_profits')) {
      try {
        const userProfitsType = data.split('_')[3];
        // await getUserProfits(chat.id, message_id, userProfitsType);
        await profitController.getUserProfitsByType(userProfitsType, chat.id, message_id);
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
      const updateType = data.split('_')[2];
      await profitController.startEditProfitByAdmin(chat.id, updateType, message, msg.from.id);
    }

    if (data === 'back_to_profit_status') {
      await editMessageReplyMarkup(chat.id, message_id, PROFIT_STATUS_BUTTONS);
    }

    ///////////////// ADMIN /////////////////

    if (data.startsWith('profit-status')) {
      const status = data.split('-')[2];
      await profitController.initUpdateProfitStatus(chat.id, message_id, status);
    }

    if (data.startsWith('confirm-status')) {
      const status = STATUS_MAP[data.split('-')[2]];

      await profitController.updateProfitStatus(status, message, chat.id, msg.from.id);
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

    if (data.startsWith('emails_page')) {
      await paginationController.changePage(chat, message_id, data);
    }

    if (data === 'request_profit') {
      await profitController.requestProfit(chat.id, message_id);
    }

    if (data === 'request_profit_bill') {
      await profitController.changeRequestProfitStep(0, chat.id, message_id);
    }

    if (data.startsWith('request_profit_paypal')) {
      const paypalEmail = data.split('_')[3];

      await profitController.startRequestProfit(chat.id, paypalEmail);
    }

    if (data === 'skip_photo:request_profit_amount') {
      await profitController.changeRequestProfitStep(1, chat.id, message_id);
    }

    ////// FINAL PROFIT STEP /////////

    if (data.startsWith('request_profit_wallet')) {
      const wallet = data.split('_')[3];
      return await profitController.sendRequestProfit(chat.id, wallet);
    }

    if (data === 'cancel_profit') {
      await redisClient.hset(`user:${chat.id}`, { request_edit_profit: false, form_step: 0 });
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

      // await sendPaypalEmailToUser(paypalEmail, msg.message, chat.id);
      await paypalController.sendPaypalToUser(paypalEmail, msg.message, chat.id);
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

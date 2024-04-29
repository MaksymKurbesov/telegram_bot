import Redis from 'ioredis';
import TelegramBot from 'node-telegram-bot-api';
import { checkAntiFloodStatus } from './floodSystem.js';
import { isChatWithoutCaptcha, isEmpty, sendCurrentPage } from './helpers.js';
import { sendCaptchaMessage } from './handlers/captcha.js';
import { db } from './db.js';
import { getCabinetPage, getFullCabinetPage } from './pages/cabinet.js';
import { getProfilePage } from './pages/profilePage.js';
import { changePaymentDetails, getPaymentDetails, updatePaymentDetails } from './pages/paymentDetails.js';

import { ADMIN_PANEL_CHAT_ID, PAPA_BOT_CHAT_ID, STATUS_MAP } from './consts.js';
import { profileEntry } from './handlers/profileEntry.js';
import { renewPaypalValidity } from './handlers/sendPaypalEmailToUser.js';
import { changeNameTag, getNameTag, updateNameTag } from './handlers/nametag.js';
import { getSupportPage, sendMessageToAdminChat } from './handlers/support.js';
import { ProfitController } from './Controllers/Profit/ProfitController.js';
import { PaypalController } from './Controllers/Paypal/PaypalController.js';
import { editMessageReplyMarkup, editMessageText, editMessageWithInlineKeyboard } from './NEWhelpers.js';
import {
  ADD_PAYPAL_TYPE_BUTTONS,
  BACK_TO_ADMIN_PANEL_BUTTON,
  BACK_TO_CABINET_BUTTON,
  CANCEL_ADD_EMAIL_BUTTON,
  CARD_IN_BUTTONS,
  CHATS_BUTTONS,
  PROFIT_STATUS_BUTTONS,
  PROFIT_TYPE_BUTTONS,
} from './BUTTONS.js';
import { FirebaseAPI } from './FIREBASE_API.js';
import { PaginationController } from './Controllers/Pagination/PaginationController.js';
import { AdminController } from './Controllers/AdminController/AdminController.js';
import { PAYPAL_MAP } from './Controllers/Paypal/helpers.js';

process.env['NTBA_FIX_350'] = 1;

export const bot = new TelegramBot(process.env.TOKEN_BOT, { polling: true });

export const redisClient = new Redis();

export const renewPaypalUserState = {
  chat_id: ['test@gmail.com'],
};

export let adminDeleteEmail = null;

export const profitController = new ProfitController();
export const paypalController = new PaypalController();
export const paginationController = new PaginationController();
export const FirebaseApi = new FirebaseAPI();
export const adminController = new AdminController();

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

      if (isEmpty(user)) return await sendCaptchaMessage(msg);

      // if ((await checkAntiFloodStatus(chatId)) || isChatWithoutCaptcha(chatId)) return;

      const {
        form_step,
        request_change_nametag,
        request_support,
        request_edit_profit,
        request_edit_profit_from_id,
        request_wallet_change,
        adminAddEmailType,
        adminId,
      } = user;

      const isProfitCanEdit = request_edit_profit_from_id === msg.from.id.toString() && request_edit_profit === 'true';
      const isEmailCanBeAdded = adminAddEmailType && adminAddEmailType !== '' && isAdminChat && msg.from.id === Number(adminId);

      if (isProfitCanEdit) {
        await profitController.editProfitByAdmin(chatId, text, user);
      }

      if (isAdminChat && text.startsWith('/all')) {
        const messageText = text.split('/all')[1].trim();

        return await adminController.sendMessageToAllUser(messageText);
      }

      if (isAdminChat && text === '/admin') {
        return await adminController.sendAdminPanel(chatId);
      }

      if (isAdminChat && adminDeleteEmail) {
        await adminController.deletePaypalFromDatabase(text, chatId);
      }

      if (isEmailCanBeAdded) {
        await adminController.addPaypalToDatabase(text, adminAddEmailType, chatId, msg.from.id);
      }

      if (request_support === 'true') {
        await sendMessageToAdminChat(chat.id, msg.message_id, chat.username, text);
      }

      if (request_wallet_change === 'true') {
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
      await adminController.startWork(chat.id, message_id);
    }

    if (data === 'stop_work') {
      await adminController.stopWork(chat.id, message_id);
    }

    if (data === 'card_in') {
      await adminController.cardIn();
    }

    if (data === 'restart_card_in') {
      await editMessageReplyMarkup(chat.id, message_id, CARD_IN_BUTTONS);
    }

    if (data === 'confirm_card_in') {
      await adminController.makeCardIn(chat.id, message_id);
    }

    if (data === 'cabinet') {
      await getCabinetPage(chat.id, message_id, chat.username);
    }

    if (data === 'profile') {
      await getProfilePage(chat.id, message_id);
    }

    if (data === 'request_iban') {
      await editMessageWithInlineKeyboard(chat.id, message_id, '<b>IBAN на данный момент нет в наличие.</b>', BACK_TO_CABINET_BUTTON);
    }

    if (data === 'chats') {
      await editMessageWithInlineKeyboard(chat.id, message_id, `<b>Залетай и узнавай всю инфу первым</b>`, CHATS_BUTTONS);
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
      const userPaypalTimeout = await redisClient.get(`user:${chat.id}_request_paypal_timeout`);

      if (!userPaypalTimeout) {
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
      await paypalController.sendRequestByUser(chat.id, message_id, paypalAmount);
    }

    if (data === 'user_profits') {
      await editMessageWithInlineKeyboard(chat.id, message_id, '<b>Выберите тип профитов</b>', PROFIT_TYPE_BUTTONS);
    }

    if (data.startsWith('get_user_profits')) {
      const userProfitsType = data.split('_')[3];
      await profitController.getUserProfitsByType(userProfitsType, chat.id, message_id);
    }

    ///////////////// ADMIN /////////////////

    if (data === 'admin_panel') {
      await adminController.sendAdminPanel(chat.id, message_id);
    }

    if (data === 'add_paypals') {
      await editMessageText(chat.id, message_id, '<b>Какой тип палки загрузить</b>', ADD_PAYPAL_TYPE_BUTTONS);
    }

    if (data.startsWith('add_paypals_')) {
      const paypalType = data.split('_')[2];
      await redisClient.hset(`user:${msg.from.id}`, { adminAddEmailType: paypalType, adminId: msg.from.id });
      const captionText = `<b>Загрузка ${PAYPAL_MAP[paypalType]}\n\nУкажите палки в формате\n\n<code>paypal@gmail.com;paypal2@gmail.com;paypayl3@gmail.com</code></b>`;

      await editMessageText(chat.id, message_id, captionText, CANCEL_ADD_EMAIL_BUTTON);
    }

    if (data === 'cancel_add_email') {
      await redisClient.hset(`user:${msg.from.id}`, { adminAddEmailType: '', adminId: '' });
      await adminController.sendAdminPanel(chat.id, message_id);
    }

    if (data === 'delete_paypal') {
      adminDeleteEmail = true;
      await editMessageText(chat.id, message_id, '<b>Напишите палку которую хотите удалить</b>', BACK_TO_ADMIN_PANEL_BUTTON);
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
          },
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
          },
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

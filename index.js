import { getIbansPage } from "./handlers/ibans.js";

process.env["NTBA_FIX_350"] = 1;

import TelegramBot from "node-telegram-bot-api";
import { checkAntiFloodStatus } from "./floodSystem.js";
import {
  isArrayOfEmails,
  isChatWithoutCaptcha,
  isJSONField,
  sendCurrentPage,
  updateAmountById,
  updateNameById,
} from "./helpers.js";

import { sendCaptchaMessage } from "./handlers/captcha.js";
import { db } from "./db.js";
import { getCabinetPage, getFullCabinetPage } from "./pages/cabinet.js";
import { getProfilePage } from "./pages/profile.js";
import { requestProfit } from "./pages/requestProfit.js";
import {
  continueRequestProfit,
  profitFormStep1,
  profitFormStep2,
  profitFormStep3,
  profitFormStep4,
  profitStatusButtons,
  requestProfitAmount,
  requestProfitBill,
} from "./pages/profitForm.js";
import { setProfitStatus } from "./pages/profitStatus.js";
import {
  changePaymentDetails,
  getPaymentDetails,
  updatePaymentDetails,
} from "./pages/paymentDetails.js";
import {
  requestPaypal,
  requestTypePaypal,
  sendPaypalRequest,
  sendWaitMessage,
} from "./pages/paypalController.js";
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
} from "./pages/adminFunctions.js";
import {
  ADMIN_PANEL_CHAT_ID,
  REQUEST_PROFIT_EU_ID,
  REQUEST_PROFIT_UKR_ID,
  STATUS_MAP,
} from "./consts.js";
import { captchaLion } from "./handlers/captchaLion.js";
import {
  renewPaypalTime,
  sendPaypalEmailToUser,
} from "./handlers/sendPaypalEmailToUser.js";
import { getUserProfitsType } from "./handlers/getUserProfitsType.js";
import { getUserProfits } from "./handlers/getUserProfits.js";
import {
  changeNameTag,
  getNameTag,
  updateNameTag,
} from "./handlers/nametag.js";
import { getSupportPage } from "./handlers/support.js";
import { getChats } from "./handlers/chats.js";

export const bot = new TelegramBot(process.env.TOKEN_BOT, { polling: true });

export const usersCache = {};
export const userProfitFormStates = {};
export const userChangeWalletState = {};
export const userPaypalState = {};
export const userChangeNametagState = {};
export const userPagination = {};
export const renewPaypalUserState = {};
export let profitMessages = [];
const usersPaypalTimeout = {};
export const userSupportState = {};
export let adminAddEmailType = null;
export let adminDeleteEmail = null;
export let WORK_STATUS = false;
let editableProfit = {
  message_id: null,
  chat_id: null,
};

const start = async () => {
  await bot.setMyCommands([
    {
      command: "/profile",
      description: "Личный кабинет",
    },
  ]);

  bot.on("message", async (msg) => {
    try {
      const { text, chat, photo } = msg;
      const chatId = chat.id;
      const isAdminChat = chatId === Number(ADMIN_PANEL_CHAT_ID);

      if (isAdminChat && text?.startsWith("/all")) {
        const parts = text.split("/all");
        const message = parts[1].trim();
        return await sendMessageToAllUser(message);
      }

      if (
        editableProfit.type === "amount" ||
        editableProfit.type === "name" ||
        editableProfit.type === "photo"
      ) {
        const updatedAmountCaption = editableProfit.message_caption.replace(
          /(Сумма:\s*)[^\n]+/,
          "$1" + `${text}€`
        );

        const updatedNameCaption = editableProfit.message_caption.replace(
          /(Имя:\s*)[^\n]+/,
          "$1" + `${text}`
        );

        const updatedObjects = {
          amount: {
            caption: updatedAmountCaption,
            message: `🟢 Сумма профита успешно изменена!`,
          },
          name: {
            caption: updatedNameCaption,
            message: `🟢 Имя профита успешно изменено!`,
          },
          photo: {
            caption: editableProfit.message_caption,
            message: `🟢 Фото профита успешно изменено!`,
          },
        };

        if (editableProfit.type === "photo") {
          console.log("photo");
        } else {
          const userParts = editableProfit.message_caption.split("user: ");
          const userAndRest = userParts[1];
          const user = userAndRest.split("\n")[0];

          const profitIdParts =
            editableProfit.message_caption.split("Профит ID: ");
          const profitIdAndRest = profitIdParts[1];
          const profitId = profitIdAndRest.split("\n")[0];

          const userDoc = await db.collection("users").doc(user);
          const userData = await userDoc.get();

          if (editableProfit.type === "amount") {
            const updatedProfits = updateAmountById(
              userData.data().profits,
              profitId.split("#")[1],
              text
            );

            await userDoc.update({
              profits: updatedProfits,
            });
          }

          if (editableProfit.type === "name") {
            const updatedProfits = updateNameById(
              userData.data().profits,
              profitId.split("#")[1],
              text
            );

            await userDoc.update({
              profits: updatedProfits,
            });
          }

          await bot.editMessageCaption(
            updatedObjects[editableProfit.type].caption,
            {
              chat_id: editableProfit.chat_id,
              message_id: editableProfit.message_id,
              reply_markup: {
                inline_keyboard: [
                  // [
                  //   {
                  //     text: "Изменить фото",
                  //     callback_data: "change_profit_photo",
                  //   },
                  // ],
                  [
                    {
                      text: "Изменить сумму",
                      callback_data: "change_profit_amount",
                    },
                  ],
                  [
                    {
                      text: "Изменить имя",
                      callback_data: "change_profit_name",
                    },
                  ],
                  [{ text: "Назад", callback_data: "back_to_profit_status" }],
                ],
              },
            }
          );
        }

        await bot.sendMessage(
          chatId,
          updatedObjects[editableProfit.type].message
        );

        editableProfit = {};
      }

      if (isAdminChat && text === "/admin") {
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
        const emails = text.split(";");

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

      if (!usersCache[chat.username]) {
        return await sendCaptchaMessage(msg);
        // const userData = await db.collection("users").doc(chat.username).get();
        // if (!userData.exists) {
        //   return await sendCaptchaMessage(msg);
        // }
      }

      if (userSupportState[chat.username]) {
        await bot.sendMessage(
          ADMIN_PANEL_CHAT_ID,
          `<b>🆘 SUPPORT MESSAGE!</b>\n\nПользователь: <b>${chat.username}</b>\nВопрос: <b>${text}</b>`,
          {
            parse_mode: "HTML",
          }
        );

        await bot.deleteMessage(chat.id, msg.message_id);
        await bot.sendMessage(
          chat.id,
          "✅ Запрос в саппорт успешно отправлен!"
        );
        delete userSupportState[chat.username];
      }

      if (userChangeWalletState[chatId]) {
        await updatePaymentDetails(
          text,
          chatId,
          msg.message_id,
          chat.username,
          userChangeWalletState[chatId].wallet_type
        );
      }

      if (photo && userProfitFormStates[chatId]?.step === 1) {
        return await profitFormStep1(photo, chatId, msg);
      }

      if (userProfitFormStates[chatId]?.step === 2) {
        return await profitFormStep2(chatId, msg, text);
      }

      if (userProfitFormStates[chatId]?.step === 3) {
        return await profitFormStep3(chatId, msg, text);
      }

      if (userChangeNametagState[chat.id]) {
        try {
          await updateNameTag(chat.id, msg.message_id, msg.from.username, text);
        } catch (e) {
          console.log(e, "userChangeNametagState[chat.id]");
        }
      }

      if (text === "/profile") {
        return getFullCabinetPage(chatId, chat.username);
      }
    } catch (e) {
      console.log(e, "error message");
    }
  });

  bot.on("callback_query", async (msg) => {
    const { data, message } = msg;
    const { chat, message_id } = message;
    const userNickname = usersCache[chat.username]?.nickname;

    let parsedData;

    if (
      !isChatWithoutCaptcha(chat.id) &&
      !usersCache[chat.username] &&
      data !== "correct_captcha"
    ) {
      return await sendCaptchaMessage(message);
      // const userData = await db.collection("users").doc(chat.username).get();
      // if (!userData.exists) {
      //   return await sendCaptchaMessage(message);
      // }
    }

    if (isJSONField(msg, "data")) {
      parsedData = JSON.parse(data);
    }

    if (data === "start_work") {
      WORK_STATUS = true;
      await sendMessageToAllUser("<b>Начинаем работу! 💸</b>");
      await getAdminPanel(chat.id, message_id, WORK_STATUS);
    }

    if (data === "stop_work") {
      WORK_STATUS = false;
      await sendMessageToAllUser("<b>Заканчиваем работу! 👹</b>");
      await getAdminPanel(chat.id, message_id, WORK_STATUS);
    }

    if (data === "card_in") {
      await cardIn();
    }

    if (data === "restart_card_in") {
      profitMessages = [];
      await bot.sendMessage(chat.id, "Выплаты сделаны! 👌");
    }

    if (data === "cabinet") {
      userSupportState[chat.username] = null;
      await getCabinetPage(chat.id, message_id, chat.username);
    }

    if (data === "profile") {
      await getProfilePage(chat.id, message_id);
    }

    if (data === "request_iban") {
      await getIbansPage(chat.id, message_id);
    }

    if (data === "chats") {
      await getChats(chat.id, message_id);
    }

    if (data === "support") {
      await getSupportPage(chat.id, message_id, msg.from.username);
    }

    if (data === "nametag") {
      try {
        await getNameTag(chat.id, message_id, msg.from.username);
      } catch (e) {
        console.log(e, "data === nametag");
      }
    }

    if (data === "change_nametag") {
      try {
        await changeNameTag(chat.id, message_id);
      } catch (e) {
        console.log(e, 'data === "change_nametag"');
      }
    }

    if (data === "request_paypal") {
      try {
        if (!usersPaypalTimeout[chat.id]) {
          await requestPaypal(chat.id, message_id);
        } else {
          await sendWaitMessage(chat.id, message_id);
        }
      } catch (e) {
        console.log(e, 'data === "request_paypal"');
      }
    }

    if (data === "request_ukr") {
      await requestTypePaypal(chat.id, message_id, "UKR");
    }

    if (data === "request_eu_ff") {
      await requestTypePaypal(chat.id, message_id, "F/F");
    }

    if (data.startsWith("paypal_")) {
      try {
        userPaypalState[chat.id].amount = data;
        await sendPaypalRequest(
          chat.id,
          message_id,
          userPaypalState[chat.id],
          chat.username
        );
        usersPaypalTimeout[chat.id] = true;
        setTimeout(() => {
          usersPaypalTimeout[chat.id] = false;
        }, 60000);
      } catch (e) {
        console.log(e, "data === isPaypalAmount");
      }
    }

    if (data === "user_profits") {
      try {
        await getUserProfitsType(chat.id, message_id);
      } catch (e) {
        console.log(e, '(data === "user_profits")');
      }
    }

    if (data.startsWith("get_user_profits")) {
      try {
        const userProfitsType = data.split("_")[3];
        await getUserProfits(
          chat.id,
          message_id,
          msg.from.username,
          userProfitsType
        );
      } catch (e) {
        console.log(e, 'data === "get_ukr_user_profits"');
      }
    }

    ///////////////// ADMIN /////////////////

    if (data === "admin_panel") {
      await getAdminPanel(chat.id, message_id, WORK_STATUS);
    }

    if (data === "add_paypals") {
      await getLoadingPaypalType(chat.id, message_id);
    }

    if (data.startsWith("add_paypals_")) {
      const paypalType = data.split("_")[2];
      adminAddEmailType = paypalType === "f/f" ? "F/F" : "UKR";
      await loadPaypal(paypalType, chat.id, message_id);
    }

    if (data === "delete_paypal") {
      adminDeleteEmail = true;
      await getDeletePaypal(chat.id, message_id);
    }

    if (data.startsWith("change_profit")) {
      const changeProfitType = data.split("_")[2];
      const regexProfitId = /Профит ID: #(.+)/;
      const profitId = message.caption.match(regexProfitId);

      editableProfit.message_id = message_id;
      editableProfit.chat_id = chat.id;
      editableProfit.message_caption = message.caption;
      editableProfit.type = changeProfitType;

      if (changeProfitType === "amount") {
        await bot.sendMessage(
          chat.id,
          `<b>ℹ️ Укажите новую сумму для профита #${profitId[1]}!</b>`,
          {
            parse_mode: "HTML",
          }
        );
      }

      if (changeProfitType === "name") {
        await bot.sendMessage(
          chat.id,
          `<b>ℹ️ Укажите новое имя для профита #${profitId[1]}!</b>`,
          {
            parse_mode: "HTML",
          }
        );
      }

      if (changeProfitType === "photo") {
        await bot.sendMessage(
          chat.id,
          `<b>ℹ️ Отправьте новое фото для профита #${profitId[1]}!</b>`,
          {
            parse_mode: "HTML",
          }
        );
      }
    }

    if (data === "back_to_profit_status") {
      await bot.editMessageReplyMarkup(
        { inline_keyboard: profitStatusButtons() },
        {
          chat_id: chat.id,
          message_id: message_id,
        }
      );
    }

    ///////////////// ADMIN /////////////////

    if (data.startsWith("profit-status")) {
      const status = data.split("-")[2];
      const parts = message.caption?.split("user: ");
      const username = parts[1].split("\n")[0];

      await setProfitStatus(STATUS_MAP[status], message, username, chat.id);
    }

    if (data === "delete_message") {
      await bot.deleteMessage(chat.id, message_id);
    }

    if (data.startsWith("prev_") || data.startsWith("next_")) {
      const page = parseInt(data.split("_")[1]);
      const type = data.split("_")[2];

      userPagination[chat.id] = page;
      const userData = await db.collection("users").doc(chat.username).get();
      await sendCurrentPage(
        chat.id,
        message_id,
        page,
        userData.data().profits,
        type
      );
    }

    if (data === "request_profit") {
      try {
        const userData = await db.collection("users").doc(chat.username).get();

        await requestProfit(chat.id, message_id, userData.data().paypals);
      } catch (e) {
        console.log(e, '(data === "request_profit")');
      }
    }

    if (parsedData?.action === "rp") {
      try {
        const paypal = await db
          .collection("emails")
          .doc(parsedData.userPaypal)
          .get();

        await continueRequestProfit(
          chat.id,
          paypal,
          chat.username,
          usersCache[chat.username].nametag /// error
        );
      } catch (e) {
        console.log(e, '(parsedData?.action === "rp")');
      }
    }

    if (data === "request_profit_bill") {
      await requestProfitBill(chat.id);
    }

    if (data === "request_profit_amount") {
      await requestProfitAmount(chat.id);
    }

    ////// FINAL PROFIT STEP /////////

    if (data.startsWith("request_profit_wallet")) {
      const wallet = data.split("_")[3];

      return await profitFormStep4(chat.id, message, wallet);
    }

    if (data === "cancel_profit") {
      await bot.deleteMessage(chat.id, message_id);
      delete userProfitFormStates[chat.id];
    }

    if (data === "renew_paypal") {
      if (!renewPaypalUserState[chat.id]) {
        return;
      }

      renewPaypalUserState[chat.id] = false;

      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
      const matches = message.text.match(emailRegex);

      if (matches) {
        await renewPaypalTime(chat.id, matches[0], msg.from.username);

        await bot.editMessageReplyMarkup(
          {
            inline_keyboard: [
              [{ text: "Продлена 🟢", callback_data: "null_callback_data" }],
            ],
          },
          {
            chat_id: chat.id,
            message_id: message_id,
          }
        );
      }
    }

    if (data === "refuse_renew_paypal") {
      renewPaypalUserState[chat.id] = false;

      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
      const matches = message.text.match(emailRegex);

      if (matches) {
        await db.collection("emails").doc(matches[0]).update({
          status: "Свободен",
        });

        const userData = await db
          .collection("users")
          .doc(msg.from.username)
          .get();

        const updatedUserPaypals = userData
          .data()
          .paypals.filter((paypal) => paypal.email !== matches[0]);

        await db.collection("users").doc(msg.from.username).update({
          paypals: updatedUserPaypals,
        });

        await bot.editMessageReplyMarkup(
          {
            inline_keyboard: [
              [{ text: "Отказ 🔴", callback_data: "null_callback_data" }],
            ],
          },
          {
            chat_id: chat.id,
            message_id: message_id,
          }
        );
      }
    }

    if (data === "payment_details") {
      try {
        await getPaymentDetails(chat.id, message_id, userNickname);
      } catch (e) {
        console.log(e, 'data === "payment_details"');
      }
    }

    if (data.startsWith("change_payment_details")) {
      const wallet = data.split("_")[3];

      await changePaymentDetails(chat.id, message_id, wallet);
    }

    if (parsedData?.action === "email_selected") {
      try {
        await sendPaypalEmailToUser(message, parsedData, chat.id);
      } catch (e) {
        console.log(e, 'parsedData?.action === "email_selected"');
      }
    }

    if (data === "correct_captcha") {
      try {
        await captchaLion(msg.from.username, chat.id);
      } catch (e) {
        console.log(e, "captcha lion error");
      }
    }

    try {
      await bot.answerCallbackQuery(msg.id);
    } catch (e) {
      console.log(e, "answer");
    }
  });
};

start();

import TelegramBot from "node-telegram-bot-api";
import { checkAntiFloodStatus } from "./floodSystem.js";
import { addUserFields, isJSONField, sendCurrentPage } from "./helpers.js";

import { sendCaptchaMessage } from "./handlers/messageHandlers.js";
import { db } from "./db.js";
import { getCabinetPage, getFullCabinetPage } from "./pages/cabinet.js";
import { getProfilePage } from "./pages/profile.js";
import { requestProfit } from "./pages/requestProfit.js";
import { FieldValue } from "firebase-admin/firestore";
import {
  continueRequestProfit,
  profitFormStep1,
  profitFormStep2,
  profitFormStep3,
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
} from "./pages/paypalController.js";
import { addEmailsToDataBase, cardIn } from "./pages/adminFunctions.js";
import cron from "node-cron";

process.env["NTBA_FIX_350"] = 1;

export const bot = new TelegramBot(process.env.TOKEN_BOT, { polling: true });

export const usersCache = {};
export const userProfitFormStates = {};
export const userChangeWalletState = {};
export const userPaypalState = {};
export const userChangeNametagState = {};
const userPagination = {};
export let profitMessages = [];

const start = async () => {
  cron.schedule("0 0 * * *", () => {
    profitMessages = []; // Очищаем массив
  });

  await bot.setMyCommands([
    {
      command: "/profile",
      description: "Личный кабинет",
    },
  ]);

  bot.on("message", async (msg) => {
    const { text, chat, photo } = msg;
    const chatId = chat.id;

    if (text.startsWith("/add_emails")) {
      return await addEmailsToDataBase(msg);
    }

    if (text.startsWith("/card_in")) {
      return await cardIn();
    }

    const floodStatus = await checkAntiFloodStatus(chatId);

    if (floodStatus) {
      return;
    }

    if (!usersCache[chat.username]) {
      return await sendCaptchaMessage(msg);
    }

    if (userChangeWalletState[chatId]) {
      await updatePaymentDetails(text, chatId, msg.message_id, chat.username);
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
      await db.collection("users").doc(msg.from.username).update({
        nametag: text,
      });
      await bot.deleteMessage(chat.id, msg.message_id);
      await bot.editMessageCaption(`<b>NAMETAG успешно изменён.</b>`, {
        chat_id: chat.id,
        message_id: userChangeNametagState[chat.id].message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "Назад", callback_data: "cabinet" }]],
        },
      });

      userChangeNametagState[chat.id] = null;
    }

    if (text === "/profile") {
      return getFullCabinetPage(chatId, chat.username);
    }
  });

  bot.on("callback_query", async (msg) => {
    const { data, message } = msg;
    const { chat, message_id } = message;

    const userNickname = usersCache[chat.username]?.nickname;

    let userNicknameFromCaption;
    let parsedData;

    const regexNickname = /user:\s*([\w\s]+)/;
    const match = message.caption?.match(regexNickname);

    if (match && match[1]) userNicknameFromCaption = match[1].trim();

    if (isJSONField(msg, "data")) {
      parsedData = JSON.parse(data);
    }

    if (data === "cabinet") {
      await getCabinetPage(chat.id, message_id, chat.username);
    }

    if (data === "profile") {
      await getProfilePage(chat.id, message_id);
    }

    if (data === "chats") {
      await bot.editMessageCaption(`<b>Залетай и узнавай всю инфу первым</b>`, {
        chat_id: chat.id,
        message_id: message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Выплаты 💸", url: "https://t.me/paymentnotifications" }],
            [{ text: "Назад", callback_data: "cabinet" }],
          ],
        },
      });
    }

    if (data === "nametag") {
      try {
        await bot.editMessageCaption(
          `<b>NAMETAG: \n\n${
            usersCache[chat.username].nametag
          }\n\nДанный тег будет показан в канале выплат!</b>`,
          {
            chat_id: chat.id,
            message_id: message_id,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Изменить",
                    callback_data: "change_nametag",
                  },
                ],
                [{ text: "Назад", callback_data: "cabinet" }],
              ],
            },
          }
        );
      } catch (e) {
        console.log(e, "error");
      }
    }

    if (data === "change_nametag") {
      try {
        userChangeNametagState[chat.id] = {
          message_id: message_id,
        };
        await bot.editMessageCaption(`<b>Укажите свой новый NAMETAG</b>`, {
          chat_id: chat.id,
          message_id: message_id,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "Назад", callback_data: "cabinet" }]],
          },
        });
      } catch (e) {
        console.log(e, "error");
      }
    }

    if (data === "request_paypal") {
      await requestPaypal(chat.id, message_id);
    }

    if (data === "request_ukr") {
      await requestTypePaypal(chat.id, message_id, "UKR");
    }

    if (data === "request_eu_ff") {
      await requestTypePaypal(chat.id, message_id, "F/F");
    }

    const isPaypalAmount =
      data === "paypal_0-100" ||
      data === "paypal_100+" ||
      data === "paypal_40-100" ||
      data === "paypal_100-250" ||
      data === "paypal_250-400" ||
      data === "paypal_400-500" ||
      data === "paypal_500+";

    if (isPaypalAmount) {
      try {
        userPaypalState[chat.id].amount = data;
        await sendPaypalRequest(
          chat.id,
          message_id,
          userPaypalState[chat.id],
          chat.username
        );
      } catch (e) {
        console.log(e);
      }
    }

    if (data === "user_profits") {
      try {
        await bot.editMessageCaption(`<b>Выберите тип профитов</b>`, {
          chat_id: chat.id,
          message_id: message_id,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "UKR",
                  callback_data: "get_ukr_user_profits",
                },
                {
                  text: "EU F/F",
                  callback_data: "get_eu_user_profits",
                },
              ],
              [{ text: "Назад", callback_data: "cabinet" }],
            ],
          },
        });
      } catch (e) {
        console.log(e, "error");
      }
    }

    if (data === "get_ukr_user_profits") {
      try {
        userPagination[chat.id] = 1;

        const userData = await db.collection("users").doc(chat.username).get();

        await sendCurrentPage(
          chat.id,
          message_id,
          1,
          userData.data().profits,
          "UKR"
        );
      } catch (e) {
        console.log(e, "error");
      }
    }

    if (data === "get_eu_user_profits") {
      try {
        userPagination[chat.id] = 1;

        const userData = await db.collection("users").doc(chat.username).get();

        await sendCurrentPage(
          chat.id,
          message_id,
          1,
          userData.data().profits,
          "F/F"
        );
      } catch (e) {
        console.log(e, "error");
      }
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

    ////////////////////// STATUS //////////////////////

    if (data === "money_on_paypal") {
      await setProfitStatus("НА ПАЛКЕ!", message, userNicknameFromCaption);
    }

    if (data === "instant") {
      await setProfitStatus("ИНСТАНТ!", message, userNicknameFromCaption);
    }

    if (data === "stop") {
      await setProfitStatus("СТОП!", message, userNicknameFromCaption);

      const regexPaypal = /Paypal:\s(.*?)(\n|$)/;
      const match = message.caption?.match(regexPaypal);

      console.log(match[1], "match");

      await db.collection("emails").doc(match[1]).update({
        status: "Стоп",
      });
    }

    if (data === "24_hours") {
      await setProfitStatus("24 ЧАСА!", message, userNicknameFromCaption);
    }

    if (data === "fraud") {
      await setProfitStatus("ФРОД!", message, userNicknameFromCaption);
    }

    if (data === "verification") {
      await setProfitStatus("ВЕРИФ!", message, userNicknameFromCaption);
    }

    if (data === "lock") {
      await setProfitStatus("ЛОК!", message, userNicknameFromCaption);
    }

    if (data === "dispute") {
      await setProfitStatus("ДИСПУТ!", message, userNicknameFromCaption);
    }

    if (data === "paid") {
      await setProfitStatus("ВЫПЛАЧЕНО!", message, userNicknameFromCaption);
    }

    if (data === "delete_message") {
      await bot.deleteMessage(chat.id, message_id);
    }

    ////////////////////// STATUS //////////////////////

    if (data === "request_profit") {
      try {
        const userData = await db.collection("users").doc(chat.username).get();

        await requestProfit(chat.id, message_id, userData.data().paypals);
      } catch (e) {
        console.log(e);
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
          usersCache[chat.username].nametag
        );
      } catch (e) {
        console.log(e, "error");
      }
    }

    if (data === "request_profit_bill") {
      await requestProfitBill(chat.id);
    }

    if (data === "request_profit_amount") {
      await requestProfitAmount(chat.id);
    }

    if (data === "cancel_profit") {
      await bot.deleteMessage(chat.id, message_id);
      delete userProfitFormStates[chat.id];
    }

    if (data === "payment_details") {
      await getPaymentDetails(chat.id, message_id, userNickname);
    }

    if (data === "change_payment_details") {
      await changePaymentDetails(chat.id, message_id);
    }

    if (parsedData?.action === "email_selected") {
      try {
        const userNickname = message.text.match(/User:\s*(\w+)/)[1];
        const paypalLimit = message.text.match(/Sum:\s*([\d+\-]+€)/)[1];
        const updatedText = `${msg.message.text}\n\nВыданная палка: ${parsedData.email}`;
        const paypalType = message.text.match(/REQUEST\s+(.+)!/)[1];

        await db
          .collection("users")
          .doc(userNickname)
          .update({
            paypals: FieldValue.arrayUnion({
              email: parsedData.email,
              limit: paypalLimit,
              type: paypalType,
            }),
          });

        if (paypalType !== "UKR") {
          await db.collection("emails").doc(parsedData.email).update({
            status: "Стоп",
          });
        }

        await bot.editMessageText(updatedText, {
          chat_id: chat.id,
          message_id: message.message_id,
        });
        await bot.sendMessage(
          usersCache[userNickname].chatId,
          `🟢 Выдан PayPal: <b>${paypalType} | ${parsedData.email}</b>`,
          {
            parse_mode: "HTML",
          }
        );
      } catch (e) {
        console.log(e, "error");
      }
    }

    if (data === "captcha_lion") {
      try {
        const userData = await db.collection("users").doc(chat.username).get();

        if (!userData.exists) {
          await db
            .collection("users")
            .doc(msg.from.username)
            .set(addUserFields(chat.id, chat.username));
          usersCache[chat.username] = addUserFields(chat.id, chat.username);
        } else {
          usersCache[chat.username] = userData.data();
        }

        await getFullCabinetPage(chat.id, chat.username);
      } catch (e) {
        console.log(e, "error");
      }
    }

    await bot.answerCallbackQuery(msg.id);
  });
};

start();

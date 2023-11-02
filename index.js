import TelegramBot from "node-telegram-bot-api";
import { checkAntiFloodStatus } from "./floodSystem.js";
import { addEmailsToDataBase, addUserFields, isJSONField } from "./helpers.js";

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
import { userProfitsCaption } from "./pages/userProfits.js";
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

process.env["NTBA_FIX_350"] = 1;

const token = "6359435376:AAGad0jCO4joL9LE94215AfKGMlpktwmm4Q";

export const bot = new TelegramBot(process.env.TOKEN_BOT, { polling: true });

export const usersCache = {};
export const userProfitFormStates = {};
export const userChangeWalletState = {};
export const userPaypalState = {};

const start = async () => {
  await bot.setMyCommands([
    {
      command: "/profile",
      description: "Личный кабинет",
    },
  ]);

  bot.onText(/\/addemails (.+)/, (msg, match) => {
    const emails = match[1];

    addEmailsToDataBase(emails, msg);
  });

  bot.on("message", async (msg) => {
    const { text, chat, photo } = msg;
    const chatId = chat.id;

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
        const userData = await db.collection("users").doc(chat.username).get();

        return await bot.answerCallbackQuery(msg.id, {
          text: userProfitsCaption(userData.data().profits),
          show_alert: true, // Это делает уведомление всплывающим, как на вашем скриншоте
          parse_mode: "HTML",
        });
      } catch (e) {
        console.log(e, "error");
      }

      // await getUserProfitsPage(chat.id, message_id, userData.data().profits);
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
      const userData = await db.collection("users").doc(chat.username).get();

      await requestProfit(chat.id, message_id, userData.data().paypals);
    }

    if (parsedData?.action === "rp") {
      try {
        const paypal = await db
          .collection("emails")
          .doc(parsedData.userPaypal)
          .get();

        await continueRequestProfit(chat.id, paypal, chat.username);
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
        }

        usersCache[chat.username] = addUserFields(chat.id, chat.username);

        await getFullCabinetPage(chat.id, chat.username);
      } catch (e) {
        console.log(e, "error");
      }
    }

    await bot.answerCallbackQuery(msg.id);
  });
};

start();

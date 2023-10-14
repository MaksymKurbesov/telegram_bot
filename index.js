import TelegramBot from "node-telegram-bot-api";
import { getPaypalOptions } from "./options.js";
import { checkAntiFloodStatus } from "./floodSystem.js";
import {
  addEmailsToDataBase,
  addUserFields,
  generateUniqueID,
  isJSONField,
  sendPaypalRequest,
} from "./helpers.js";

import { sendCaptchaMessage } from "./handlers/messageHandlers.js";
import { NOTIFICATION_CHAT_ID, PAYPALS_PROFITS_CHAT_ID } from "./consts.js";
import { db } from "./db.js";
import { getCabinetPage, getFullCabinetPage } from "./pages/cabinet.js";
import { getProfilePage } from "./pages/profile.js";
import { getUserPaypalsPage } from "./pages/userPaypals.js";
import { FieldValue } from "firebase-admin/firestore";
import { requestProfit } from "./pages/profitForm.js";

process.env["NTBA_FIX_350"] = 1;

const token = "6359435376:AAGad0jCO4joL9LE94215AfKGMlpktwmm4Q";
const RANDOM_PHOTO =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Imgur_logo.svg/1024px-Imgur_logo.svg.png";

export const bot = new TelegramBot(token, { polling: true });

export const usersCache = {};
export const userProfitFormStates = [];
export const EMAILS = [];

const start = async () => {
  await bot.setMyCommands([
    {
      command: "/start",
      description: "Начать работу с ботом",
    },
    {
      command: "/profile",
      description: "Личный кабинет",
    },
    {
      command: "/info",
      description: "Дополнительная информация",
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

    if (photo && userProfitFormStates[chatId]?.step === 1) {
      userProfitFormStates[chatId].data.billPhoto =
        photo[photo.length - 1].file_id;
      userProfitFormStates[chatId].step++;

      await bot.deleteMessage(chatId, msg.message_id);

      return await bot.editMessageText(
        `Оформление профита на PayPal #UKR:\n\n${
          userProfitFormStates[chat.id].data.paypal
        }\n\nВведите ровную сумму профита в €!`,
        {
          chat_id: chat.id,
          message_id: userProfitFormStates[chat.id].data.message_id,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "Отмена", callback_data: "cabinet" }]],
          },
        }
      );
    }

    if (userProfitFormStates[chatId]?.step === 2) {
      userProfitFormStates[chatId].data.profitAmount = text;
      userProfitFormStates[chatId].step++;

      await bot.deleteMessage(chatId, msg.message_id);

      return await bot.editMessageText(
        `Оформление профита на PayPal #UKR:\n\n${
          userProfitFormStates[chat.id].data.paypal
        }\n\nВведите имя отправителя или вашу товарку!`,
        {
          chat_id: chatId,
          message_id: userProfitFormStates[chatId].data.message_id,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "Отмена", callback_data: "cabinet" }]],
          },
        }
      );
    }

    if (userProfitFormStates[chatId]?.step === 3) {
      const userForm = userProfitFormStates[chatId];
      const photo = userForm.data.billPhoto
        ? userForm.data.billPhoto
        : RANDOM_PHOTO;

      userForm.data.name = text;
      userForm.step++;

      await bot.deleteMessage(chatId, msg.message_id);

      await bot.sendPhoto(PAYPALS_PROFITS_CHAT_ID, photo, {
        caption: `REQUEST PROFIT!\nПрофит ID: #${userForm.data.id}\nСумма: ${userForm.data.profitAmount}€\nИмя: ${userForm.data.name}\n\nprofit_message_id: ${userForm.data.message_id}\nuser_chat_id: ${userForm.data.chat_id}`,
        reply_markup: {
          inline_keyboard: [
            [{ text: "НА ПАЛКЕ!", callback_data: "money_on_paypal" }],
            [{ text: "ИНСТАНТ!", callback_data: "instant" }],
            [
              { text: "12ч", callback_data: "12_hours" },
              { text: "24ч", callback_data: "24_hours" },
            ],
            [
              { text: "ФРОД!", callback_data: "fraud" },
              { text: "ВЕРИФ!", callback_data: "verification" },
            ],
            [
              { text: "ЛОК!", callback_data: "lock" },
              { text: "ДИСПУТ!", callback_data: "dispute" },
            ],
            [
              {
                text: "ПЕРЕОФОРМИТЬ!",
                callback_data: "reissue",
              },
            ],

            [{ text: "ВЫПЛАЧЕНО!", callback_data: "paid" }],
          ],
        },
      });

      delete userForm[chatId];

      const localDate = new Date().toLocaleDateString("ru-RU");
      const localTime = new Date().toLocaleTimeString("ru-RU");

      return await bot.editMessageText(
        `💸 <b>Профит PayPal #UKR</b>\n\n🗂<b>Айди профита:</b> #${userForm.data.id}\n\n${userForm.data.paypal}\n<b>Сумма:</b> ${userForm.data.profitAmount}€\n<b>Имя:</b> ${userForm.data.name}\n\n<b>Дата:</b> ${localTime} ${localDate}\n\nТекущий статус: ФРЕНД, F/F! 💳\n\n🔗 Ссылка на профит из канала (https://t.me/c/1814582633/4959)  `,
        {
          chat_id: chatId,
          message_id: userProfitFormStates[chatId].data.message_id,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Ожидание 🕐", callback_data: "profit_status" }],
            ],
          },
        }
      );
    }

    if (text === "/profile") {
      return getFullCabinetPage(chat.id, chat.username, bot);
    }
  });

  bot.on("callback_query", async (msg) => {
    const { data, message } = msg;
    const { chat, message_id } = message;
    let parsedData;

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
      await bot.editMessageReplyMarkup(getPaypalOptions().reply_markup, {
        chat_id: chat.id,
        message_id,
      });
    }

    if (data === "paypal_20-50") {
      const userNickname = usersCache[chat.username]?.nickname;
      await sendPaypalRequest(chat.id, message_id, data, userNickname);
    }

    if (data === "paypal_50-200") {
      const userNickname = usersCache[chat.username]?.nickname;
      await sendPaypalRequest(chat.id, message_id, data, userNickname);
    }

    if (data === "paypal_200-500") {
      const userNickname = usersCache[chat.username]?.nickname;
      await sendPaypalRequest(chat.id, message_id, data, userNickname);
    }

    if (data === "user_paypals") {
      const userNickname = usersCache[chat.username]?.nickname;
      const userData = await db.collection("users").doc(userNickname).get();

      await getUserPaypalsPage(chat.id, message_id, userData.data().paypals);
    }

    if (data === "money_on_paypal") {
      const regexMsgId = /profit_message_id:\s*(\d+)/;
      const regexChatId = /user_chat_id:\s*(\d+)/;

      const messageId = message.caption.match(regexMsgId);
      const chatId = message.caption.match(regexChatId);

      await bot.editMessageReplyMarkup(
        {
          inline_keyboard: [
            [
              {
                text: `НА ПАЛКЕ!`,
                callback_data: "profit_status",
              },
            ],
          ],
        },
        {
          chat_id: chatId[1],
          message_id: messageId[1],
        }
      );
    }

    if (parsedData?.action === "request_profit") {
      await requestProfit(chat.id, parsedData);
      // const sendMessage = await bot.sendMessage(
      //   chat.id,
      //   `Оформление профита на PayPal #UKR:\n\n${parsedData.userPaypal}`,
      //   {
      //     parse_mode: "HTML",
      //     reply_markup: {
      //       inline_keyboard: [
      //         [{ text: "Продолжить", callback_data: "request_profit_bill" }],
      //         [{ text: "Отмена", callback_data: "cabinet" }],
      //       ],
      //     },
      //   }
      // );
      // userProfitFormStates[chat.id] = {
      //   step: 1,
      //   data: {
      //     id: generateUniqueID(),
      //     paypal: parsedData.userPaypal,
      //     message_id: sendMessage.message_id,
      //     chat_id: chat.id,
      //   },
      // };
    }

    if (data === "request_profit_bill") {
      await bot.editMessageText(
        `Оформление профита на PayPal #UKR:\n\n${
          userProfitFormStates[chat.id].data.paypal
        }\n\nОтправьте фото перевода!`,
        {
          chat_id: chat.id,
          message_id: userProfitFormStates[chat.id].data.message_id,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Без фото", callback_data: "request_profit_amount" }],
              [{ text: "Отмена", callback_data: "cabinet" }],
            ],
          },
        }
      );
    }

    if (data === "request_profit_amount") {
      await bot.editMessageText(
        `Оформление профита на PayPal #UKR:\n\n${
          userProfitFormStates[chat.id].data.paypal
        }\n\nВведите ровную сумму профита в €!`,
        {
          chat_id: chat.id,
          message_id: userProfitFormStates[chat.id].data.message_id,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "Отмена", callback_data: "cabinet" }]],
          },
        }
      );

      userProfitFormStates[chat.id].step++;
    }

    if (parsedData?.action === "email_selected") {
      const userNickname = message.text.match(/User:\s*(\w+)/)[1];
      const paypalLimit = message.text.match(/Sum:\s+(\d+-\d+€)/)[1];
      const updatedText = `${msg.message.text}\n\nВыданная палка: ${parsedData.email}`;

      await db
        .collection("users")
        .doc(userNickname)
        .update({
          paypals: FieldValue.arrayUnion({
            email: parsedData.email,
            limit: paypalLimit,
          }),
        });

      await bot.editMessageText(updatedText, {
        chat_id: chat.id,
        message_id: message.message_id,
      });
      await bot.sendMessage(usersCache[userNickname].chatId, parsedData.email);
    }

    if (data === "captcha_lion") {
      const userData = await db.collection("users").doc(chat.username).get();
      if (!userData.exists) {
        await db
          .collection("users")
          .doc(msg.from.username)
          .set(addUserFields(chat.id, chat.username));
      } else {
        usersCache[chat.username] = userData.data();
      }

      await getFullCabinetPage(chat.id, chat.username);
    }

    await bot.answerCallbackQuery(msg.id);
  });
};

start();

import TelegramBot from "node-telegram-bot-api";
import {
  cabinetOptions,
  captchaOptions,
  checkBillOptions,
  emailOptions,
  sendBillOptions,
  STATUS_EMOJI,
} from "./options.js";
import { checkAntiFloodStatus } from "./floodSystem.js";
import {
  emails,
  extractEmail,
  updateEmailStatus,
  updateUserEmailStatus,
  userEmails,
} from "./helpers.js";

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { sendCaptchaMessage } from "./handlers/messageHandlers.js";
import { cabinetPage } from "./pages/cabinet.js";

initializeApp({
  credentials: applicationDefault(),
});

const db = getFirestore();

const token = "6359435376:AAGad0jCO4joL9LE94215AfKGMlpktwmm4Q";
const NOTIFICATION_CHAT_ID = "-1001893729773";
const bot = new TelegramBot(token, { polling: true });

let userChatID = null;
let emailsReceived = 0;
let isStarted = false;
let captchaIsResolve = false;
let purchaseIsActive = false;
let orderStatusMessageID = null;

const STATUS_BUTTONS = [
  {
    text: `Статус1 ${STATUS_EMOJI["Статус1"]}`,
    callback_data: "change_email_status1",
  },
  {
    text: `Статус2 ${STATUS_EMOJI["Статус2"]}`,
    callback_data: "change_email_status2",
  },
  {
    text: `Статус3 ${STATUS_EMOJI["Статус3"]}`,
    callback_data: "change_email_status3",
  },
];

// let warningIsSend = false;

const start = async () => {
  await bot.setMyCommands([
    {
      command: "/start",
      description: "Начать работу с ботом",
    },
    {
      command: "/cabinet",
      description: "Личный кабинет",
    },
    {
      command: "/info",
      description: "Дополнительная информация",
    },
  ]);

  bot.on("message", async (msg) => {
    const { text, chat, photo } = msg;
    const chatId = chat.id;

    const floodStatus = await checkAntiFloodStatus(bot, chatId);

    if (floodStatus) {
      return;
    }

    if (!captchaIsResolve) {
      sendCaptchaMessage(msg, bot);
    }

    // if (text === "/start" && !captchaIsResolve) {
    //   return bot.sendMessage(
    //     chatId,
    //     "Для продолжения определите, какое изображение содержит льва.",
    //     captchaOptions
    //   );
    // }

    // if (!captchaIsResolve) {
    //   return bot.sendMessage(
    //     chatId,
    //     "Чтобы начать, решите капчу. Выберите льва.",
    //     captchaOptions
    //   );
    // }

    if (photo && purchaseIsActive) {
      bot
        .sendPhoto(
          NOTIFICATION_CHAT_ID,
          msg.photo[msg.photo.length - 1].file_id,
          checkBillOptions
        )
        .then(async () => {
          const orderStatusMessage = await bot.sendMessage(
            chatId,
            "Ожидайте. Email будет выдан после подтверждение оплаты.",
            emailOptions("Ожидание")
          );

          orderStatusMessageID = orderStatusMessage.message_id;
        });
    }

    if (text === "/info") {
      return await bot.sendMessage(
        chatId,
        "Здесь будет указана дополнительная информация"
      );
    }

    if (text === "/cabinet") {
      return await bot.sendMessage(
        chatId,
        `<b>Ваш ник:</b> ${chat.username} \n<b>Получено Email:</b> ${emailsReceived} шт.`,
        cabinetOptions
      );
    }
  });

  bot.on("callback_query", async (msg) => {
    const { data, message } = msg;
    const { chat } = message;

    if (data === "get_email") {
      if (emailsReceived < emails.length) {
        bot
          .sendMessage(
            chat.id,
            "Пожалуйста, пришлите фотографию чека. Это поможет нам подтвердить вашу покупку и обеспечить лучшее обслуживание.",
            sendBillOptions
          )
          .then(() => {
            purchaseIsActive = true;
          });
      } else {
        await bot.sendMessage(chat.id, "Нет доступных Email в данных момент.");
      }
    }

    if (data === "get_all_emails") {
      const normalizedUserEmails = userEmails.map((userEmail) => {
        return `<b>Email:</b> <code>${
          userEmail.email
        }</code> \n<b>Статус:</b> ${userEmail.status} ${
          STATUS_EMOJI[userEmail.status]
        }`;
      });

      if (userEmails.length === 0) {
        await bot.sendMessage(chat.id, `Вы не взяли еще ни одного Email`);
      } else {
        await bot.sendMessage(
          chat.id,
          `${normalizedUserEmails.join(
            `\n--------------------------------------------------------\n`
          )}`,
          {
            parse_mode: "HTML",
          }
        );
      }
    }

    if (data === "confirm_order_by_admin") {
      const purchasedEmail = emails.find(
        (email) => email.status === "Свободен"
      );

      bot
        .sendMessage(
          userChatID,
          `Ваш Email для работы: <code>${purchasedEmail.email}</code>`,
          {
            parse_mode: "HTML",
          }
        )
        .then(() => {
          emailsReceived++;
          updateEmailStatus(purchasedEmail.email, "Выдан");
          userEmails.push(
            emails.find((email) => email.email === purchasedEmail.email)
          );
        });

      await bot.editMessageCaption(
        `Никнейм покупателя: ${msg.from.first_name} ${msg.from.last_name}\nВыданный email: ${purchasedEmail.email}`,
        {
          chat_id: NOTIFICATION_CHAT_ID,
          message_id: message.message_id,
        }
      );

      await bot.editMessageReplyMarkup(
        {
          inline_keyboard: [
            [
              {
                text: `Статус: Выдан ✅`,
                callback_data: "email_status",
              },
            ],
          ],
        },
        {
          chat_id: userChatID,
          message_id: orderStatusMessageID,
        }
      );

      await bot.editMessageReplyMarkup(
        {
          inline_keyboard: [STATUS_BUTTONS],
        },
        {
          chat_id: NOTIFICATION_CHAT_ID,
          message_id: message.message_id,
        }
      );

      purchaseIsActive = false;
    }

    if (data === "change_email_status1") {
      const purchasedEmailByUser = extractEmail(msg.message.caption)[0];
      updateEmailStatus(purchasedEmailByUser, "Статус1");
      updateUserEmailStatus(purchasedEmailByUser, "Статус1");
    }

    if (data === "change_email_status2") {
      const purchasedEmailByUser = extractEmail(msg.message.caption)[0];
      updateEmailStatus(purchasedEmailByUser, "Статус2");
      updateUserEmailStatus(purchasedEmailByUser, "Статус2");
    }

    if (data === "change_email_status3") {
      const purchasedEmailByUser = extractEmail(msg.message.caption)[0];
      updateEmailStatus(purchasedEmailByUser, "Статус3");
      updateUserEmailStatus(purchasedEmailByUser, "Статус3");
    }

    if (data === "cancel_order_by_admin") {
      purchaseIsActive = false;
    }

    if (data === "cancel_order_by_user") {
      bot.deleteMessage(chat.id, message.message_id).then(() => {
        purchaseIsActive = false;
      });
    }

    if (data === "captcha_lion") {
      bot
        .sendMessage(
          chat.id,
          cabinetPage(chat.username, 10, 15000, 30000),
          cabinetOptions
        )
        .then(async () => {
          const userRef = db.collection("users").doc(msg.from.username);
          const userDoc = await userRef.get();

          if (!userDoc.exists) {
            await db.collection("users").doc(msg.from.username).set({
              chatId: chat.id,
              nickname: msg.from.username,
              newfield: "newfield",
            });
          }
          captchaIsResolve = true;
          isStarted = true;
        });
    }

    await bot.answerCallbackQuery(msg.id);
  });
};

start();

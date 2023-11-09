import { bot, profitMessages, userProfitFormStates } from "../index.js";
import { generateUniqueID } from "../helpers.js";
import { PAYMENTS_CHAT_ID, PAYPALS_PROFITS_CHAT_ID } from "../consts.js";
import { db } from "../db.js";
import { FieldValue } from "firebase-admin/firestore";

const NO_PHOTO_PLACEHOLDER = "https://i.imgur.com/4URRyma.jpg";

export const continueRequestProfit = async (
  chatId,
  paypal,
  nickname,
  nametag
) => {
  const userPaypal = paypal.data();

  try {
    const sendMessage = await bot.sendMessage(
      chatId,
      `<b>Оформление профита на PayPal ${userPaypal.type}:\n\n${userPaypal.email}</b>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Продолжить", callback_data: "request_profit_bill" }],
            [{ text: "Отмена", callback_data: "cancel_profit" }],
          ],
        },
      }
    );

    userProfitFormStates[chatId] = {
      step: 1,
      data: {
        id: generateUniqueID(),
        paypal: userPaypal.email,
        type: userPaypal.type,
        message_id: sendMessage.message_id,
        chat_id: chatId,
        nickname: nickname,
        nametag: nametag,
      },
    };
  } catch (e) {
    console.log(e);
  }
};

export const requestProfitBill = async (chatId) => {
  try {
    const formData = userProfitFormStates[chatId].data;

    await bot.editMessageText(
      `<b>Оформление профита на PayPal ${formData.type}:\n\n${formData.paypal}\n\nОтправьте фото перевода!</b>`,
      {
        chat_id: chatId,
        message_id: userProfitFormStates[chatId].data.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Без фото", callback_data: "request_profit_amount" }],
            [{ text: "Отмена", callback_data: "cancel_profit" }],
          ],
        },
      }
    );
  } catch (e) {
    console.log(e);
  }
};

export const requestProfitAmount = async (chatId) => {
  try {
    const formData = userProfitFormStates[chatId].data;

    await bot.editMessageText(
      `<b>Оформление профита на PayPal ${formData.type}:\n\n${formData.paypal}\n\nВведите ровную сумму профита в €!</b>`,
      {
        chat_id: chatId,
        message_id: formData.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Отмена", callback_data: "cancel_profit" }],
          ],
        },
      }
    );

    userProfitFormStates[chatId].step++;
  } catch (e) {
    console.log(e);
  }
};

export const profitFormStep1 = async (photo, chatId, msg) => {
  try {
    const formData = userProfitFormStates[chatId].data;

    formData.billPhoto = photo[photo.length - 1].file_id;
    userProfitFormStates[chatId].step++;

    await bot.deleteMessage(chatId, msg.message_id);

    return await bot.editMessageText(
      `<b>Оформление профита на PayPal ${formData.type}:\n\n${formData.paypal}\n\nВведите ровную сумму профита в €!</b>`,
      {
        chat_id: chatId,
        message_id: formData.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Отмена", callback_data: "cancel_profit" }],
          ],
        },
      }
    );
  } catch (e) {
    console.log(e);
  }
};

export const profitFormStep2 = async (chatId, msg, text) => {
  try {
    const formData = userProfitFormStates[chatId].data;

    formData.profitAmount = text;
    userProfitFormStates[chatId].step++;

    await bot.deleteMessage(chatId, msg.message_id);

    return await bot.editMessageText(
      `<b>Оформление профита на PayPal ${formData.type}:\n\n${formData.paypal}\n\nВведите имя отправителя или вашу товарку!</b>`,
      {
        chat_id: chatId,
        message_id: formData.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Отмена", callback_data: "cancel_profit" }],
          ],
        },
      }
    );
  } catch (e) {
    console.log(e);
  }
};

export const profitStatusButtons = () => {
  return [
    [{ text: "НА ПАЛКЕ!", callback_data: "money_on_paypal" }],
    [{ text: "ИНСТАНТ!", callback_data: "instant" }],
    [
      { text: "СТОП!", callback_data: "stop" },
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
  ];
};

export const profitFormStep3 = async (chatId, msg, text) => {
  try {
    const localDate = new Date().toLocaleDateString("ru-RU");
    const localTime = new Date().toLocaleTimeString("ru-RU");
    const formData = userProfitFormStates[chatId].data;
    const photo = formData.billPhoto
      ? formData.billPhoto
      : NO_PHOTO_PLACEHOLDER;

    formData.name = text;
    userProfitFormStates[chatId].step++;

    await bot.deleteMessage(chatId, msg.message_id);

    const sentMessage = await bot.sendMessage(
      PAYMENTS_CHAT_ID,
      `<b>Paypal:</b> ${formData.type}\n<b>Пользователь:</b> ${formData.nametag}\n<b>Сумма:</b> ${formData.profitAmount}€`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "Ожидание", callback_data: "status" }]],
        },
      }
    );

    formData.payment_message_id = sentMessage.message_id;
    const sendPhoto = await bot.sendPhoto(PAYPALS_PROFITS_CHAT_ID, photo, {
      caption: `<b>REQUEST PROFIT!</b>\n\n<b>Профит ID:</b> #${formData.id}\n<b>Тип: ${formData.type}</b>\n<b>Paypal:</b> ${formData.paypal}\n<b>Сумма:</b> ${formData.profitAmount}€\n<b>Имя:</b> ${formData.name}\n\n🟢 Текущий статус профита: Ожидание\n\n---------------------\nprofit_message_id: ${formData.message_id}\npayment_message_id: ${formData.payment_message_id}\nuser_chat_id: ${formData.chat_id}\nuser: ${formData.nickname}`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: profitStatusButtons(),
      },
    });

    profitMessages.push({
      id: formData.id,
      amount: formData.profitAmount,
      message_id: sendPhoto.message_id,
    });

    return bot
      .editMessageText(
        `💸 <b>Профит PayPal ${formData.type}!</b>\n\n🗂<b>Айди профита:</b> #${formData.id}\n\n${formData.paypal}\n<b>Сумма:</b> ${formData.profitAmount}€\n<b>Имя:</b> ${formData.name}\n\n<b>Дата:</b> ${localTime} ${localDate}\n\n🔗 Ссылка на профит из канала (https://t.me/c/2017066381/${sentMessage.message_id})  `,
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
      )
      .then(async () => {
        await db
          .collection("users")
          .doc(formData.nickname)
          .update({
            profits: FieldValue.arrayUnion({
              id: formData.id,
              email: formData.paypal,
              amount: +formData.profitAmount,
              name: formData.name,
              type: formData.type,
              date: `${localDate} ${localTime}`,
              status: "Ожидание",
            }),
          });
        delete userProfitFormStates[chatId];
      });
  } catch (e) {
    console.log(e);
  }
};

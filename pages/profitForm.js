import { bot, userProfitFormStates } from "../index.js";
import { generateUniqueID } from "../helpers.js";
import { REQUEST_PROFIT_EU_ID, REQUEST_PROFIT_UKR_ID } from "../consts.js";
import { db } from "../db.js";
import { FieldValue } from "firebase-admin/firestore";

const NO_PHOTO_PLACEHOLDER = "https://i.imgur.com/4URRyma.jpg";

const getRequestProfitMessageText = async (formData, wallet) => {
  const userData = await db.collection("users").doc(formData.nickname).get();

  return `<b>REQUEST PROFIT!</b>\n\n<b>Профит ID:</b> #${
    formData.id
  }\n<b>Тип:</b> ${formData.type}\n<b>Paypal:</b> ${
    formData.paypal
  }\n<b>Сумма:</b> ${formData.profitAmount}€\n<b>Имя:</b> ${
    formData.name
  }\n<b>Кошелёк ${wallet}:\n<code>${
    userData.data().wallets[wallet]
  }</code></b>\n\n🟢 Текущий статус профита: Ожидание\n\n---------------------\nprofit_message_id: ${
    formData.message_id
  }\nuser_chat_id: ${formData.chat_id}\nuser: ${formData.nickname}\nnametag: ${
    formData.nametag
  }\npayment_message_id: пусто`;
};

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
    console.log(e, "continueRequestProfit");
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
    console.log(e, "requestProfitBill");
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
    console.log(e, "requestProfitAmount");
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
    console.log(e, "profitFormStep1");
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
    console.log(e, "profitFormStep2");
  }
};

export const profitFormStep3 = async (chatId, msg, text) => {
  try {
    const formData = userProfitFormStates[chatId].data;
    formData.name = text;
    await bot.deleteMessage(chatId, msg.message_id);

    await bot.editMessageText(
      `<b>Оформление профита на PayPal ${formData.type}:\n\n${formData.paypal}\n\nУкажите на какой кошелёк производить выплату!</b>`,
      {
        chat_id: chatId,
        message_id: formData.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "TRC20", callback_data: "request_profit_wallet_trc20" }],
            [
              {
                text: "Ethereum",
                callback_data: "request_profit_wallet_ethereum",
              },
            ],
            [
              {
                text: "Bitcoin",
                callback_data: "request_profit_wallet_bitcoin",
              },
            ],
            [{ text: "Отмена", callback_data: "cancel_profit" }],
          ],
        },
      }
    );

    userProfitFormStates[chatId].step++;
  } catch (e) {
    console.log(e, "requestProfitAmount");
  }
};

export const profitFormStep4 = async (chatId, msg, wallet) => {
  try {
    const formData = userProfitFormStates[chatId].data;
    const userRef = db.collection("users").doc(formData.nickname);
    const doc = await userRef.get();
    const localDate = new Date().toLocaleDateString("ru-RU");
    const localTime = new Date().toLocaleTimeString("ru-RU");
    const photo = formData.billPhoto
      ? formData.billPhoto
      : NO_PHOTO_PLACEHOLDER;

    formData.wallet = wallet;
    userProfitFormStates[chatId].step++;

    if (formData.type === "UKR") {
      await bot.sendPhoto(REQUEST_PROFIT_UKR_ID, photo, {
        caption: await getRequestProfitMessageText(formData, wallet),
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: profitStatusButtons(),
        },
      });
    } else {
      await bot.sendPhoto(REQUEST_PROFIT_EU_ID, photo, {
        caption: await getRequestProfitMessageText(formData, wallet),
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: profitStatusButtons(),
        },
      });
    }

    await bot.editMessageText(
      `💸 <b>Профит PayPal ${formData.type}!</b>\n\n🗂<b>Айди профита:</b> #${formData.id}\n\n${formData.paypal}\n<b>Сумма:</b> ${formData.profitAmount}€\n<b>Имя:</b> ${formData.name}\n\n<b>Дата:</b> ${localTime} ${localDate}`,
      {
        chat_id: chatId,
        message_id: formData.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Ожидание 🕐", callback_data: "profit_status" }],
          ],
        },
      }
    );

    const userData = doc.data();
    const newPaypals = userData.paypals.filter(
      (paypal) => paypal.email !== formData.paypal
    );

    await userRef.update({
      profits: FieldValue.arrayUnion({
        id: formData.id,
        email: formData.paypal,
        amount: +formData.profitAmount,
        name: formData.name,
        type: formData.type,
        date: `${localDate} ${localTime}`,
        status: "Ожидание",
      }),
      paypals: newPaypals,
    });
    delete userProfitFormStates[chatId];
  } catch (e) {
    console.log(e, "profitFormStep3");
  }
};

export const profitStatusButtons = () => {
  return [
    [{ text: "НА ПАЛКЕ!", callback_data: "profit-status-money_on_paypal" }],
    [{ text: "ИНСТАНТ!", callback_data: "profit-status-instant" }],
    [
      { text: "СТОП!", callback_data: "profit-status-stop" },
      { text: "24ч", callback_data: "profit-status-24_hours" },
    ],
    [
      { text: "ФРОД!", callback_data: "profit-status-fraud" },
      { text: "ВЕРИФ!", callback_data: "profit-status-verification" },
    ],
    [
      { text: "ЛОК!", callback_data: "profit-status-lock" },
      { text: "ДИСПУТ!", callback_data: "profit-status-dispute" },
    ],
    [
      {
        text: "ПЕРЕОФОРМИТЬ!",
        callback_data: "profit-status-reissue",
      },
    ],
    [{ text: "ВЫПЛАЧЕНО!", callback_data: "profit-status-paid" }],
  ];
};

import { bot, userPaypalState } from "../index.js";
import { REQUEST_PAYPAL_UKR_ID, REQUEST_PAYPAL_EU_ID } from "../consts.js";
import { db } from "../db.js";

const requestPaypal = async (chatId, messageId) => {
  userPaypalState[chatId] = {
    paypal: "",
    amount: "",
  };

  await bot.editMessageCaption(
    `<b>🅿️ ПАЛКИ!</b>\n\n<b>PayPal UKR!</b>\nВаш процент: <b>60%</b>\n\n<b>PayPal EU F/F!</b>\nВаш процент: <b>60%</b>`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "UKR", callback_data: "request_ukr" },
            { text: "EU F/F", callback_data: "request_eu_ff" },
          ],
          [
            {
              text: `Отмена`,
              callback_data: "cabinet",
            },
          ],
        ],
      },
    }
  );
};

const sendWaitMessage = async (chatId, messageId) => {
  await bot.editMessageCaption(
    `<b>Подождите 1 минуту для создания новой заявки!</b>`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `Назад`,
              callback_data: "cabinet",
            },
          ],
        ],
      },
    }
  );
};

const requestTypePaypal = async (chatId, messageId, type) => {
  userPaypalState[chatId].paypal = type;

  await bot.editMessageCaption(`<b>Выберите сумму в €.</b>`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "HTML",
    reply_markup:
      type === "UKR"
        ? getPaypalUKROptions().reply_markup
        : getPaypalFFOptions().reply_markup,
  });
};

const sendPaypalRequest = async (chatId, messageId, data, nickname) => {
  const userData = await db.collection("users").doc(nickname).get();

  await bot.editMessageCaption(
    `Заявка на получение PayPal успешно отправлена!`,
    {
      reply_markup: {
        inline_keyboard: [[{ text: "Назад", callback_data: "cabinet" }]],
      },
      chat_id: chatId,
      message_id: messageId,
    }
  );

  const paypalAmount = data.amount.split("_")[1];
  const availablePaypalsRef = await db.collection("emails");
  const availablePaypalsSnap = await availablePaypalsRef
    .where("type", "==", data.paypal)
    .where("status", "==", "Свободен")
    .get();

  const availablePaypals = [];

  availablePaypalsSnap.docs.forEach((paypal) => {
    availablePaypals.push(paypal.data());
  });

  if (data.paypal === "UKR") {
    await bot.sendMessage(
      REQUEST_PAYPAL_UKR_ID,
      `<b>REQUEST ${
        data.paypal
      }!</b>\n\n\nSum: <b>${paypalAmount}€</b>\nUser: <b>${nickname}</b>\nNametag: #${
        userData.data().nametag
      }`,
      getKeyboardByPaypals(availablePaypals)
    );
  } else {
    await bot.sendMessage(
      REQUEST_PAYPAL_EU_ID,
      `<b>REQUEST ${
        data.paypal
      }!</b>\n\n\nSum: <b>${paypalAmount}€</b>\nUser: <b>${nickname}</b>\nNametag: #${
        userData.data().nametag
      }`,
      getKeyboardByPaypals(availablePaypals)
    );
  }
};

const getKeyboardByPaypals = (paypals) => {
  const inlineKeyboard = paypals.map((paypal) => {
    return [
      {
        text: paypal.email,
        callback_data: JSON.stringify({
          action: "email_selected",
          email: paypal.email,
        }),
      },
    ];
  });

  return {
    reply_markup: {
      inline_keyboard: [
        ...inlineKeyboard,
        [
          {
            text: "Отмена",
            callback_data: "emailRequestCanceled",
          },
        ],
      ],
    },
    parse_mode: "HTML",
  };
};

const getPaypalFFOptions = () => {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "0€ - 100€", callback_data: "paypal_0-100" },
          { text: "100€+", callback_data: "paypal_100+" },
        ],
        [
          {
            text: `Отмена`,
            callback_data: "cabinet",
          },
        ],
      ],
    },
  };
};

const getPaypalUKROptions = () => {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "40€ - 100€", callback_data: "paypal_40-100" },
          { text: "100€ - 250€", callback_data: "paypal_100-250" },
        ],
        [
          { text: "250€ - 400€", callback_data: "paypal_250-400" },
          { text: "400€ - 500€", callback_data: "paypal_400-500" },
        ],
        [
          { text: "500€+", callback_data: "paypal_500+" },
          {
            text: `Отмена`,
            callback_data: "cabinet",
          },
        ],
      ],
    },
  };
};

export { requestPaypal, requestTypePaypal, sendPaypalRequest, sendWaitMessage };

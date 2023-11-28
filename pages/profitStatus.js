import { bot, profitMessages } from "../index.js";
import { db } from "../db.js";
import {
  PAYMENTS_CHAT_ID,
  REQUEST_PROFIT_EU_ID,
  REQUEST_PROFIT_UKR_ID,
  STATUS_EMOJI_MAP,
} from "../consts.js";
import { extractValue } from "../helpers.js";

function updateProfitStatus(message, newStatus, id) {
  const regex = /(🟢 Текущий статус профита: )[^\n]+/;
  const updatedStatus = message.replace(regex, `$1${newStatus}`);
  return updatedStatus.replace(
    /payment_message_id: .*/,
    "payment_message_id: " + id
  );
}

export let paymentMessageInChat = null;

export const setProfitStatus = async (
  status,
  message,
  nickname,
  profitChatId
) => {
  try {
    console.log("set profit status");

    const regexMsgId = /profit_message_id:\s*(\d+)/;
    const regexPaymentMsgId = /payment_message_id: \s*(\d+)/;
    const regexChatId = /user_chat_id:\s*(\d+)/;
    const regexProfitId = /Профит ID: #(.+)/;
    const type = extractValue(message.caption, "Тип: ");
    const amount = extractValue(message.caption, "Сумма: ");
    const nametag = extractValue(message.caption, "nametag: ");

    const messageId = message.caption.match(regexMsgId);
    const paymentMessageId = message.caption.match(regexPaymentMsgId);
    const chatId = message.caption.match(regexChatId);
    const profitId = message.caption.match(regexProfitId);

    if (status === "НА ПАЛКЕ!") {
      paymentMessageInChat = await bot.sendMessage(
        PAYMENTS_CHAT_ID,
        `${
          type === "UKR" ? "🇺🇦" : "🇪🇺"
        } Paypal: <b>${type}</b>\n👤 Пользователь: <b>${nametag}</b>\n💶 Сумма: <b>${amount}</b>`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🟢 НА ПАЛКЕ!", callback_data: "status" }],
            ],
          },
        }
      );
    }

    if (status === "ИНСТАНТ!") {
      profitMessages.push({
        id: profitId[1],
        amount: amount,
        message_id: message.message_id,
        type: type,
      });
    }

    if (status === "ПЕРЕОФОРМИТЬ!") {
      return await bot.editMessageReplyMarkup(
        {
          inline_keyboard: [
            // [{ text: "Изменить фото", callback_data: "change_profit_photo" }],
            [{ text: "Изменить сумму", callback_data: "change_profit_amount" }],
            [{ text: "Изменить имя", callback_data: "change_profit_name" }],
            [{ text: "Назад", callback_data: "back_to_profit_status" }],
          ],
        },
        {
          chat_id: profitChatId,
          message_id: message.message_id,
        }
      );
    }

    const profitDoc = await db.collection("users").doc(nickname).get();

    const profits = profitDoc.data().profits;

    const profitToUpdate = profits.find((profit) => profit.id === profitId[1]);
    profitToUpdate.status = status;

    await db.collection("users").doc(nickname).update({ profits: profits });

    await bot.sendMessage(
      chatId[1],
      `<b>ℹ️ Статус профита #${profitId[1]}:\n\n${
        STATUS_EMOJI_MAP[status]
      } ${status}${
        status === "НА ПАЛКЕ!"
          ? `\n\nСсылка на профит в чате выплат: https://t.me/c/2017066381/${paymentMessageInChat.message_id}`
          : ""
      }</b>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Закрыть ❌", callback_data: "delete_message" }],
          ],
        },
      }
    );

    // if (paymentMessageInChat) {
    await bot.editMessageCaption(
      `${updateProfitStatus(
        message.caption,
        status,
        paymentMessageInChat?.message_id
      )}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Назад", callback_data: "back_to_profit_status" }],
          ],
        },
        chat_id: type === "UKR" ? REQUEST_PROFIT_UKR_ID : REQUEST_PROFIT_EU_ID,
        message_id: message.message_id,
        parse_mode: "HTML",
      }
    );
    // }

    await bot.editMessageReplyMarkup(
      {
        inline_keyboard: [
          [
            {
              text: `${STATUS_EMOJI_MAP[status]} ${status}`,
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

    if (paymentMessageId) {
      await bot.editMessageReplyMarkup(
        {
          inline_keyboard: [
            [
              {
                text: `${STATUS_EMOJI_MAP[status]} ${status}`,
                callback_data: "profit_status",
              },
            ],
          ],
        },
        {
          chat_id: PAYMENTS_CHAT_ID,
          message_id: paymentMessageId[1],
        }
      );
    }
  } catch (e) {
    console.log(e, "setProfitStatus");
  }
};

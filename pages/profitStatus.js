import { bot } from "../index.js";
import { db } from "../db.js";
import { PAYMENTS_CHAT_ID, PAYPALS_PROFITS_CHAT_ID } from "../consts.js";
import { profitStatusButtons } from "./profitForm.js";

function updateProfitStatus(message, newStatus) {
  const regex = /(🟢 Текущий статус профита: )[^\n]+/;
  return message.replace(regex, `$1${newStatus}`);
}

export const setProfitStatus = async (status, message, nickname) => {
  try {
    const regexMsgId = /profit_message_id:\s*(\d+)/;
    const regexPaymentMsgId = /payment_message_id:\s*(\d+)/;
    const regexChatId = /user_chat_id:\s*(\d+)/;
    const regexProfitId = /Профит ID: #(.+)/;

    const messageId = message.caption.match(regexMsgId);
    const paymentMessageId = message.caption.match(regexPaymentMsgId);
    const chatId = message.caption.match(regexChatId);
    const profitId = message.caption.match(regexProfitId);

    await db
      .collection("users")
      .doc(nickname)
      .get()
      .then((doc) => {
        const profits = doc.data().profits;

        const profitToUpdate = profits.find(
          (profit) => profit.id === profitId[1]
        );
        profitToUpdate.status = status;

        return db
          .collection("users")
          .doc(nickname)
          .update({ profits: profits });
      });

    await bot.sendMessage(
      chatId[1],
      `<b>🟢 Статус профита #${profitId[1]}:\n\n${status}</b>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Закрыть", callback_data: "delete_message" }],
          ],
        },
      }
    );

    await bot.editMessageCaption(updateProfitStatus(message.caption, status), {
      reply_markup: {
        inline_keyboard: profitStatusButtons(),
      },
      chat_id: PAYPALS_PROFITS_CHAT_ID,
      message_id: message.message_id,
      parse_mode: "HTML",
    });

    await bot.editMessageReplyMarkup(
      {
        inline_keyboard: [
          [{ text: `${status}`, callback_data: "profit_status" }],
        ],
      },
      {
        chat_id: PAYMENTS_CHAT_ID,
        message_id: paymentMessageId[1],
      }
    );

    await bot.editMessageReplyMarkup(
      {
        inline_keyboard: [
          [
            {
              text: `${status}`,
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
  } catch (e) {
    console.log(e, "error");
  }
};

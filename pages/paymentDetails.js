import { bot, userChangeWalletState } from "../index.js";
import { db } from "../db.js";

export const getPaymentDetails = async (chatId, messageId, userNickname) => {
  const userData = await db.collection("users").doc(userNickname).get();

  await bot.editMessageCaption(
    `<b>💸 Кошельки:</b>\n\n <b>TRC20:</b> ${userData.data().wallets.trc20}`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Изменить", callback_data: "change_payment_details" }],
          [{ text: "Назад", callback_data: "cabinet" }],
        ],
      },
    }
  );
};

export const changePaymentDetails = async (chatId, messageId) => {
  userChangeWalletState[chatId] = {
    wallet: "",
    message_id: messageId,
    chat_id: chatId,
  };

  await bot.editMessageCaption(
    `Укажите свой кошелёк, на который будет производиться вывод средств.`,
    {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Отмена",
              callback_data: "cabinet",
            },
          ],
        ],
      },
    }
  );
};

export const updatePaymentDetails = async (
  userWallet,
  chatId,
  messageId,
  username
) => {
  try {
    await db
      .collection("users")
      .doc(username)
      .update({
        wallets: {
          trc20: userWallet,
        },
      });

    await bot.editMessageCaption("Кошелёк успешно изменён!", {
      chat_id: chatId,
      message_id: userChangeWalletState[chatId].message_id,
      reply_markup: {
        inline_keyboard: [[{ text: "Назад", callback_data: "cabinet" }]],
      },
    });

    await bot.deleteMessage(chatId, messageId);
    delete userChangeWalletState[chatId];
  } catch (e) {
    console.log(e);
  }
};

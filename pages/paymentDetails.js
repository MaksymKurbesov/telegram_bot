import { bot, userChangeWalletState } from "../index.js";
import { db } from "../db.js";

export const getPaymentDetails = async (chatId, messageId, userNickname) => {
  const userData = await db.collection("users").doc(userNickname).get();
  const userWallets = userData.data().wallets;

  await bot.editMessageCaption(
    `<b>💸 Кошельки:</b>\n\n<b>TRC20:</b> ${userWallets.trc20}\n<b>Bitcoin:</b> ${userWallets.bitcoin}\n<b>Ethereum:</b> ${userWallets.ethereum}`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Изменить TRC20",
              callback_data: "change_payment_details_trc20",
            },
          ],
          [
            {
              text: "Изменить Bitcoin",
              callback_data: "change_payment_details_bitcoin",
            },
          ],
          [
            {
              text: "Изменить Ethereum",
              callback_data: "change_payment_details_ethereum",
            },
          ],
          [{ text: "Назад", callback_data: "cabinet" }],
        ],
      },
    }
  );
};

export const changePaymentDetails = async (chatId, messageId, wallet) => {
  userChangeWalletState[chatId] = {
    wallet: "",
    wallet_type: wallet,
    message_id: messageId,
    chat_id: chatId,
  };

  await bot.editMessageCaption(
    `Укажите ${wallet} кошелёк, на который будет производиться вывод средств.`,
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
  username,
  walletType
) => {
  try {
    await db
      .collection("users")
      .doc(username)
      .update({
        [`wallets.${walletType}`]: userWallet,
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

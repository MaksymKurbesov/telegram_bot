import { bot, profitMessages, usersCache } from "../index.js";
import { db } from "../db.js";
import { ADMIN_PANEL_CHAT_ID } from "../consts.js";
import { countEmailsByType } from "../helpers.js";

const emailsCountByType = {
  "F/F": 0,
  UKR: 0,
};

countEmailsByType().then((counts) => {
  emailsCountByType["F/F"] = counts["F/F"];
  emailsCountByType["UKR"] = counts["UKR"];
});

export const addEmailsToDataBase = async (emails, emailType, queryMsg) => {
  try {
    const chatId = queryMsg.chat.id;

    const emailsPromises = emails.map(async (email) => {
      await db
        .collection("emails")
        .doc(email)
        .set({
          email,
          type: emailType === "UKR" ? "UKR" : "F/F",
          status: "Свободен",
        });
    });

    Promise.all(emailsPromises).then(async () => {
      await bot.sendMessage(chatId, "🟢 Email успешно добавлены!");
      countEmailsByType().then((counts) => {
        emailsCountByType["F/F"] = counts["F/F"];
        emailsCountByType["UKR"] = counts["UKR"];
      });
    });
  } catch (e) {
    console.log(e, "addEmailsToDataBase");
  }
};

export const sendMessageToAllUser = async (message) => {
  const usersChatId = Object.values(usersCache).map((user) => user.chatId);
  usersChatId.forEach((chatId) => {
    bot
      .sendMessage(chatId, message, {
        parse_mode: "HTML",
      })
      .catch((error) => {
        console.error(
          `Не удалось отправить сообщение пользователю с chat_id ${chatId}:`,
          error
        );
      });
  });
  // const usersRef = await db.collection("users");
  // const snapshot = await usersRef.get();
  //
  // snapshot.forEach((doc) => {
  //   const chatId = doc.data().chatId;
  //
  //   bot.sendMessage(chatId, message).catch((error) => {
  //     console.error(
  //       `Не удалось отправить сообщение пользователю с chat_id ${chatId}:`,
  //       error
  //     );
  //   });
  // });
};

export const cardIn = async () => {
  try {
    const profitMessage = profitMessages
      .map((profit, index) => {
        const link = `https://t.me/requestprofits/${profit.message_id}`;

        return `${index + 1}. <a href='${link}'>#${profit.id}</a> | ${
          profit.amount
        }€`;
      })
      .join("\n");

    const totalProfit = profitMessages.reduce((accum, val) => {
      return accum + +val.amount;
    }, 0);

    await bot.sendMessage(
      ADMIN_PANEL_CHAT_ID,
      `💸 Расчёты по профитам:\n\n${profitMessage}\n\nОбщий профит: <b>${totalProfit}€</b>\nОбщая выплата(70%): ≈<b>${
        (totalProfit / 100) * 70
      }€</b>`,
      {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }
    );
  } catch (e) {
    console.log(e, "cardIn");
  }
};

export const getAdminPanel = async (chatId, messageId, status) => {
  await bot.editMessageText(
    `<b>🇪🇺 EU Палок в боте: ${emailsCountByType["F/F"]}\n🇺🇦 UKR Палок в боте: ${emailsCountByType["UKR"]}</b>`,
    {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `${status ? "STOP 🛑" : "WORK ✅"}`,
              callback_data: `${status ? "stop_work" : "start_work"}`,
            },
          ],
          [
            { text: "Добавить 🅿️", callback_data: "add_paypals" },
            { text: "Удалить 🅿️", callback_data: "delete_paypal" },
          ],
          [
            { text: "Касса 🗂️", callback_data: "card_in" },
            { text: "Выплата 💸", callback_data: "restart_card_in" },
          ],
        ],
      },
      parse_mode: "HTML",
    }
  );
};

export const sendAdminPanel = async (chatId, status) => {
  return await bot.sendMessage(
    chatId,
    `<b>🇪🇺 EU Палок в боте: ${emailsCountByType["F/F"]}\n🇺🇦 UKR Палок в боте: ${emailsCountByType["UKR"]}</b>`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `${status ? "STOP 🛑" : "WORK ✅"}`,
              callback_data: `${status ? "stop_work" : "start_work"}`,
            },
          ],
          [
            { text: "Добавить 🅿️", callback_data: "add_paypals" },
            { text: "Удалить 🅿️", callback_data: "delete_paypal" },
          ],
          [
            { text: "Касса 🗂️", callback_data: "card_in" },
            { text: "Выплата 💸", callback_data: "restart_card_in" },
          ],
        ],
      },
      parse_mode: "HTML",
    }
  );
};

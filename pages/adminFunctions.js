import { bot, profitMessages, usersCache } from "../index.js";
import { db } from "../db.js";
import { ADMIN_PANEL_CHAT_ID } from "../consts.js";

export const addEmailsToDataBase = async (queryMsg) => {
  try {
    if (!usersCache[queryMsg.from.username].isAdmin) {
      return;
    }

    const args = queryMsg.text.slice("/add_emails".length).trim().split(" ");
    const emailType = args[0]; // 'f/f'
    const emails = args[1].split(",");

    const chatId = queryMsg.chat.id;

    const emailsPromises = emails.map(async (email) => {
      await db
        .collection("emails")
        .doc(email)
        .set({
          email,
          type: emailType === "ukr" ? "UKR" : "F/F",
          status: "Свободен",
        });
    });

    Promise.all(emailsPromises).then(async () => {
      await bot.sendMessage(chatId, "🟢 Email успешно добавлены!");
    });
  } catch (e) {
    console.log(e, "error");
  }
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
    console.log(e, "error");
  }
};

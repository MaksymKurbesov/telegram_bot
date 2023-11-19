import { db } from "../db.js";
import { FieldValue } from "firebase-admin/firestore";
import { bot, renewPaypalUserState } from "../index.js";

export const sendPaypalEmailToUser = async (message, parsedData, chatId) => {
  const userNickname = message.text.match(/User:\s*(\w+)/)[1];
  const paypalLimit = message.text.match(/Sum:\s*([\d+\-]+€)/)[1];
  const updatedText = `${message.text}\n\nВыданная палка: ${parsedData.email}`;
  const paypalType = message.text.match(/REQUEST\s+(.+)!/)[1];
  const userDoc = await db.collection("users").doc(userNickname);
  const userData = await userDoc.get();

  await userDoc.update({
    paypals: FieldValue.arrayUnion({
      email: parsedData.email,
      limit: paypalLimit,
      type: paypalType,
    }),
  });

  await bot.editMessageText(updatedText, {
    chat_id: chatId,
    message_id: message.message_id,
  });

  await bot.sendMessage(
    userData.data().chatId,
    `🟢 Выдан PayPal: <b>${paypalType} | ${parsedData.email}</b>`,
    {
      parse_mode: "HTML",
    }
  );

  if (paypalType !== "UKR") {
    await db.collection("emails").doc(parsedData.email).update({
      status: "Стоп",
    });

    await renewPaypalTime(
      userData.data().chatId,
      parsedData.email,
      userNickname
    );
  }
};

export const renewPaypalTime = async (chatId, email, nickname) => {
  setTimeout(async () => {
    await bot.sendMessage(
      chatId,
      `<b>ℹ️ Продлить срок действия палки</b>\n\n<code>${email}</code>?`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Продлить", callback_data: "renew_paypal" },
              { text: "Отказаться", callback_data: "refuse_renew_paypal" },
            ],
          ],
        },
      }
    );

    renewPaypalUserState[chatId] = true;

    if (renewPaypalUserState[chatId]) {
      setTimeout(async () => {
        await getBackPaypalToDatabase(email, chatId, nickname);
      }, 5000);
    }
  }, 5000);
};

const getBackPaypalToDatabase = async (paypal, chatId, nickname) => {
  const userData = await db.collection("users").doc(nickname).get();

  await db.collection("emails").doc(paypal).update({
    status: "Свободен",
  });

  const updatedUserPaypals = userData
    .data()
    .paypals.filter((item) => item.email !== paypal);

  await db.collection("users").doc(nickname).update({
    paypals: updatedUserPaypals,
  });

  renewPaypalUserState[chatId] = false;
};

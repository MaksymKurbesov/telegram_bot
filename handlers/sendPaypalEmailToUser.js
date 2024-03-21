import { db } from "../db.js";
import { FieldValue } from "firebase-admin/firestore";
import { bot, renewPaypalUserState } from "../index.js";

export const sendPaypalEmailToUser = async (paypalEmail, msg, chatId) => {
  try {
    const userChatId = msg.message.text.match(/👤 User: \s*(\w+)/)[1];
    const paypalLimit = msg.message.text.match(/💶 Sum:\s*([\d+\-]+€)/)[1];
    const updatedText = `${msg.message.text}\n\n📩 Выданная палка: ${paypalEmail}`;
    const paypalType = msg.message.text.match(/REQUEST\s+(.+)!/)[1];

    const userDoc = await db.collection("users").doc(`${userChatId}`);

    await userDoc.update({
      paypals: FieldValue.arrayUnion({
        email: paypalEmail,
        limit: paypalLimit,
        type: paypalType,
      }),
    });

    await bot.editMessageText(updatedText, {
      chat_id: chatId,
      message_id: msg.message.message_id,
    });

    await bot.sendMessage(
      userChatId,
      `🟢 Выдан PayPal: <b>${paypalType} | <code>${paypalEmail}</code></b>`,
      {
        parse_mode: "HTML",
      }
    );

    if (paypalType !== "UKR") {
      await db.collection("emails").doc(paypalEmail).update({
        status: "Стоп",
      });

      if (renewPaypalUserState[userChatId]) {
        renewPaypalUserState[userChatId].push({
          email: paypalEmail,
          emailReceived: true,
          emailKept: false,
          // nickname: userNickname,
        });
      } else {
        renewPaypalUserState[userChatId] = [
          {
            email: paypalEmail,
            emailReceived: true,
            emailKept: false,
            emailProfited: false,
            // nickname: userNickname,
          },
        ];
      }

      // renewPaypalValidity(userChatId, parsedData.email, userNickname);
    }
  } catch (e) {
    console.log(e, "error sendPaypalEmailToUser");
  }
};

export const renewPaypalValidity = (chatId, email, nickname) => {
  setTimeout(async () => {
    const userPaypal = renewPaypalUserState[chatId].filter((paypal) => {
      return paypal.email === email;
    })[0];

    if (userPaypal.emailProfited) return;

    const sentMessage = await bot.sendMessage(
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

    setTimeout(async () => {
      const userPaypal = renewPaypalUserState[chatId].filter((paypal) => {
        return paypal.email === email;
      })[0];

      if (!userPaypal.emailKept) {
        await getBackPaypalToDatabase(email, nickname);

        await bot.editMessageReplyMarkup(
          {
            inline_keyboard: [
              [{ text: "Срок истёк 🔴", callback_data: "empty" }],
            ],
          },
          {
            message_id: sentMessage.message_id,
            chat_id: chatId,
          }
        );
      }
      userPaypal.emailKept = false;
    }, 7200000);
  }, 7200000);
};

export const getBackPaypalToDatabase = async (paypal, nickname) => {
  try {
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
  } catch (e) {
    console.log(e, "getBackPaypalToDatabase");
  }
};

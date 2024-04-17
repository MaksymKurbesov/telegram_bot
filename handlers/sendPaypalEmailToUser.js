import { db } from '../db.js';
import { bot, renewPaypalUserState } from '../index.js';

export const renewPaypalValidity = (chatId, email, nickname) => {
  setTimeout(async () => {
    const userPaypal = renewPaypalUserState[chatId].filter(paypal => {
      return paypal.email === email;
    })[0];

    if (userPaypal.emailProfited) return;

    const sentMessage = await bot.sendMessage(chatId, `<b>ℹ️ Продлить срок действия палки</b>\n\n<code>${email}</code>?`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Продлить', callback_data: 'renew_paypal' },
            { text: 'Отказаться', callback_data: 'refuse_renew_paypal' },
          ],
        ],
      },
    });

    setTimeout(async () => {
      const userPaypal = renewPaypalUserState[chatId].filter(paypal => {
        return paypal.email === email;
      })[0];

      if (!userPaypal.emailKept) {
        await getBackPaypalToDatabase(email, nickname);

        await bot.editMessageReplyMarkup(
          {
            inline_keyboard: [[{ text: 'Срок истёк 🔴', callback_data: 'empty' }]],
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
    const userData = await db.collection('users').doc(nickname).get();

    await db.collection('emails').doc(paypal).update({
      status: 'Свободен',
    });

    const updatedUserPaypals = userData.data().paypals.filter(item => item.email !== paypal);

    await db.collection('users').doc(nickname).update({
      paypals: updatedUserPaypals,
    });
  } catch (e) {
    console.log(e, 'getBackPaypalToDatabase');
  }
};

import { bot } from '../index.js';
import { db } from '../db.js';

const requestProfitCaption = userPaypals => {
  const userPaypalsStr = userPaypals
    .map(userPaypal => {
      return `<b>${userPaypal.type}</b> | ${userPaypal.email} | На сумму: ${userPaypal.limit}`;
    })
    .join('\n');

  return `<b>🅿️ Ваши PayPal:</b>\n\n${userPaypalsStr}`;
};

// const generateButtonsFromUserPaypals = userPaypals => {
//   const userPaypalsButtons = userPaypals.map(userPaypal => {
//     return [
//       {
//         text: `${userPaypal.email}`,
//         callback_data: `request_profit_paypal_${userPaypal.email}`,
//       },
//     ];
//   });
//
//   return {
//     inline_keyboard: [
//       ...userPaypalsButtons,
//       [
//         {
//           text: `Назад`,
//           callback_data: 'cabinet',
//         },
//       ],
//     ],
//   };
// };

const requestProfit = async (chatID, messageID) => {
  try {
    const userData = await db.collection('users').doc(`${chatID}`).get();
    const { paypals } = userData.data();

    await bot.editMessageCaption(requestProfitCaption(paypals), {
      chat_id: chatID,
      message_id: messageID,
      parse_mode: 'HTML',
      reply_markup: generateButtonsFromUserPaypals(paypals),
    });
  } catch (e) {
    console.log(e, '(data === "request_profit")');
  }
};

export { requestProfit };

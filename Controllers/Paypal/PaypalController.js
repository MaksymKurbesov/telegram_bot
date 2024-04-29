import { editMessageWithInlineKeyboard, sendMessage } from '../../NEWhelpers.js';
import { bot, redisClient, renewPaypalUserState } from '../../index.js';
import { db } from '../../db.js';
import { REQUEST_PAYPAL_EU_ID, REQUEST_PAYPAL_UKR_ID } from '../../consts.js';
import { getEmailButtons } from '../../helpers.js';
import { FieldValue } from 'firebase-admin/firestore';
import { BACK_TO_CABINET_BUTTON, FF_PAYPAL_BUTTONS, PAYPAL_TYPE_BUTTONS, UKR_PAYPAL_BUTTONS } from '../../BUTTONS.js';
import { PAYPAL_MAP, PAYPAL_REQUEST_CHATS_MAP } from './helpers.js';

export class PaypalController {
  constructor() {}

  async getAvailablePaypals(paypalType) {
    const availablePaypalsRef = await db.collection('emails');
    const availablePaypalsSnap = await availablePaypalsRef.where('type', '==', paypalType).where('status', '==', 'Свободен').get();

    const availablePaypals = [];

    await availablePaypalsSnap.docs.forEach(paypal => {
      availablePaypals.push(paypal.data());
    });

    return availablePaypals;
  }

  async getAvailablePaypalsCount(paypalType) {
    const availablePaypals = await this.getAvailablePaypals(paypalType);

    return availablePaypals.length;
  }

  async requestPaypalByUser(chatId, messageId) {
    await editMessageWithInlineKeyboard(
      chatId,
      messageId,
      '<b>🅿️ ПАЛКИ!</b>\n\n<b>PayPal UKR!</b>\nВаш процент: <b>70%</b>\n\n<b>PayPal EU F/F!</b>\nВаш процент: <b>70%</b>',
      PAYPAL_TYPE_BUTTONS,
    );
  }

  async getUserPaypals(chatID) {
    const userData = await db.collection('users').doc(`${chatID}`).get();
    const { paypals } = userData.data();

    return paypals;
  }

  async requestPaypalType(chatId, messageId, type) {
    try {
      await redisClient.hset(`user:${chatId}`, { request_paypal_type: type });
      const buttons = type === 'ukr' ? UKR_PAYPAL_BUTTONS : FF_PAYPAL_BUTTONS;

      await editMessageWithInlineKeyboard(chatId, messageId, '<b>Выберите сумму в €.</b>', buttons);
    } catch (e) {
      console.log(e, 'requestTypePaypal');
    }
  }

  async sendRequestByUser(chatId, messageId, amount) {
    const userData = await db.collection('users').doc(`${chatId}`).get();
    const paypalType = await redisClient.hget(`user:${chatId}`, 'request_paypal_type');
    const requestChatId = PAYPAL_REQUEST_CHATS_MAP[paypalType];
    const availablePaypals = await this.getAvailablePaypals(paypalType);
    const emailButtons = getEmailButtons(availablePaypals, 0, paypalType);

    await redisClient.set(`user:${chatId}_request_paypal_timeout`, 'true', 'EX', 60);
    await editMessageWithInlineKeyboard(chatId, messageId, '<b>Заявка на получение PayPal успешно отправлена!</b>', BACK_TO_CABINET_BUTTON);

    await sendMessage(
      requestChatId,
      `<b>REQUEST ${PAYPAL_MAP[paypalType]}!</b>\n\n\n💶 Sum: <b>${amount}€</b>\n👤 User: <b>${chatId}</b>\n🪪 Nametag: ${
        userData.data().nametag
      }`,
      emailButtons,
    );
  }

  async sendWaitMessage(chatId, messageId) {
    await editMessageWithInlineKeyboard(chatId, messageId, '<b>Подождите 1 минуту для создания новой заявки!</b>', BACK_TO_CABINET_BUTTON);
  }

  async sendPaypalToUser(paypalEmail, msg, chatId) {
    const userChatId = msg.text.match(/👤 User: \s*(\w+)/)[1];
    const paypalLimit = msg.text.match(/💶 Sum:\s*([\d+\-]+€)/)[1];
    const updatedText = `${msg.text}\n\n📩 Выданная палка: ${paypalEmail}`;
    const paypalType = msg.text.match(/REQUEST\s+(.+)!/)[1];

    const userDoc = await db.collection('users').doc(`${userChatId}`);

    await userDoc.update({
      paypals: FieldValue.arrayUnion({
        email: paypalEmail,
        limit: paypalLimit,
        type: paypalType,
      }),
    });

    await bot.editMessageText(updatedText, {
      chat_id: chatId,
      message_id: msg.message_id,
    });

    await bot.sendMessage(userChatId, `🟢 Выдан PayPal: <b>${paypalType} | <code>${paypalEmail}</code></b>`, {
      parse_mode: 'HTML',
    });

    if (paypalType !== 'UKR') {
      await db.collection('emails').doc(paypalEmail).update({
        status: 'Стоп',
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
  }
}

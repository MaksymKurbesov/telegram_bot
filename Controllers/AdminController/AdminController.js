import { adminController, adminDeleteEmail, bot, FirebaseApi, paypalController, redisClient } from '../../index.js';
import { editMessageText, sendMessage } from '../../NEWhelpers.js';
import { getAllUsersFromRedis, isArrayOfEmails } from '../../helpers.js';
import { ADMIN_PANEL_BUTTONS } from '../../BUTTONS.js';
import { ADMIN_PANEL_CHAT_ID } from '../../consts.js';

export class AdminController {
  constructor() {}

  async deletePaypalFromDatabase(email, chatId) {
    try {
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

      if (emailRegex.test(email)) {
        await FirebaseApi.deleteEmailFromDatabase(email);
        await sendMessage(chatId, '🔴 Email успешно удалён!');
        adminDeleteEmail = null;
      }
    } catch (e) {
      console.log(e, 'deletePaypalFromDatabase');
    }
  }

  async addPaypalToDatabase(text, emailType, chatId, adminId) {
    try {
      const emails = text.split(';');

      if (emails.length === 0 || !isArrayOfEmails(emails)) {
        await sendMessage(chatId, '🔴 Неверный формат email');
        return;
      }

      await FirebaseApi.addEmailsToDataBase(emails, emailType);
      await sendMessage(chatId, '🟢 Email успешно добавлены!');
      await redisClient.hset(`user:${adminId}`, { adminAddEmailType: '', adminId: '' });
    } catch (e) {
      console.log(e, 'addPaypalToDatabase');
    }
  }

  async sendAdminPanel(chatId, messageId) {
    try {
      const status = await redisClient.get(`work_status`);
      const ffPaypalCount = await paypalController.getAvailablePaypalsCount('ff');
      const ukrPaypalCount = await paypalController.getAvailablePaypalsCount('ukr');
      const captionText = `<b>🇪🇺 EU Палок в боте: ${ffPaypalCount}\n🇺🇦 UKR Палок в боте: ${ukrPaypalCount}</b>`;

      if (messageId) {
        return await editMessageText(chatId, messageId, captionText, ADMIN_PANEL_BUTTONS(status));
      } else {
        return await sendMessage(chatId, captionText, ADMIN_PANEL_BUTTONS(status));
      }
    } catch (e) {
      console.log(e, 'sendAdminPanel');
    }
  }

  async sendMessageToAllUser(message) {
    try {
      const allUsers = await getAllUsersFromRedis();

      allUsers.forEach(user => {
        if (!user.chatId) return;
        sendMessage(user.chatId, `<b>${message}</b>`).catch(error => {
          console.error(`Не удалось отправить сообщение пользователю с chat_id ${user.chatId}:`, error);
        });
      });
    } catch (e) {
      console.log(e, 'sendMessageToAllUser');
    }
  }

  async cardIn() {
    const items = await redisClient.lrange('dailyProfits', 0, -1);
    const CHAT_TYPE_MAP = {
      ukr: '2017027841',
      ff: '1839867121',
    };

    const generateProfitRows = items => {
      return items
        .map((profit, index) => {
          const parsedProfit = JSON.parse(profit);
          const link = `https://t.me/c/${CHAT_TYPE_MAP[parsedProfit.type]}/${parsedProfit.message_id}`;

          return `${index + 1}. <a href='${link}'>#${parsedProfit.id}</a> | ${parseInt(parsedProfit.amount)}€`;
        })
        .join('\n');
    };

    const profitRows = generateProfitRows(items);
    const totalProfit = items
      .reduce((accum, val) => {
        const amount = parseFloat(JSON.parse(val).amount);
        return accum + (isNaN(amount) ? 0 : amount);
      }, 0)
      .toFixed(2);

    const totalPayment = ((totalProfit / 100) * 70).toFixed(2);
    const caption = `💸 Расчёты по профитам:\n\n${profitRows}\n\nОбщий профит: <b>${totalProfit}€</b>\nОбщая выплата(70%): ≈<b>${totalPayment}€</b>`;

    await sendMessage(ADMIN_PANEL_CHAT_ID, caption);
  }

  async startWork(chatId, messageId) {
    await redisClient.set(`work_status`, 'working');
    await this.sendMessageToAllUser('<b>Начинаем работу! 💸</b>');
    await this.sendAdminPanel(chatId, messageId);
  }

  async stopWork(chatId, messageId) {
    await redisClient.set(`work_status`, 'stopped');
    await adminController.sendMessageToAllUser('<b>Заканчиваем работу! 👹</b>');
    await adminController.sendAdminPanel(chatId, messageId);
  }

  async makeCardIn(chatId, messageId) {
    await redisClient.ltrim('dailyProfits', 1, 0);
    await bot.sendMessage(chatId, 'Выплаты сделаны! 👌');
    await this.sendAdminPanel(chatId, messageId);
  }
}

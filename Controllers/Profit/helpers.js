import { REQUEST_PROFIT_EU_ID, REQUEST_PROFIT_UKR_ID, STATUS_EMOJI_MAP } from '../../consts.js';
import { redisClient } from '../../index.js';

export const REQUEST_PROFIT_CHATS = {
  ukr: REQUEST_PROFIT_UKR_ID,
  ff: REQUEST_PROFIT_EU_ID,
};

export const PROFIT_TYPE_EMOJI = {
  ukr: `🇺🇦`,
  ff: `🇪🇺`,
};

export const SUCCESS_EDIT_PROFIT_MESSAGE = {
  amount: `🟢 Сумма профита успешно изменена!`,
  name: `🟢 Имя профита успешно изменено!`,
};

export const updateProfitStatus = (message, newStatus, id) => {
  const regex = /(\s\S+ Текущий статус профита: )[^\n]+/;
  const updatedStatus = message.replace(regex, `\n${STATUS_EMOJI_MAP[newStatus]} Текущий статус профита: ${newStatus}`);
  return updatedStatus.replace(/payment_message_id: .*/, 'payment_message_id: ' + id);
};

export const generateStatusMessage = (profitId, status, payment_message_id) => {
  const baseMessage = `<b>ℹ️ Статус профита #${profitId}:\n\n${STATUS_EMOJI_MAP[status]} ${status}</b>`;
  const additionalMessage =
    status && payment_message_id === 'НА ПАЛКЕ!'
      ? `\n\nСсылка на профит в чате выплат: https://t.me/c/2017066381/${payment_message_id}`
      : '';

  return baseMessage + additionalMessage;
};

export const generateCaptionFromUserPaypals = userPaypals => {
  const userPaypalsStr = userPaypals
    .map(userPaypal => {
      return `<b>${userPaypal.type}</b> | ${userPaypal.email} | На сумму: ${userPaypal.limit}`;
    })
    .join('\n');

  return `<b>🅿️ Ваши PayPal:</b>\n\n${userPaypalsStr}`;
};

export async function updateObjectInList(listKey, searchKey, searchValue, updateKey, updateValue) {
  // Получаем все элементы списка
  const items = await redisClient.lrange(listKey, 0, -1);
  const updatedItems = [];

  // Перебираем элементы, десериализуем и проверяем, нужно ли обновить
  for (let item of items) {
    let obj = JSON.parse(item);
    if (obj[searchKey] === searchValue) {
      obj[updateKey] = updateValue; // Обновляем нужное поле
    }
    updatedItems.push(JSON.stringify(obj)); // Сериализуем обратно в строку
  }

  // Перезаписываем весь список
  await redisClient.del(listKey); // Удаляем старый список
  if (updatedItems.length > 0) {
    await redisClient.rpush(listKey, ...updatedItems); // Записываем обновлённый список
  }

  return updatedItems; // Возвращаем обновлённый список для проверки
}

export const generateButtonsFromUserPaypals = userPaypals => {
  const buttons = userPaypals.map(paypal => [{ text: `${paypal.email}`, callback_data: `request_profit_paypal_${paypal.email}` }]);
  buttons.push([{ text: `Назад`, callback_data: 'cabinet' }]);
  return buttons;
};

export const updateCaption = (request_paypal_type, request_profit_paypalEmail, text) => {
  return `<b>Оформление профита на PayPal ${request_paypal_type.toUpperCase()}:\n\n${request_profit_paypalEmail}\n\n${text}!</b>`;
};

export const getUpdateProfitTextByType = (type, profitId) => {
  return `<b>ℹ️ Укажите ${type === 'amount' ? `новую сумму` : `новое имя`} для профита ${profitId}!</b>`;
};

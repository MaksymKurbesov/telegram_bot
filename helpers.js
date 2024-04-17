import { bot } from './index.js';
import {
  ADMIN_PANEL_CHAT_ID,
  ITEMS_PER_PAGE,
  PAPA_BOT_CHAT_ID,
  PAYMENTS_CHAT_ID,
  REQUEST_PAYPAL_EU_ID,
  REQUEST_PAYPAL_UKR_ID,
  REQUEST_PROFIT_EU_ID,
  REQUEST_PROFIT_UKR_ID,
} from './consts.js';
import { db } from './db.js';

const generateUniqueID = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let uniqueID = '';

  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    uniqueID += characters[randomIndex];
  }

  return uniqueID;
};

const getPaginationKeyboard = (page, items, type) => {
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const keyboard = [];

  if (page > 1) {
    keyboard.push({ text: '⬅️', callback_data: `prev_${page - 1}_${type}` });
  }

  if (page < totalPages) {
    keyboard.push({ text: '➡️', callback_data: `next_${page + 1}_${type}` });
  }

  return {
    reply_markup: {
      inline_keyboard: [keyboard, [{ text: 'Назад', callback_data: 'user_profits' }]],
    },
  };
};

const sendCurrentPage = async (chatId, messageId, page, items, type) => {
  try {
    const filteredItems = items.filter(profit => profit.type === type);

    const pageItems = filteredItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    const messageText = pageItems
      .map((item, index) => `${index + 1}. #${item.id} | ${item.email} | ${item.amount}€ | ${item.status}`)
      .join('\n');

    const options = {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'HTML',
      reply_markup: getPaginationKeyboard(page, filteredItems, type).reply_markup,
    };

    await bot.editMessageCaption(`<b>Ваши профиты ${type}:</b>\n\n${messageText}`, options);
  } catch (e) {
    console.log(e, 'sendCurrentPage');
  }
};

const getEmailButtons = (emails, currentPage, type) => {
  let buttons = [];
  let pageEmails = emails.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  pageEmails.forEach(email => {
    buttons.push([
      {
        text: email.email,
        callback_data: `paypal_email_${email.email}`,
      },
    ]);
  });

  // Добавляем кнопки управления страницами
  buttons.push([
    { text: '<<', callback_data: `emails_page_${type}_back_${currentPage}` },
    { text: '>>', callback_data: `emails_page_${type}_next_${currentPage}` },
  ]);

  return buttons;
};

const isChatWithoutCaptcha = chatId => {
  const isTalkChat = chatId === Number(PAPA_BOT_CHAT_ID);
  const isAdminChat = chatId === Number(ADMIN_PANEL_CHAT_ID);
  const isRequestProfitChat = chatId === Number(REQUEST_PROFIT_EU_ID) || chatId === Number(REQUEST_PROFIT_UKR_ID);
  const isRequestPaypalChat = chatId === Number(REQUEST_PAYPAL_EU_ID) || chatId === Number(REQUEST_PAYPAL_UKR_ID);
  const isPaymentChat = chatId === Number(PAYMENTS_CHAT_ID);

  return isAdminChat || isRequestProfitChat || isRequestPaypalChat || isPaymentChat || isTalkChat;
};

const isEmpty = obj => {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
};

const updateProfitAmount = (array, id, newAmount) => {
  // Находим индекс объекта с нужным id
  const index = array.findIndex(item => item.id === id);

  if (index !== -1) {
    // Создаем новый объект с обновленным значением amount
    const updatedItem = { ...array[index], amount: Number(newAmount) };

    // Возвращаем новый массив с обновленным объектом
    return [...array.slice(0, index), updatedItem, ...array.slice(index + 1)];
  } else {
    // Если объект с таким id не найден, возвращаем исходный массив
    return array;
  }
};

const updateProfitName = (array, id, newName) => {
  // Находим индекс объекта с нужным id
  const index = array.findIndex(item => item.id === id);

  if (index !== -1) {
    // Создаем новый объект с обновленным значением amount
    const updatedItem = { ...array[index], name: newName };

    // Возвращаем новый массив с обновленным объектом
    return [...array.slice(0, index), updatedItem, ...array.slice(index + 1)];
  } else {
    // Если объект с таким id не найден, возвращаем исходный массив
    return array;
  }
};

const generateUser = (chatId, nickname) => {
  return {
    chatId,
    nickname,
    isAdmin: false,
    nametag: `#${generateNametag(String(chatId))}`,
    teamTopProfit: 0,
    profits: [],
    paypals: [],
    ibans: [],
    bitcoin: '',
    trc20: '',
    ethereum: '',
  };
};

const extractValue = (str, pattern) => {
  let parts = str.split(pattern);
  if (parts.length > 1) {
    return parts[1].split('\n')[0].trim(); // trim() уберет пробельные символы в начале и конце строки
  }
  return null; // или любое другое значение для обозначения, что ничего не найдено
};

const extractFieldValue = (str, key) => {
  const regex = new RegExp(key + ':\\s*([\\w€@#.]+)');
  // Ищем соответствие в строке
  const match = str.match(regex);
  // Возвращаем найденное значение, если оно есть
  return match ? match[1] : null;
};

const getInfoFromMessage = message => {
  const messageId = extractFieldValue(message.caption, `profit_message_id`);
  const user_chat_id = extractFieldValue(message.caption, `user_chat_id`);
  const profitId = extractFieldValue(message.caption, `Профит ID`);

  const correctProfitId = profitId.split('#')[1];

  return {
    profit_message_id: messageId,
    user_chat_id: user_chat_id,
    profitId: correctProfitId,
  };
};

const generateNametag = numberSet => {
  // Создаем хеш на основе входного набора чисел
  let hash = 0;
  for (let i = 0; i < numberSet.length; i++) {
    let char = numberSet.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Преобразовываем в 32битное целое число
  }

  // Преобразуем хеш в строку в шестнадцатеричном формате
  hash = Math.abs(hash).toString(16).toUpperCase();

  // Обрезаем или дополняем строку до 7 символов
  if (hash.length > 7) {
    hash = hash.substring(0, 7);
  } else {
    while (hash.length < 7) {
      hash += '0';
    }
  }

  return hash;
};

const isArrayOfEmails = arr => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return Array.isArray(arr) && arr.every(email => emailRegex.test(email));
};

const countEmailsByType = async () => {
  // Получение всех email'ов из коллекции
  const emailsRef = db.collection('emails');
  const snapshot = await emailsRef.where('status', '==', 'Свободен').get();

  // Инициализация счетчиков для каждого типа
  let typeCounters = {};

  // Подсчет количества email'ов каждого типа
  snapshot.forEach(doc => {
    const { type } = doc.data();
    if (typeCounters[type]) {
      typeCounters[type] += 1;
    } else {
      typeCounters[type] = 1;
    }
  });

  return typeCounters;
};

const updateAmountInPaymentsChat = (type, user, amount) => {
  return `${type === 'UKR' ? '🇺🇦' : '🇪🇺'} Paypal: <b>${type}</b>\n👤 Пользователь: <b>${user}</b>\n💶 Сумма: <b>${amount}€</b>`;
};

export {
  generateUser,
  generateUniqueID,
  sendCurrentPage,
  extractValue,
  countEmailsByType,
  isArrayOfEmails,
  isChatWithoutCaptcha,
  updateProfitAmount,
  updateProfitName,
  getEmailButtons,
  updateAmountInPaymentsChat,
  isEmpty,
  extractFieldValue,
  getInfoFromMessage,
};

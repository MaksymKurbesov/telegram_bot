import { bot } from './index.js';

export const editMessageWithInlineKeyboard = async (chatId, messageId, text, buttons, parseMode = 'HTML') => {
  // Создание структуры inline_keyboard на основе массива кнопок
  const inline_keyboard = buttons.map(row =>
    row.map(button => ({
      text: button.text,
      callback_data: button.callback_data,
    })),
  );

  // Объект настроек для bot.editMessageCaption
  const options = {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: parseMode,
    reply_markup: { inline_keyboard },
  };

  // Редактирование сообщения с новым заголовком и клавиатурой
  await bot.editMessageCaption(`${text}`, options);
};

export const sendMessageWithInlineKeyboard = async (chatId, text, buttons, parseMode = 'HTML') => {
  return await bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: buttons,
    },
    parse_mode: parseMode,
  });
};

export const editMessageText = async (chatId, messageId, text, buttons, parseMode = 'HTML') => {
  await bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: buttons,
    },
    parse_mode: parseMode,
  });
};

export const sendPhotoWithInlineKeyboard = async (chatId, photo, caption, buttons, parseMode = 'HTML') => {
  await bot.sendPhoto(chatId, photo, {
    caption,
    reply_markup: {
      inline_keyboard: buttons,
    },
    parse_mode: parseMode,
  });
};

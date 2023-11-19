import { bot, userChangeNametagState, usersCache } from "../index.js";
import { db } from "../db.js";

export const getNameTag = async (chatId, messageId, username) => {
  await bot.editMessageCaption(
    `<b>NAMETAG: \n\n${usersCache[username].nametag}\n\nДанный тег будет показан в канале выплат!</b>`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Изменить",
              callback_data: "change_nametag",
            },
          ],
          [{ text: "Назад", callback_data: "cabinet" }],
        ],
      },
    }
  );
};

export const changeNameTag = async (chatId, messageId) => {
  userChangeNametagState[chatId] = {
    message_id: messageId,
  };
  await bot.editMessageCaption(`<b>Укажите свой новый NAMETAG</b>`, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "Назад", callback_data: "cabinet" }]],
    },
  });
};

export const updateNameTag = async (chatId, messageId, username, text) => {
  await db.collection("users").doc(username).update({
    nametag: text,
  });

  usersCache[username].nametag = text;

  await bot.deleteMessage(chatId, messageId);
  await bot.editMessageCaption(`<b>NAMETAG успешно изменён.</b>`, {
    chat_id: chatId,
    message_id: userChangeNametagState[chatId].message_id,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "Назад", callback_data: "cabinet" }]],
    },
  });

  userChangeNametagState[chatId] = null;
};

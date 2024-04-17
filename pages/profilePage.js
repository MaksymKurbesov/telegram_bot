import { editMessageWithInlineKeyboard } from '../NEWhelpers.js';

export const getProfilePage = async (chatId, messageId) => {
  const buttons = [
    [
      {
        text: `Профиты`,
        callback_data: 'user_profits',
      },
    ],
    [
      {
        text: `Оформить профит`,
        callback_data: 'request_profit',
      },
      {
        text: `Мои IBAN`,
        callback_data: 'my_ibans',
      },
    ],
    [
      {
        text: `Реквизиты для выплат`,
        callback_data: 'payment_details',
      },
      {
        text: `NAMETAG`,
        callback_data: 'nametag',
      },
    ],
    [
      {
        text: `Назад`,
        callback_data: 'cabinet',
      },
    ],
  ];

  await editMessageWithInlineKeyboard(
    chatId,
    messageId,
    `<b>Профиль</b>\n\nЗдесь можно посмотреть статусы ваших профитов, взятые вами PayPal и IBAN, так же указать реквизиты для выплат.`,
    buttons
  );
};

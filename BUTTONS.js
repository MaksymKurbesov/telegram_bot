export const PROFIT_TYPE_BUTTONS = [
  [
    {
      text: 'UKR',
      callback_data: 'get_user_profits_ukr',
    },
    {
      text: 'EU F/F',
      callback_data: 'get_user_profits_eu',
    },
  ],
  [{ text: 'Назад', callback_data: 'cabinet' }],
];

export const BACK_TO_CABINET_BUTTON = [
  [
    {
      text: `Назад`,
      callback_data: 'cabinet',
    },
  ],
];

export const PAYPAL_TYPE_BUTTONS = [
  [
    { text: 'UKR', callback_data: 'request_paypal_type_ukr' },
    { text: 'EU F/F', callback_data: 'request_paypal_type_ff' },
  ],
  [
    {
      text: `Отмена`,
      callback_data: 'cabinet',
    },
  ],
];

export const CHATS_BUTTONS = [
  [{ text: 'Выплаты 💸', callback_data: 'https://t.me/paymentnotifications' }],
  [{ text: 'Общение 🗣', callback_data: 'get_chat_invite_link' }],
  [{ text: 'Назад', callback_data: 'cabinet' }],
];

export const UKR_PAYPAL_BUTTONS = [
  [
    { text: '40€ - 100€', callback_data: 'paypal_request_amount_40-100' },
    {
      text: '100€ - 250€',
      callback_data: 'paypal_request_amount_100-250',
    },
  ],
  [
    {
      text: '250€ - 400€',
      callback_data: 'paypal_request_amount_250-400',
    },
    {
      text: '400€ - 500€',
      callback_data: 'paypal_request_amount_400-500',
    },
  ],
  [
    { text: '500€+', callback_data: 'paypal_request_amount_500+' },
    {
      text: `Отмена`,
      callback_data: 'cabinet',
    },
  ],
];

export const FF_PAYPAL_BUTTONS = [
  [
    { text: '0€ - 100€', callback_data: 'paypal_request_amount_0-100' },
    { text: '100€+', callback_data: 'paypal_request_amount_100+' },
  ],
  [
    {
      text: `Отмена`,
      callback_data: 'cabinet',
    },
  ],
];

export const WALLET_BUTTONS = [
  [{ text: 'TRC20', callback_data: 'request_profit_wallet_trc20' }],
  [
    {
      text: 'Ethereum',
      callback_data: 'request_profit_wallet_ethereum',
    },
  ],
  [
    {
      text: 'Bitcoin',
      callback_data: 'request_profit_wallet_bitcoin',
    },
  ],
  [{ text: 'Отмена', callback_data: 'cancel_profit' }],
];

export const PROFIT_STATUS_BUTTONS = [
  [
    { text: '🟢 НА ПАЛКЕ!', callback_data: 'profit-status-money_on_paypal' },
    { text: '⚪ ПУСТО!', callback_data: 'profit-status-empty' },
  ],
  [{ text: ' 🎉 ИНСТАНТ!', callback_data: 'profit-status-instant' }],
  [
    { text: '⛔ СТОП!', callback_data: 'profit-status-stop' },
    { text: '🕐 24ч', callback_data: 'profit-status-24_hours' },
  ],
  [
    { text: '💊 ФРОД!', callback_data: 'profit-status-fraud' },
    { text: '🔑 ВЕРИФ!', callback_data: 'profit-status-verification' },
  ],
  [
    { text: '❌ ЛОК!', callback_data: 'profit-status-lock' },
    { text: '✋ ДИСПУТ!', callback_data: 'profit-status-dispute' },
  ],
  [
    {
      text: '✏ ПЕРЕОФОРМИТЬ!',
      callback_data: 'profit-status-reissue',
    },
  ],
  [{ text: '✅ ВЫПЛАЧЕНО!', callback_data: 'profit-status-paid' }],
];

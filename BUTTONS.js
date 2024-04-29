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

export const DEFAULT_PROFIT_STATUS_BUTTONS = [[{ text: 'Ожидание 🕐', callback_data: 'profit_status' }]];

export const ON_PAYPAL_PROFIT_STATUS_BUTTONS = [[{ text: '🟢 НА ПАЛКЕ!', callback_data: 'status' }]];

export const DELETE_MESSAGE_BUTTON = [[{ text: 'Закрыть ❌', callback_data: 'delete_message' }]];

export const BACK_TO_PROFIT_STATUS_BUTTON = [[{ text: 'Назад', callback_data: 'back_to_profit_status' }]];

export const EDIT_PROFIT_BUTTONS = [
  [{ text: 'Изменить сумму', callback_data: 'change_profit_amount' }],
  [{ text: 'Изменить имя', callback_data: 'change_profit_name' }],
  [{ text: 'Назад', callback_data: 'back_to_profit_status' }],
];

export const ADD_PAYPAL_TYPE_BUTTONS = [
  [
    { text: 'EU F/F', callback_data: 'add_paypals_ff' },
    { text: 'UKR', callback_data: 'add_paypals_ukr' },
  ],
  [{ text: 'Назад', callback_data: 'admin_panel' }],
];

export const BACK_TO_ADMIN_PANEL_BUTTON = [[{ text: 'Назад', callback_data: 'admin_panel' }]];

export const CANCEL_ADD_EMAIL_BUTTON = [[{ text: 'Отмена', callback_data: 'cancel_add_email' }]];

export const CARD_IN_BUTTONS = [
  [
    { text: 'Выплачено! 💸', callback_data: 'confirm_card_in' },
    { text: 'Отмена 🔴', callback_data: 'admin_panel' },
  ],
];

export const ADMIN_PANEL_BUTTONS = status => {
  return [
    [
      {
        text: `${status === 'working' ? 'STOP 🛑' : 'WORK ✅'}`,
        callback_data: `${status === 'working' ? 'stop_work' : 'start_work'}`,
      },
    ],
    [
      { text: 'Добавить 🅿️', callback_data: 'add_paypals' },
      { text: 'Удалить 🅿️', callback_data: 'delete_paypal' },
    ],
    [
      { text: 'Касса 🗂️', callback_data: 'card_in' },
      { text: 'Выплата 💸', callback_data: 'restart_card_in' },
    ],
  ];
};

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

import { STATUS_EMOJI } from "./options.js";

const MAIN_IMAGE = "./image/main.jpg";
const NOTIFICATION_CHAT_ID = "-1001893729773";
const PAYPALS_PROFITS_CHAT_ID = "-1001928816701";

const STATUS_BUTTONS = [
  {
    text: `Статус1 ${STATUS_EMOJI["Статус1"]}`,
    callback_data: "change_email_status1",
  },
  {
    text: `Статус2 ${STATUS_EMOJI["Статус2"]}`,
    callback_data: "change_email_status2",
  },
  {
    text: `Статус3 ${STATUS_EMOJI["Статус3"]}`,
    callback_data: "change_email_status3",
  },
];

export {
  STATUS_BUTTONS,
  MAIN_IMAGE,
  NOTIFICATION_CHAT_ID,
  PAYPALS_PROFITS_CHAT_ID,
};

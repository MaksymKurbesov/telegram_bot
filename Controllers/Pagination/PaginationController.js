import { ITEMS_PER_PAGE } from '../../consts.js';
import { getEmailButtons } from '../../helpers.js';
import { editMessageReplyMarkup } from '../../NEWhelpers.js';
import { paypalController } from '../../index.js';

export class PaginationController {
  constructor() {}

  async changePage(chat, message_id, data) {
    try {
      const parts = data.split('_');
      const type = parts[2];
      const action = parts[3];
      let currentPage = Number(parseInt(parts[4]));

      const emailsCount = await paypalController.getAvailablePaypalsCount(type);
      const totalPage = Math.ceil(emailsCount / ITEMS_PER_PAGE);

      if ((action === 'next' && currentPage >= totalPage - 1) || (action === 'back' && currentPage === 0)) {
        return; // Преждевременный выход, если дальнейшее действие невозможно
      }

      currentPage += action === 'next' ? 1 : -1;
      currentPage = Math.max(0, Math.min(currentPage, totalPage - 1));

      const emails = await paypalController.getAvailablePaypals(type);
      const buttons = getEmailButtons(emails, currentPage, type);
      await editMessageReplyMarkup(chat.id, message_id, buttons);
    } catch (e) {
      console.log(e, 'changePage');
    }
  }
}

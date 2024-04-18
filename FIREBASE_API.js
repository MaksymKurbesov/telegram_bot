import { db } from './db.js';
import { FirebaseApi } from './index.js';

export class FirebaseAPI {
  constructor() {}

  async getUserDoc(userId) {
    return db.collection('users').doc(`${userId}`);
  }

  async addUser(userInfo, userId) {
    const userDoc = await this.getUserDoc(userId);
    await userDoc.set(userInfo);
  }

  async getUser(userId) {
    const userDoc = await this.getUserDoc(userId);
    return await userDoc.get();
  }

  async updateUser(userId, data) {
    const userDoc = await this.getUserDoc(userId);
    await userDoc.update(data);
  }

  async getUserWalletNumber(userId, wallet) {
    const userData = await this.getUser(userId);

    return userData.data()[wallet];
  }

  async removePaypalFromUser(userId, email) {
    const user = await this.getUser(userId);
    const userData = user.data();
    const paypals = userData.paypals || [];
    const newPaypals = paypals.filter(paypal => paypal.email !== email);

    const userDoc = await this.getUserDoc(userId);
    await userDoc.update({ paypals: newPaypals });
  }

  async addProfit(userId, profit) {
    const userData = await this.getUser(userId);
    const profits = userData.data().profits || [];

    profits.push(profit);
    const userDoc = await this.getUserDoc(userId);
    await userDoc.update({ profits });
  }

  async updateProfitStatus(userId, profitId, status) {
    const userProfits = await FirebaseApi.getUserProfits(userId);

    const profitToUpdate = userProfits.find(profit => profit.id === profitId);
    profitToUpdate.status = status;

    await FirebaseApi.updateUser(userId, { profits: userProfits });
  }

  async getUserProfits(userId) {
    const userData = await this.getUser(userId);
    return userData.data().profits;
  }
}

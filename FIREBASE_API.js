import { db } from './db.js';

export class FirebaseAPI {
  constructor() {}

  async getUserDoc(userId) {
    try {
      return db.collection('users').doc(`${userId}`);
    } catch (e) {
      console.log(e, 'getUserDoc');
    }
  }

  async addUser(userInfo, userId) {
    try {
      const userDoc = await this.getUserDoc(userId);
      await userDoc.set(userInfo);
    } catch (e) {
      console.log(e, 'addUser');
    }
  }

  async getUser(userId) {
    try {
      const userDoc = await this.getUserDoc(userId);
      return await userDoc.get();
    } catch (e) {
      console.log(e, 'getUser');
    }
  }

  async updateUser(userId, data) {
    try {
      const userDoc = await this.getUserDoc(userId);
      await userDoc.update(data);
    } catch (e) {
      console.log(e, 'updateUser');
    }
  }

  async getUserWalletNumber(userId, wallet) {
    try {
      const userData = await this.getUser(userId);

      return userData.data()[wallet];
    } catch (e) {
      console.log(e, 'getUserWalletNumber');
    }
  }

  async removePaypalFromUser(userId, email) {
    try {
      const user = await this.getUser(userId);
      const userData = user.data();
      const paypals = userData.paypals || [];
      const newPaypals = paypals.filter(paypal => paypal.email !== email);

      const userDoc = await this.getUserDoc(userId);
      await userDoc.update({ paypals: newPaypals });
    } catch (e) {
      console.log(e, 'removePaypalFromUser');
    }
  }

  async addProfit(userId, profit) {
    try {
      const userData = await this.getUser(userId);
      const profits = userData.data().profits || [];

      profits.push(profit);
      const userDoc = await this.getUserDoc(userId);
      await userDoc.update({ profits });
    } catch (e) {
      console.log(e, 'addProfit');
    }
  }

  async updateProfitStatus(userId, profitId, status) {
    try {
      const userProfits = await this.getUserProfits(userId);

      const profitToUpdate = userProfits.find(profit => profit.id === profitId);
      profitToUpdate.status = status;

      await this.updateUser(userId, { profits: userProfits });
    } catch (e) {
      console.log(e, 'updateProfitStatus');
    }
  }

  async getUserProfits(userId) {
    try {
      const userData = await this.getUser(userId);
      return userData.data().profits;
    } catch (e) {
      console.log(e, 'getUserProfits');
    }
  }

  async addEmailsToDataBase(emails, emailType) {
    try {
      const emailsPromises = emails.map(async email => {
        await db.collection('emails').doc(email).set({
          email,
          type: emailType,
          status: 'Свободен',
        });
      });

      await Promise.all(emailsPromises);
    } catch (e) {
      console.log(e, 'addEmailsToDataBase');
    }
  }

  async deleteEmailFromDatabase(email) {
    try {
      await db.collection('emails').doc(email).delete();
    } catch (e) {
      console.log(e, 'deleteEmailFromDatabase');
    }
  }
}

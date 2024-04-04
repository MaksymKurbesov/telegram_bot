import { db } from './db.js';

const addUser = async (userInfo, userId) => {
  await db.collection('users').doc(`${userId}`).set(userInfo);
};

const getUser = async userId => {
  return await db.collection('users').doc(`${userId}`).get();
};

const updateUser = async (userId, data) => {
  const userDoc = await db.collection('users').doc(`${userId}`);

  await userDoc.update(data);
};

const getUserProfits = async userId => {
  const userDoc = await db.collection('users').doc(`${userId}`);
  const userData = await userDoc.get();

  return userData.data().profits;
};

export default { addUser, getUser, updateUser, getUserProfits };

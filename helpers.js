let userEmails = [];

let emails = [
  { email: "test1@gmail.com", status: "Свободен" },
  { email: "test2@gmail.com", status: "Свободен" },
  { email: "test3@gmail.com", status: "Свободен" },
  { email: "test4@gmail.com", status: "Свободен" },
  { email: "test5@gmail.com", status: "Свободен" },
  { email: "test6@gmail.com", status: "Свободен" },
  { email: "test7@gmail.com", status: "Свободен" },
  { email: "test8@gmail.com", status: "Свободен" },
  { email: "test9@gmail.com", status: "Свободен" },
  { email: "test10@gmail.com", status: "Свободен" },
];

const updateEmailStatus = (email, status) => {
  emails = emails.map((emailFromDB) => {
    return emailFromDB.email === email
      ? { ...emailFromDB, status }
      : emailFromDB;
  });
};

const updateUserEmailStatus = (email, status) => {
  userEmails = userEmails.map((emailFromDB) => {
    return emailFromDB.email === email
      ? { ...emailFromDB, status }
      : emailFromDB;
  });
};

const extractEmail = (text) => {
  return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
};

export {
  updateUserEmailStatus,
  updateEmailStatus,
  extractEmail,
  userEmails,
  emails,
};

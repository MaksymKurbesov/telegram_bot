const cabinetPage = (username, profitsCount, totalProfits, topProfit) => {
  return `
<b>Кабинет:</b> ${username}
<b>Количество профитов:</b> ${profitsCount} шт.
<b>Общая сумма профитов:</b> ${totalProfits}€
<b>Личный топ профит:</b> ${topProfit}€
<b>Топ профит тимы:</b> ${topProfit}€
    `;
};

export { cabinetPage };

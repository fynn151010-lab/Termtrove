export const money = (p: number) =>
  "฿" + (p / 100).toLocaleString("en-TH", { maximumFractionDigits: 2 });

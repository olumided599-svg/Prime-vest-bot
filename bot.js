    const { Telegraf, Markup } = require("telegraf");
const express = require("express");

const bot = new Telegraf(process.env.TOKEN);

// 🔐 CONFIG
const ADMIN_ID = process.env.ADMIN_ID;
const CHANNEL = "@starfordfreenumbers";
const GROUP = "@primevestglobalinvestments"; // must be public
const BOT_USERNAME = "Primevestglobal_bot";

// 🌐 KEEP ALIVE
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(3000, () => console.log("Web server running"));

// 📦 PACKAGES
const packages = [3000,5000,10000,15000,20000,25000,40000,50000];

// 🧠 DATABASE
let users = {};
let pendingDeposits = {};
let history = {};
let customDeposit = {};

// 👤 USER
function getUser(id){
  if(!users[id]){
    users[id] = {
      balance: 500,
      deposited: 0,
      invested: 0,
      plan: null,
      start: null,
      referredBy: null,
      referrals: 0,
      referralEarnings: 0
    };
  }
  return users[id];
}

// 📜 HISTORY
function addHistory(id, text){
  if(!history[id]) history[id] = [];
  history[id].push(text);
}

// 🚫 FORCE JOIN
async function checkJoin(ctx){
  try{
    let ch = await ctx.telegram.getChatMember(CHANNEL, ctx.from.id);
    let gr = await ctx.telegram.getChatMember(GROUP, ctx.from.id);

    if(ch.status === "left" || gr.status === "left"){
      ctx.reply(`🚫 Join first:

👉 ${CHANNEL}
👉 ${GROUP}

Then press /start again`);
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

  let user = getUser(ctx.from.id);
  let ref = ctx.message.text.split(" ")[1];

  if(ref && ref != ctx.from.id && !user.referredBy){
    user.referredBy = ref;

    let refUser = getUser(ref);
    refUser.referrals += 1;

    bot.telegram.sendMessage(ref, "🎉 New referral joined!");
  }

  ctx.reply("💰 Welcome to Prime Vest Global\n🎁 ₦500 bonus added!", menu);
});

// 💳 DEPOSIT MENU
bot.hears("💳 Deposit", async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  ctx.reply("💳 Choose Deposit Amount:", Markup.inlineKeyboard([
    [Markup.button.callback("₦3000","dep_3000"), Markup.button.callback("₦5000","dep_5000")],
    [Markup.button.callback("₦10000","dep_10000"), Markup.button.callback("₦15000","dep_15000")],
    [Markup.button.callback("₦20000","dep_20000"), Markup.button.callback("₦25000","dep_25000")],
    [Markup.button.callback("₦40000","dep_40000"), Markup.button.callback("₦50000","dep_50000")],
    [Markup.button.callback("💰 Custom Amount","dep_custom")]
  ]));
});

// 💰 CUSTOM
bot.action("dep_custom", (ctx)=>{
  customDeposit[ctx.from.id] = true;
  ctx.reply("Enter amount:");
});

// HANDLE TEXT
bot.on("text", (ctx)=>{
  let id = ctx.from.id;

  if(customDeposit[id]){
    let amount = parseInt(ctx.message.text);

    if(isNaN(amount) || amount < 1000){
      return ctx.reply("❌ Invalid amount");
    }

    pendingDeposits[id] = amount;
    customDeposit[id] = false;

    ctx.reply(`💳 Deposit ₦${amount}

Bank: Moniepoint MFB
Account: 5075903950
Name: Kamsi Chosen Oragwam

📸 Send screenshot`);
  }
});

// SELECT AMOUNT
bot.action(/dep_(.+)/, (ctx)=>{
  let amount = ctx.match[1];
  pendingDeposits[ctx.from.id] = amount;

  ctx.reply(`💳 Deposit ₦${amount}

Bank: Moniepoint MFB
Account: 5075903950
Name: Kamsi Chosen Oragwam

📸 Send screenshot`);
});

// 📸 SCREENSHOT
bot.on("photo", (ctx)=>{
  let id = ctx.from.id;

  if(!pendingDeposits[id]){
    return ctx.reply("Select amount first");
  }

  let amount = pendingDeposits[id];
  let file = ctx.message.photo.pop().file_id;

  bot.telegram.sendPhoto(ADMIN_ID, file, {
    caption:`📥 Deposit

User: ${id}
Amount: ₦${amount}

/approve_${id}_${amount}`
  });

  ctx.reply("⏳ Waiting approval...");
});

// ✅ APPROVE
bot.command(/approve_(.+)/, (ctx)=>{
  if(ctx.from.id != ADMIN_ID) return;

  let [id, amount] = ctx.match[1].split("_");
  amount = parseInt(amount);

  let user = getUser(id);

  user.balance += amount;
  user.deposited += amount;

  addHistory(id, `Deposit ₦${amount}`);

  bot.telegram.sendMessage(id, `✅ ₦${amount} added`);
  ctx.reply("Approved");
});

// 📊 INVEST MENU
bot.hears(["💼 Invest","📊 Packages"], (ctx)=>{
  ctx.reply("Choose plan:", Markup.inlineKeyboard(
    packages.map(p=>[Markup.button.callback(`₦${p}`,`invest_${p}`)])
  ));
});

// 💼 INVEST
bot.action(/invest_(.+)/, (ctx)=>{
  let amount = parseInt(ctx.match[1]);
  let user = getUser(ctx.from.id);

  if(amount < 3000){
    return ctx.reply("❌ Minimum investment is ₦3000");
  }

  if(user.balance < amount){
    return ctx.reply("❌ Insufficient balance");
  }

  user.balance -= amount;
  user.invested = amount;
  user.plan = amount;
  user.start = Date.now();

  if(user.referredBy){
    let refUser = getUser(user.referredBy);
    let bonus = amount * 0.18;

    refUser.balance += bonus;
    refUser.referralEarnings += bonus;
  }

  addHistory(ctx.from.id, `Invest ₦${amount}`);

  ctx.reply(`✅ Invested ₦${amount}
📈 Daily: ₦${amount * 0.25}
⏳ 60 Days`);
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
📈 Earned: ₦${earned}
⏳ ${days}/60 days`);
});

// 📤 WITHDRAW
bot.hears("📤 Withdraw", (ctx)=>{
  let u = getUser(ctx.from.id);

  if(u.deposited <= 0){
    return ctx.reply("⚠️ Deposit first");
  }

  if(u.invested < 3000){
    return ctx.reply("⚠️ Invest at least ₦3000");
  }

  if(u.balance < 500){
    return ctx.reply("❌ Minimum ₦500");
  }

  bot.telegram.sendMessage(ADMIN_ID,
`💸 Withdrawal

User: ${ctx.from.id}
Amount: ₦${u.balance}

/pay_${ctx.from.id}`);

  ctx.reply("⏳ Pending approval");
});

// 💸 PAY
bot.command(/pay_(.+)/, (ctx)=>{
  if(ctx.from.id != ADMIN_ID) return;

  let id = ctx.match[1];
  let user = getUser(id);

  let charge = user.balance * 0.05;
  let final = user.balance - charge;

  user.balance = 0;

  addHistory(id, `Withdraw ₦${final}`);

  bot.telegram.sendMessage(id,
`✅ Paid ₦${final}
Fee: ₦${charge}`);

  ctx.reply("Paid");
});

// 👥 REFERRAL
bot.hears("👥 Referral", (ctx)=>{
  let user = getUser(ctx.from.id);

  ctx.reply(`👥 Referral

https://t.me/${BOT_USERNAME}?start=${ctx.from.id}

Referrals: ${user.referrals}
Earnings: ₦${user.referralEarnings}`);
});

// 📜 HISTORY
bot.hears("📜 History", (ctx)=>{
  let h = history[ctx.from.id] || [];
  ctx.reply(h.length ? h.join("\n") : "No history");
});

// 🚀 START BOT
bot.launch();
console.log("Bot running...");

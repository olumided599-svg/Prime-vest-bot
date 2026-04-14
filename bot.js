const { Telegraf, Markup } = require("telegraf");
const express = require("express");

const bot = new Telegraf(process.env.TOKEN);

// 🌐 KEEP RENDER ALIVE (VERY IMPORTANT)
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// 🔐 CONFIG
const ADMIN_ID = Number(process.env.ADMIN_ID);

// ⚠️ USE USERNAME ONLY (NO LINKS)
const CHANNEL = "@starfordfreenumbers";
const GROUP = "@primevestglobalinvestments";
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
      start: null,
      referredBy: null,
      referrals: 0,
      referralEarnings: 0
    };
  }
  return users[id];
}

// 🚫 FORCE JOIN FIXED
async function checkJoin(ctx){
  try{
    let ch = await ctx.telegram.getChatMember(CHANNEL, ctx.from.id);
    let gr = await ctx.telegram.getChatMember(GROUP, ctx.from.id);

    if(["left","kicked"].includes(ch.status) || ["left","kicked"].includes(gr.status)){
      await ctx.reply(`🚫 Join first:

📢 Channel: ${CHANNEL}
👥 Group: ${GROUP}`);
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

  ctx.reply("💳 Choose Deposit Amount:",
    Markup.inlineKeyboard([
      packages.map(p => Markup.button.callback(`₦${p}`, `deposit_${p}`)),
      [Markup.button.callback("💰 Custom Amount","deposit_custom")]
    ])
  );
});

// 🔥 HANDLE DEPOSIT BUTTON
bot.action(/deposit_(.+)/, async (ctx)=>{
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

// 💰 CUSTOM AMOUNT
bot.on("text", async (ctx)=>{
  let id = ctx.from.id;

  if(pendingDeposits[id] === "custom"){
    let amt = parseInt(ctx.message.text);
    if(isNaN(amt)) return ctx.reply("❌ Invalid amount");

    pendingDeposits[id] = amt;

    ctx.reply(`💳 Deposit ₦${amt}

Send screenshot after payment.`);
  }
});

// 📸 SCREENSHOT
bot.on("photo", async (ctx)=>{
  let id = ctx.from.id;

  if(!pendingDeposits[id]){
    return ctx.reply("❌ Select deposit amount first");
  }

  let amount = pendingDeposits[id];
  let file = ctx.message.photo.pop().file_id;

  bot.telegram.sendPhoto(ADMIN_ID, file,{
    caption:`📥 Deposit Request

User: ${id}
Amount: ₦${amount}

/approve_${id}_${amount}`
  });

  ctx.reply("⏳ Waiting for approval...");
  delete pendingDeposits[id];
});

// ✅ APPROVE
bot.command(/approve_(.+)/,(ctx)=>{
  if(ctx.from.id != ADMIN_ID) return;

  let [id,amount] = ctx.match[1].split("_");
  amount = parseInt(amount);

  let user = getUser(id);

  user.balance += amount;
  user.deposited += amount;

  bot.telegram.sendMessage(id,`✅ ₦${amount} approved`);
  ctx.reply("Approved ✅");
});

// 📊 INVEST MENU
bot.hears(["💼 Invest","📊 Packages"], async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  ctx.reply("📊 Choose Package:",
    Markup.inlineKeyboard(
      packages.map(p=>[Markup.button.callback(`₦${p}`,`invest_${p}`)])
    )
  );
});

// 💼 INVEST
bot.action(/invest_(.+)/, async (ctx)=>{
  let amount = parseInt(ctx.match[1]);
  let user = getUser(ctx.from.id);

  if(amount < 3000) return ctx.reply("❌ Minimum invest ₦3000");
  if(user.balance < amount) return ctx.reply("❌ Insufficient balance");

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
    days = Math.floor((Date.now()-u.start)/(86400000));
    if(days>60) days=60;
    earned = u.plan * 0.25 * days;
  }

  ctx.reply(`💰 Balance: ₦${u.balance}

📈 Earned: ₦${earned}
⏳ Days: ${days}/60`);
});

// 📤 WITHDRAW
bot.hears("📤 Withdraw",(ctx)=>{
  let u = getUser(ctx.from.id);

  if(u.deposited<=0) return ctx.reply("❌ Deposit first");
  if(u.invested<3000) return ctx.reply("❌ Invest minimum ₦3000");
  if(u.balance<500) return ctx.reply("❌ Min withdraw ₦500");

  let charge = u.balance * 0.1;
  let final = u.balance - charge;

  u.balance = 0;

  ctx.reply(`💸 Withdrawal Sent

Charge: ₦${charge}
You get: ₦${final}`);
});

// 👥 REFERRAL
bot.hears("👥 Referral",(ctx)=>{
  let u = getUser(ctx.from.id);

  ctx.reply(`👥 Referral

Link:
https://t.me/${BOT_USERNAME}?start=${ctx.from.id}

Referrals: ${u.referrals}
Earnings: ₦${u.referralEarnings}`);
});

// 📜 HISTORY
bot.hears("📜 History",(ctx)=>{
  ctx.reply("📜 History coming soon...");
});

// 🚀 START
bot.launch();
console.log("Bot running...");

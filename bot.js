const { Telegraf, Markup } = require("telegraf");
const bot = new Telegraf(process.env.TOKEN);

// 🔐 CONFIG
const ADMIN_ID = process.env.ADMIN_ID;
const CHANNEL = "@starfordfreenumbers"; // MUST be public username
const GROUP = "@YourGroupUsername"; // FIX this (must be public)
const BOT_USERNAME = "Primevestglobal_bot"; // ❌ remove @

// 📦 PACKAGES
const packages = [3000,5000,10000,15000,20000,25000,40000,50000];

// 🧠 MEMORY DB
let users = {};
let pendingDeposits = {};
let customDeposit = {};

// 👤 GET USER
function getUser(id){
  if(!users[id]){
    users[id] = {
      balance: 500,
      deposited: 0,
      invested: 0,
      plan: 0,
      start: null,
      referredBy: null,
      referrals: 0,
      referralEarnings: 0
    };
  }
  return users[id];
}

// 🚫 FORCE JOIN (FIXED)
async function checkJoin(ctx){
  try{
    let ch = await ctx.telegram.getChatMember(CHANNEL, ctx.from.id);
    let gr = await ctx.telegram.getChatMember(GROUP, ctx.from.id);

    if(["left","kicked"].includes(ch.status) || ["left","kicked"].includes(gr.status)){
      ctx.reply(`🚫 Join first:

Channel: https://t.me/${CHANNEL.replace("@","")}
Group: https://t.me/${GROUP.replace("@","")}`);
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
    refUser.referrals++;

    bot.telegram.sendMessage(ref, "🎉 New referral joined!");
  }

  ctx.reply("💰 Welcome to Prime Vest Global\n🎁 ₦500 bonus added!", menu);
});

// 💳 DEPOSIT MENU
bot.hears("💳 Deposit", async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  ctx.reply("💳 Choose Deposit Amount:", Markup.inlineKeyboard([
    [Markup.button.callback("₦3000","dep_3000"),Markup.button.callback("₦5000","dep_5000")],
    [Markup.button.callback("₦10000","dep_10000"),Markup.button.callback("₦15000","dep_15000")],
    [Markup.button.callback("₦20000","dep_20000"),Markup.button.callback("₦25000","dep_25000")],
    [Markup.button.callback("₦40000","dep_40000"),Markup.button.callback("₦50000","dep_50000")],
    [Markup.button.callback("💰 Custom Amount","dep_custom")]
  ]));
});

// 💳 SELECT DEPOSIT
bot.action(/dep_(.+)/, async (ctx)=>{
  await ctx.answerCbQuery(); // ✅ FIX

  let amount = ctx.match[1];

  if(amount === "custom"){
    customDeposit[ctx.from.id] = true;
    return ctx.reply("💰 Enter amount:");
  }

  pendingDeposits[ctx.from.id] = parseInt(amount);

  ctx.reply(`💳 Deposit ₦${amount}

Bank: Moniepoint MFB
Account: 5075903950
Name: Kamsi Chosen Oragwam

📸 Send screenshot after payment`);
});

// 💰 CUSTOM AMOUNT INPUT
bot.on("text", (ctx)=>{
  if(customDeposit[ctx.from.id]){
    let amt = parseInt(ctx.message.text);

    if(isNaN(amt) || amt < 3000){
      return ctx.reply("❌ Minimum deposit is ₦3000");
    }

    pendingDeposits[ctx.from.id] = amt;
    delete customDeposit[ctx.from.id];

    ctx.reply(`💳 Deposit ₦${amt}

Send screenshot after payment.`);
  }
});

// 📸 HANDLE SCREENSHOT
bot.on("photo", async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  let id = ctx.from.id;

  if(!pendingDeposits[id]){
    return ctx.reply("❌ Select deposit amount first");
  }

  let amount = pendingDeposits[id];
  let file = ctx.message.photo.pop().file_id;

  bot.telegram.sendPhoto(ADMIN_ID, file, {
    caption:`📥 Deposit Request

User: ${id}
Amount: ₦${amount}

Approve:
/approve_${id}`
  });

  ctx.reply("⏳ Waiting for approval...");
});

// ✅ APPROVE
bot.command(/approve_(.+)/, (ctx)=>{
  if(ctx.from.id != ADMIN_ID) return;

  let id = ctx.match[1];
  let user = getUser(id);
  let amount = pendingDeposits[id] || 0;

  user.balance += amount;
  user.deposited += amount;

  delete pendingDeposits[id];

  bot.telegram.sendMessage(id, `✅ Deposit approved! ₦${amount} added`);
  ctx.reply("Approved ✅");
});

// 📊 INVEST MENU
bot.hears(["💼 Invest","📊 Packages"], async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  ctx.reply("📊 Choose Package:", Markup.inlineKeyboard(
    packages.map(p => [Markup.button.callback(`₦${p}`, `invest_${p}`)])
  ));
});

// 💼 INVEST
bot.action(/invest_(.+)/, async (ctx)=>{
  await ctx.answerCbQuery();

  let amount = parseInt(ctx.match[1]);
  let user = getUser(ctx.from.id);

  if(amount < 3000){
    return ctx.reply("❌ Minimum invest is ₦3000");
  }

  if(user.balance < amount){
    return ctx.reply("❌ Insufficient balance");
  }

  user.balance -= amount;
  user.invested = amount;
  user.plan = amount;
  user.start = Date.now();

  // REFERRAL BONUS
  if(user.referredBy){
    let refUser = getUser(user.referredBy);
    let bonus = amount * 0.18;

    refUser.balance += bonus;
    refUser.referralEarnings += bonus;

    bot.telegram.sendMessage(user.referredBy,
      `🎉 You earned ₦${bonus} from referral!`
    );
  }

  ctx.reply(`✅ Investment Activated!

💰 ₦${amount}
📈 Daily: ₦${amount * 0.25}
⏳ 60 Days`);
});

// 💰 BALANCE
bot.hears("💰 Balance", async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  let u = getUser(ctx.from.id);

  let days = 0;
  let earned = 0;

  if(u.start){
    days = Math.floor((Date.now()-u.start)/(1000*60*60*24));
    if(days > 60) days = 60;

    earned = u.plan * 0.25 * days;
  }

  ctx.reply(`💰 Balance: ₦${u.balance}

📊 Invested: ₦${u.invested}
📈 Earned: ₦${earned}
⏳ ${days}/60 days`);
});

// 📤 WITHDRAW
bot.hears("📤 Withdraw", async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  let u = getUser(ctx.from.id);

  if(u.deposited <= 0){
    return ctx.reply("⚠️ Deposit first");
  }

  if(u.invested < 3000){
    return ctx.reply("⚠️ Minimum invest is ₦3000");
  }

  if(u.balance < 500){
    return ctx.reply("❌ Minimum withdraw is ₦500");
  }

  let charge = u.balance * 0.10;
  let final = u.balance - charge;

  u.balance = 0;

  ctx.reply(`💸 Withdrawal Successful

Charge: ₦${charge}
You received: ₦${final}`);
});

// 👥 REFERRAL
bot.hears("👥 Referral", async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  let user = getUser(ctx.from.id);

  ctx.reply(`👥 REFERRAL SYSTEM

Earn 18% bonus

🔗 Link:
https://t.me/${BOT_USERNAME}?start=${ctx.from.id}

👤 ${user.referrals}
💰 ₦${user.referralEarnings}`);
});

// 📜 HISTORY
bot.hears("📜 History", (ctx)=>{
  ctx.reply("📜 No history yet (upgrade DB later)");
});

// 🚀 START BOT
bot.launch();
console.log("Bot running...");      

const { Telegraf, Markup } = require("telegraf");
const bot = new Telegraf(process.env.TOKEN);

// 🔐 CONFIG
const ADMIN_ID = process.env.ADMIN_ID;
const CHANNEL = "@starfordfreenumbers"; // change
const GROUP = "@KIfMXtf1_AU2MWJk"; // change
const BOT_USERNAME = "@Primevestglobal_bot"; // change

// 📦 PACKAGES
const packages = [
  3000, 5000, 10000, 15000,
  20000, 25000, 40000, 50000
];

// 🧠 MEMORY DB
let users = {};
let pendingDeposits = {};

// 👤 GET USER
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

// 🚫 FORCE JOIN
async function checkJoin(ctx){
  try{
    let ch = await ctx.telegram.getChatMember(CHANNEL, ctx.from.id);
    let gr = await ctx.telegram.getChatMember(GROUP, ctx.from.id);

    if(ch.status === "left" || gr.status === "left"){
      ctx.reply(`🚫 You must join first:

Channel: ${CHANNEL}
Group: ${GROUP}`);
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
      ["👥 Referral","📊 Packages"]
    ],
    resize_keyboard:true
  }
};

// 🚀 START + REFERRAL
bot.start(async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  let user = getUser(ctx.from.id);

  let ref = ctx.message.text.split(" ")[1];

  if(ref && ref != ctx.from.id && !user.referredBy){
    user.referredBy = ref;

    let refUser = getUser(ref);
    refUser.referrals += 1;

    bot.telegram.sendMessage(ref, "🎉 You got a new referral!");
  }

  ctx.reply("💰 Welcome to Prime Vest Global\n🎁 ₦500 bonus added!", menu);
});

// 💳 DEPOSIT
bot.hears("💳 Deposit", async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  ctx.reply(`💳 Deposit Details:

Bank: Moniepoint MFB
Account Number: 5075903950
Account Name: Kamsi Chosen Oragwam

📸 Send payment screenshot after transfer.`);
});

// 📸 HANDLE SCREENSHOT
bot.on("photo", async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  let id = ctx.from.id;
  let file = ctx.message.photo.pop().file_id;

  pendingDeposits[id] = true;

  bot.telegram.sendPhoto(ADMIN_ID, file, {
    caption:`📥 Deposit Request

User ID: ${id}

Approve:
/approve_${id}`
  });

  ctx.reply("⏳ Waiting for admin approval...");
});

// ✅ ADMIN APPROVE
bot.command(/approve_(.+)/, (ctx)=>{
  if(ctx.from.id != ADMIN_ID) return;

  let id = ctx.match[1];
  let user = getUser(id);

  user.balance += 5000;
  user.deposited += 5000;

  bot.telegram.sendMessage(id, "✅ Deposit approved! ₦5000 added.");
  ctx.reply("Approved ✅");
});

// 📊 PACKAGE BUTTONS
bot.hears(["💼 Invest","📊 Packages"], async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  ctx.reply("📊 Choose Investment Package:", Markup.inlineKeyboard(
    packages.map(p => [Markup.button.callback(`₦${p}`, `invest_${p}`)])
  ));
});

// 💼 INVEST
bot.action(/invest_(.+)/, async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  let amount = parseInt(ctx.match[1]);
  let user = getUser(ctx.from.id);

  if(user.balance < amount){
    return ctx.reply("❌ Insufficient balance");
  }

  user.balance -= amount;
  user.invested = amount;
  user.plan = amount;
  user.start = Date.now();

  // 🎁 REFERRAL BONUS (18%)
  if(user.referredBy){
    let refUser = getUser(user.referredBy);

    let bonus = amount * 0.18;
    refUser.balance += bonus;
    refUser.referralEarnings += bonus;

    bot.telegram.sendMessage(user.referredBy,
      `🎉 You earned ₦${bonus} from referral investment!`
    );
  }

  ctx.reply(`✅ Investment Activated!

💰 Amount: ₦${amount}
📈 Daily Profit: ₦${amount * 0.25}
⏳ Duration: 60 Days
💵 Total Return: ₦${amount * 0.25 * 60}`);
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
⏳ Days: ${days}/60`);
});

// 📤 WITHDRAW
bot.hears("📤 Withdraw", async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  let u = getUser(ctx.from.id);

  if(u.deposited <= 0){
    return ctx.reply("⚠️ You must deposit first");
  }

  if(u.invested <= 0){
    return ctx.reply("⚠️ You must invest first");
  }

  if(u.balance < 500){
    return ctx.reply("❌ Minimum withdrawal is ₦500");
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

Earn 18% from every referral investment!

🔗 Your Link:
https://t.me/${BOT_USERNAME}?start=${ctx.from.id}

👤 Referrals: ${user.referrals}
💰 Earnings: ₦${user.referralEarnings}`);
});

// 🚀 START BOT
bot.launch();
console.log("Bot running...");

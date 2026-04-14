const { Telegraf, Markup } = require("telegraf");
const express = require("express");

const TOKEN = process.env.TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

// 🔥 MUST EDIT THESE
const CHANNEL = "@starfordfreenumbers";
const GROUP = "@primevestglobalinvestments";

if (!TOKEN) {
  console.error("❌ TOKEN missing");
  process.exit(1);
}

const bot = new Telegraf(TOKEN);

// 🌐 KEEP ALIVE (Render fix)
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// 📦 PACKAGES
const packages = [3000,5000,10000,15000,20000,25000,40000,50000];

// 🧠 DATABASE
let users = {};
let pendingDeposits = {};

// 👤 USER
function getUser(id){
  if(!users[id]){
    users[id] = {
      balance: 500,
      deposited: 0,
      invested: 0,
      plan: 0,
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
      await ctx.reply(
        `🚫 You must join first:\n${CHANNEL}\n${GROUP}`
      );
      return false;
    }
    return true;
  }catch{
    return true;
  }
}

// 📊 MENU
const mainMenu = Markup.keyboard([
  ["💼 Invest","💰 Balance"],
  ["📤 Withdraw","💳 Deposit"],
  ["📜 History"]
]).resize();

// 🔙 BACK BUTTON
const backBtn = Markup.keyboard([["⬅️ Back"]]).resize();

// 🚀 START
bot.start(async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  getUser(ctx.from.id);

  ctx.reply(
    "💰 Welcome to Prime Vest Global\n🎁 ₦500 bonus added!",
    mainMenu
  );
});

// 🔙 BACK
bot.hears("⬅️ Back", (ctx)=>{
  ctx.reply("🏠 Main Menu", mainMenu);
});

// 💳 DEPOSIT MENU
bot.hears("💳 Deposit", async (ctx)=>{
  if(!(await checkJoin(ctx))) return;

  const rows = [];
  for(let i=0;i<packages.length;i+=2){
    rows.push([
      Markup.button.callback(`₦${packages[i]}`, `dep_${packages[i]}`),
      packages[i+1] ? Markup.button.callback(`₦${packages[i+1]}`, `dep_${packages[i+1]}`) : null
    ].filter(Boolean));
  }

  ctx.reply(
    "💳 Choose Deposit Amount:",
    Markup.inlineKeyboard([
      ...rows,
      [Markup.button.callback("💰 Custom","dep_custom")]
    ])
  );
});

// 💳 CLICK DEPOSIT
bot.action(/dep_(.+)/, async (ctx)=>{
  await ctx.answerCbQuery();

  let val = ctx.match[1];

  if(val === "custom"){
    pendingDeposits[ctx.from.id] = "custom";
    return ctx.reply("💰 Enter amount:", backBtn);
  }

  pendingDeposits[ctx.from.id] = parseInt(val);

  ctx.reply(
`💳 Deposit ₦${val}

Bank: Moniepoint MFB
Account Number: 5075903950
Account Name: Kamsi Chosen Oragwam

📸 Send screenshot after payment.`,
  backBtn
  );
});

// 💰 CUSTOM INPUT
bot.on("text", (ctx)=>{
  if(pendingDeposits[ctx.from.id] === "custom"){
    let amt = parseInt(ctx.message.text);

    if(isNaN(amt)){
      return ctx.reply("❌ Enter valid amount");
    }

    pendingDeposits[ctx.from.id] = amt;

    ctx.reply(
`💳 Deposit ₦${amt}

Send screenshot after payment.`,
    backBtn
    );
  }
});

// 📸 SCREENSHOT
bot.on("photo", async (ctx)=>{
  let id = ctx.from.id;
  let amount = pendingDeposits[id];

  if(!amount){
    return ctx.reply("❌ No deposit selected");
  }

  let file = ctx.message.photo.pop().file_id;

  await bot.telegram.sendPhoto(ADMIN_ID, file, {
    caption: `📥 Deposit Request\nUser: ${id}\nAmount: ₦${amount}\n/approve_${id}_${amount}`
  });

  ctx.reply("⏳ Waiting for approval...");
});

// ✅ APPROVE
bot.command(/approve_(.+)_(.+)/, (ctx)=>{
  if(String(ctx.from.id) !== String(ADMIN_ID)) return;

  let id = ctx.match[1];
  let amount = parseInt(ctx.match[2]);

  let user = getUser(id);

  user.balance += amount;
  user.deposited += amount;

  bot.telegram.sendMessage(id, `✅ Deposit Approved ₦${amount}`);
  ctx.reply("✅ Approved");
});

// 💼 INVEST
bot.hears("💼 Invest", (ctx)=>{
  ctx.reply(
    "📊 Choose Plan:",
    Markup.inlineKeyboard([
      [Markup.button.callback("₦3000","inv_3000")],
      [Markup.button.callback("₦5000","inv_5000")],
      [Markup.button.callback("₦10000","inv_10000")]
    ])
  );
});

bot.action(/inv_(.+)/, async (ctx)=>{
  await ctx.answerCbQuery();

  let amount = parseInt(ctx.match[1]);
  let user = getUser(ctx.from.id);

  if(amount < 3000) return ctx.reply("❌ Min invest ₦3000");
  if(user.balance < amount) return ctx.reply("❌ Insufficient balance");

  user.balance -= amount;
  user.invested += amount;
  user.plan = amount;
  user.start = Date.now();

  ctx.reply(`✅ Investment Started ₦${amount}`);
});

// 💰 BALANCE
bot.hears("💰 Balance", (ctx)=>{
  let u = getUser(ctx.from.id);

  let days = 0;
  let profit = 0;

  if(u.start){
    days = Math.floor((Date.now()-u.start)/(1000*60*60*24));
    if(days > 60) days = 60;
    profit = u.plan * 0.25 * days;
  }

  ctx.reply(`💰 Balance: ₦${u.balance}\n📈 Profit: ₦${profit}`);
});

// 📤 WITHDRAW
bot.hears("📤 Withdraw", (ctx)=>{
  let u = getUser(ctx.from.id);

  if(u.deposited <= 0) return ctx.reply("⚠️ Deposit first");
  if(u.invested < 3000) return ctx.reply("⚠️ Invest first");
  if(u.balance < 500) return ctx.reply("❌ Min withdraw ₦500");

  let charge = u.balance * 0.1;
  let final = u.balance - charge;

  u.balance = 0;

  ctx.reply(`💸 Withdrawal\nCharge: ₦${charge}\nYou get: ₦${final}`);
});

// 📜 HISTORY
bot.hears("📜 History", (ctx)=>{
  let u = getUser(ctx.from.id);

  ctx.reply(
`📜 History

Balance: ₦${u.balance}
Deposited: ₦${u.deposited}
Invested: ₦${u.invested}`
  );
});

// 🚀 START BOT
bot.launch();
console.log("✅ Bot running");

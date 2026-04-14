const { Telegraf, Markup } = require("telegraf");
const express = require("express");

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

// 🌐 KEEP RENDER ALIVE (Render deployment fix)
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000, () => {
  console.log("🌍 Web server running...");
});

// 🔗 FORCE JOIN LINKS (PUT YOUR REAL USERNAME)
const CHANNEL = "@starfordfreenumbers";
const GROUP = "@Primevestglobalinvestments";

// 📦 PACKAGES
const packages = [3000, 5000, 10000, 15000, 20000, 25000, 40000, 50000];

// 🧠 DATABASE (memory)
let users = {};
let pendingDeposits = {};

// 👤 GET USER
function getUser(id) {
  if (!users[id]) {
    users[id] = {
      balance: 500,
      deposited: 0,
      invested: 0,
      plan: null,
      start: null,
    };
  }
  return users[id];
}

// 🚫 FORCE JOIN
async function checkJoin(ctx) {
  try {
    let ch = await ctx.telegram.getChatMember(CHANNEL, ctx.from.id);
    let gr = await ctx.telegram.getChatMember(GROUP, ctx.from.id);

    if (ch.status === "left" || gr.status === "left") {
      await ctx.reply(
        `🚫 You must join first:\n${CHANNEL}\n${GROUP}`,
        Markup.inlineKeyboard([
          [Markup.button.url("📢 Join Channel", `https://t.me/${CHANNEL.replace("@", "")}`)],
          [Markup.button.url("👥 Join Group", `https://t.me/${GROUP.replace("@", "")}`)],
        ])
      );
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

// 📊 MAIN MENU
const menu = Markup.keyboard([
  ["💼 Invest", "💰 Balance"],
  ["📤 Withdraw", "💳 Deposit"],
  ["👥 Referral", "📊 Packages"],
  ["📜 History"],
]).resize();

// 🔙 BACK BUTTON
const backBtn = Markup.keyboard([["🔙 Back"]]).resize();

// 🚀 START
bot.start(async (ctx) => {
  if (!(await checkJoin(ctx))) return;

  getUser(ctx.from.id);
  ctx.reply("💰 Welcome to Prime Vest Global\n🎁 ₦500 bonus added!", menu);
});

// 🔙 BACK TO MENU
bot.hears("🔙 Back", (ctx) => {
  ctx.reply("🏠 Main Menu", menu);
});

// 💳 DEPOSIT
bot.hears("💳 Deposit", async (ctx) => {
  if (!(await checkJoin(ctx))) return;

  const rows = [];
  for (let i = 0; i < packages.length; i += 2) {
    rows.push([
      Markup.button.callback(`₦${packages[i]}`, `deposit_${packages[i]}`),
      packages[i + 1] ? Markup.button.callback(`₦${packages[i + 1]}`, `deposit_${packages[i + 1]}`) : null,
    ].filter(Boolean));
  }

  ctx.reply(
    "💳 Choose Deposit Amount:",
    Markup.inlineKeyboard([
      ...rows,
      [Markup.button.callback("💰 Custom Amount", "deposit_custom")],
    ])
  );
});

// 💳 HANDLE DEPOSIT
bot.action(/deposit_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();

  let amount = ctx.match[1];

  if (amount === "custom") {
    pendingDeposits[ctx.from.id] = "custom";
    return ctx.reply("💰 Enter amount:", backBtn);
  }

  pendingDeposits[ctx.from.id] = parseInt(amount);

  ctx.reply(
    `💳 Deposit ₦${amount}

Bank: Moniepoint MFB
Account Number: 5075903950
Account Name: Kamsi Chosen Oragwam

📸 Send screenshot after payment.`,
    backBtn
  );
});

// 💰 CUSTOM AMOUNT
bot.on("text", (ctx) => {
  if (pendingDeposits[ctx.from.id] === "custom") {
    let amt = parseInt(ctx.message.text);

    if (isNaN(amt)) return ctx.reply("❌ Enter valid amount");

    pendingDeposits[ctx.from.id] = amt;

    ctx.reply(`💳 Deposit ₦${amt}\nSend screenshot after payment.`, backBtn);
  }
});

// 📸 SCREENSHOT UPLOAD
bot.on("photo", async (ctx) => {
  let id = ctx.from.id;
  let amount = pendingDeposits[id];

  if (!amount) return ctx.reply("❌ Choose deposit first");

  let file = ctx.message.photo.pop().file_id;

  await bot.telegram.sendPhoto(ADMIN_ID, file, {
    caption: `📥 Deposit Request\nUser: ${id}\nAmount: ₦${amount}\nApprove:\n/approve_${id}_${amount}`,
  });

  ctx.reply("⏳ Waiting for approval...");
});

// ✅ APPROVE
bot.command(/approve_(.+)_(.+)/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  let id = ctx.match[1];
  let amount = parseInt(ctx.match[2]);

  let user = getUser(id);

  user.balance += amount;
  user.deposited += amount;

  bot.telegram.sendMessage(id, `✅ Deposit approved ₦${amount}`);
  ctx.reply("Approved ✅");
});

// 📊 INVEST MENU
bot.hears(["💼 Invest", "📊 Packages"], async (ctx) => {
  if (!(await checkJoin(ctx))) return;

  const rows = [];
  for (let i = 0; i < packages.length; i += 2) {
    rows.push([
      Markup.button.callback(`₦${packages[i]}`, `invest_${packages[i]}`),
      packages[i + 1] ? Markup.button.callback(`₦${packages[i + 1]}`, `invest_${packages[i + 1]}`) : null,
    ].filter(Boolean));
  }

  ctx.reply("📊 Choose Package:", Markup.inlineKeyboard(rows));
});

// 💼 INVEST
bot.action(/invest_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();

  let amount = parseInt(ctx.match[1]);
  let user = getUser(ctx.from.id);

  if (amount < 3000) return ctx.reply("❌ Min invest ₦3000");
  if (user.balance < amount) return ctx.reply("❌ Insufficient balance");

  user.balance -= amount;
  user.invested = amount;
  user.plan = amount;
  user.start = Date.now();

  ctx.reply(`✅ Investment Started\n💰 ₦${amount}\n📈 Daily Profit: ₦${amount * 0.25}`);
});

// 💰 BALANCE
bot.hears("💰 Balance", async (ctx) => {
  if (!(await checkJoin(ctx))) return;

  let u = getUser(ctx.from.id);

  let days = 0;
  let earned = 0;

  if (u.start) {
    days = Math.floor((Date.now() - u.start) / (1000 * 60 * 60 * 24));
    if (days > 60) days = 60;
    earned = u.plan * 0.25 * days;
  }

  ctx.reply(`💰 Balance: ₦${u.balance}\n📈 Earned: ₦${earned}`);
});

// 📤 WITHDRAW
bot.hears("📤 Withdraw", async (ctx) => {
  if (!(await checkJoin(ctx))) return;

  let u = getUser(ctx.from.id);

  if (u.deposited <= 0) return ctx.reply("⚠️ Deposit first");
  if (u.invested < 3000) return ctx.reply("⚠️ Invest first");
  if (u.balance < 500) return ctx.reply("❌ Min withdrawal ₦500");

  let charge = u.balance * 0.10;
  let final = u.balance - charge;

  u.balance = 0;

  ctx.reply(`💸 Withdrawal\nCharge: ₦${charge}\nYou receive: ₦${final}`);
});

// 📜 HISTORY
bot.hears("📜 History", async (ctx) => {
  if (!(await checkJoin(ctx))) return;

  let u = getUser(ctx.from.id);

  ctx.reply(
    `📜 Account Summary\n💰 Balance: ₦${u.balance}\n📊 Invested: ₦${u.invested}\n💳 Deposited: ₦${u.deposited}`
  );
});

// 🚀 START BOT
bot.launch();
console.log("🤖 Bot running...");

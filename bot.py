const TelegramBot = require('node-telegram-bot-api');

const token = 'YOUR_BOT_TOKEN_HERE';
const bot = new TelegramBot(token, { polling: true });

let users = {};

bot.onText(/\/start/, (msg) => {
    const id = msg.chat.id;
    users[id] = { balance: 0 };

    bot.sendMessage(id, `💰 Welcome to Prime Vest Bot

Commands:
/deposit
/withdraw
/balance`);
});

bot.onText(/\/deposit/, (msg) => {
    const id = msg.chat.id;
    users[id].balance += 1000;

    bot.sendMessage(id, `✅ Deposit successful!
Balance: ₦${users[id].balance}`);
});

bot.onText(/\/withdraw/, (msg) => {
    const id = msg.chat.id;

    if (users[id].balance < 1000) {
        bot.sendMessage(id, "❌ You must deposit first!");
        return;
    }

    users[id].balance -= 500;

    bot.sendMessage(id, `💸 Withdrawal processed!
Balance: ₦${users[id].balance}`);
});

bot.onText(/\/balance/, (msg) => {
    const id = msg.chat.id;
    bot.sendMessage(id, `💰 Balance: ₦${users[id].balance}`);
});

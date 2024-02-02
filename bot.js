const keep_alive = require('./keep_alive.js')
const TelegramBot = require('node-telegram-bot-api');
const fs= require('fs');

const token = process.env.TOKEN;
const bot = new TelegramBot(token, {polling: true});
// Écoutez l'événement 'new_chat_members' pour détecter les nouveaux membres
bot.on("new_chat_members", (msg) => {
    const chatId = msg.chat.id;
    const newMember = msg.new_chat_member;

    // Votre message d'introduction
    const introductionMessage = `Bienvenue, ${newMember.first_name}! Nous sommes ravis de vous avoir parmi nous dans ce groupe. Écrivez le nom d'un film, et le BOT vous retournera le lien et la note du film basés sur le site de cinemadourg.free.fr.`;

    // Envoyez le message d'introduction
    bot.sendMessage(chatId, introductionMessage);
});

bot.on("message", (msg) => {
    const rawData = fs.readFileSync("moviesData.json", "utf8");
    const movies = JSON.parse(rawData.toString());

    const chatId = msg.chat.id;
    const userText = msg.text.toLowerCase();

    // Cherchez dans le fichier JSON pour trouver un titre correspondant
    const foundMovies = Object.values(movies).filter(
        (movie) => movie.title && movie.title.toLowerCase().includes(userText),
    );

    if (foundMovies.length > 0) {
        // Si des films sont trouvés, envoyez leurs détails
        foundMovies.forEach((movie) => {
            const formatLinkMarkdown = `🔗 Link : [${movie.title}](${movie.link})`;
            const reply = `${formatLinkMarkdown}\n⭐️ Rating : ${movie.rating}`;
            bot.sendMessage(chatId, reply, {
                parse_mode: "Markdown",
                disable_web_page_preview: true,
            });
        });
    } else {
        // Si aucun film n'est trouvé, envoyez un message de non-trouvaille
        bot.sendMessage(chatId, "Désolé, aucun film correspondant trouvé.");
    }
});

// Démarrage du bot
bot.on("polling_error", (error) => {
    console.error(error);
});

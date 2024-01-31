const TelegramBot = require('node-telegram-bot-api');
const fs= require('fs');

const token = '';
const bot = new TelegramBot(token, {polling: true});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Votre message de bienvenue lorsque quelqu'un clique sur 'Start'
    const welcomeMessage = "Bienvenue, Nous sommes ravis de vous avoir parmi nous dans ce groupe. Écrivez le nom d'un film, et le BOT vous retournera le lien et la note du film basés sur le site de cinemadourg.free.fr.";

    // Envoyez le message de bienvenue
    bot.sendMessage(chatId, welcomeMessage);
});

// Écoutez l'événement 'new_chat_members' pour détecter les nouveaux membres
bot.on('new_chat_members', (msg) => {
    const chatId = msg.chat.id;
    const newMember = msg.new_chat_member;

    // Votre message d'introduction
    const introductionMessage = `Bienvenue, ${newMember.first_name}! Nous sommes ravis de vous avoir parmi nous dans ce groupe. Écrivez le nom d'un film, et le BOT vous retournera le lien et la note du film basés sur le site de cinemadourg.free.fr.`;

    // Envoyez le message d'introduction
    bot.sendMessage(chatId, introductionMessage);
});

bot.on('message', (msg) => {
    const rawData = fs.readFileSync('moviesData.json', 'utf8');
    const movies = JSON.parse(rawData.toString());

    const chatId = msg.chat.id;
    const userText = msg.text.toLowerCase();

    // Cherchez dans le fichier JSON pour trouver un titre correspondant
    const foundMovies = Object.values(movies).filter(movie =>
        movie.title && movie.title.toLowerCase().includes(userText)
    );

    if (foundMovies.length > 0) {
        // Si des films sont trouvés, envoyez leurs détails
        foundMovies.forEach(movie => {
            const formatLinkMarkdown = `🔗 Link : [${movie.title}](${movie.link})`;
            const reply = `${formatLinkMarkdown}\n⭐️ Rating : ${movie.rating}`;
            bot.sendMessage(chatId, reply, {parse_mode: 'Markdown', disable_web_page_preview: true});
        });
    } else {
        // Si aucun film n'est trouvé, envoyez un message de non-trouvaille
        bot.sendMessage(chatId, "Désolé, aucun film correspondant trouvé.");
    }
});

// Définissez le clavier personnalisé avec un bouton
const keyboard = {
    reply_markup: {
        keyboard: [
            ['Mon Bouton'],
            ['Un autre bouton']
        ],
        resize_keyboard: true, // Permet au clavier de se réduire après avoir appuyé sur un bouton
        one_time_keyboard: false // Le clavier reste visible après avoir appuyé sur un bouton
    }
};

// Écoutez un événement ou une commande pour envoyer le clavier personnalisé
bot.onText(/\/startkeyboard/, (msg) => {
    const chatId = msg.chat.id;
    const message = 'Appuyez sur un bouton :';

    // Envoyez le message avec le clavier personnalisé
    bot.sendMessage(chatId, message, keyboard);
});

// Écoutez l'appui sur un bouton du clavier personnalisé
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Vérifiez quel bouton a été appuyé
    if (text === 'Mon Bouton') {
        bot.sendMessage(chatId, 'Vous avez appuyé sur le bouton "Mon Bouton".');
    } else if (text === 'Un autre bouton') {
        bot.sendMessage(chatId, 'Vous avez appuyé sur le bouton "Un autre bouton".');
    }
});

// Démarrage du bot
bot.on('polling_error', (error) => {
    console.error(error);
});

// Envoyez le clavier personnalisé dès que le bot démarre
bot.on('polling', () => {
    const chatId = 'ID_DU_CHAT'; // Remplacez par l'ID du chat où vous souhaitez afficher le clavier
    const message = 'Appuyez sur un bouton :';

    // Envoyez le message avec le clavier personnalisé
    bot.sendMessage(chatId, message, keyboard);
});

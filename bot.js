const keep_alive = require('./keep_alive.js')
const TelegramBot = require('node-telegram-bot-api');
const fs= require('fs');
const cheerio = require("cheerio");
const axios = require("axios");

const url = process.env.url;
let moviesData = {};

const token = process.env.TOKEN;
const bot = new TelegramBot(token, {polling: true});

bot.on("new_chat_members", (msg) => {
    const chatId = msg.chat.id;
    const newMember = msg.new_chat_member;

    // Votre message d'introduction
    const introductionMessage = `Bienvenue, ${newMember.first_name}! Nous sommes ravis de vous avoir parmi nous dans ce groupe. Écrivez le nom d'un film, et le BOT vous retournera le lien et la note du film basés sur le site de cinemadourg.free.fr.`;

    // Envoyez le message d'introduction
    bot.sendMessage(chatId, introductionMessage);
});

bot.onText(/\/update/, (msg) => {
    const chatId = msg.chat.id;
    getHTML().then(res => {
        const $ = cheerio.load(res);
        $('table tr').each((i, elem) => {
            const title = $(elem).find('td:first-child a').text();
            let link = $(elem).find('td:first-child a').attr('href');
            const rating = $(elem).find('td:nth-child(2) .Style24').text();
            // Encoder l'URL contenue dans la variable link
            if (link) {
                link = encodeURI(link);
            }
            moviesData[i] = {
                title,
                link,
                rating
            }
        })
        fs.writeFile('moviesData.json', JSON.stringify(moviesData), (err) => {
            if (err) throw err;
            console.log("JSON file has been saved.");
        });
    })
    const response = "La mise à jour a été effectuée.";
    bot.sendMessage(chatId, response);
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

    if (userText.length >= 4) {
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
    } else {
        // Si le texte de l'utilisateur est trop court, envoyez un message d'erreur
        bot.sendMessage(chatId, "Veuillez entrer un titre avec plus de 4 caractères.");
    }

});

// Démarrage du bot
bot.on("polling_error", (error) => {
    console.error(error);
});

async function getHTML() {
    const  { data } = await axios.get(url);
    return data;
}

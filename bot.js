const keep_alive = require('./keep_alive.js')
const TelegramBot = require('node-telegram-bot-api');
const fs= require('fs');
const cheerio = require("cheerio");
const axios = require("axios");
const iconv = require('iconv-lite');

const url = process.env.url;
const token = process.env.TOKEN;
const bot = new TelegramBot(token, {polling: true});
let moviesData = {};

bot.on("new_chat_members", (msg) => {
    const chatId = msg.chat.id;
    const newMember = msg.new_chat_member;
    const introductionMessage = `Bienvenue, ${newMember.first_name}! Nous sommes ravis de vous avoir parmi nous dans ce groupe. Écrivez le nom d'un film, et le BOT vous retournera le lien et la note du film basés sur le site de cinemadourg.free.fr.`;
    bot.sendMessage(chatId, introductionMessage);
});

bot.onText(/\/update/, (msg) => {
    const chatId = msg.chat.id;
    update().then(r => console.log("Mise à jour effectuée")).catch(e => console.error(e));
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
                const reply = `
                    🔗 Lien Dourg : [${movie.title}](${movie.link})\n
                    ⭐️ Rating : ${movie.rating}\n
                    📅 Date de sortie : ${movie.releaseDate}
                    🎥 AlloCiné : [Lien AlloCiné](${movie.urlAlloCine})
                `;
                bot.sendMessage(chatId, reply, {
                    parse_mode: "Markdown",
                    disable_web_page_preview: true,
                });
            });
        } else {
            bot.sendMessage(chatId, "Désolé, aucun film correspondant trouvé.");
        }
    } else {
        bot.sendMessage(chatId, "Veuillez entrer un titre avec plus de 4 caractères.");
    }

});

bot.on("polling_error", (error) => {
    console.error(error);
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function getHTML(url) {
    const { data } = await axios.get(url);
    return data;
}
async function getDetailsMoviesHTML(urlMovieDourg, retries = 3) {
    try {
        const response = await axios({
            method: 'get',
            url: urlMovieDourg,
            responseType: 'arraybuffer'
        });
        const decodedData = iconv.decode(response.data, 'ISO-8859-1');
        return cheerio.load(decodedData);
    } catch (error) {
        console.error(`Error fetching details for ${urlMovieDourg}: ${error}`);
        if (retries > 0) {
            console.log(`Retrying... (${retries} retries left)`);
            await sleep(15000); // Attendre 5 secondes avant de réessayer
            return getDetailsMoviesHTML(urlMovieDourg, retries - 1);
        } else {
            throw error; // Toutes les tentatives ont échoué, transmettre l'erreur
        }
    }
}
async function update() {
    const res = await getHTML(url);
    const $ = cheerio.load(res);

    const elements = $('table tr').toArray(); // Convertir les éléments en tableau pour une itération classique

    for (let i = 0; i < elements.length; i++) {
        const elem = elements[i];
        const title = $(elem).find('td:first-child a').text();
        let link = $(elem).find('td:first-child a').attr('href');
        const rating = $(elem).find('td:nth-child(2) .Style24').text();
        if (link && (link.startsWith('http://') || link.startsWith('https://'))) {
            link = encodeURI(link);
            if (title.trim()) { // Ignorer les titres vides
                try {
                    moviesData[i] = { title, link, rating };

                    const detailsPage = await getDetailsMoviesHTML(link);

                    const details = {
                        urlAlloCine: detailsPage('tr:first-child td:nth-child(2) a').attr('href'),
                        releaseDate: detailsPage('tr:nth-child(2) td:first-child .Style22').text()
                    };
                    console.log(details); // Afficher les détails pour chaque film (pour le débogage)
                    // Fusion des données
                    moviesData[i] = { ...moviesData[i], ...details };
                } catch (error) {
                    console.error(`Error fetching details for ${link}: ${error}`);
                }
            }
        } else {
            console.log(`Skipping invalid or mailto link: ${link}`);
        }
    }

    // Sauvegarder les données dans un fichier
    fs.writeFile('moviesData.json', JSON.stringify(moviesData, null, 2), (err) => {
        if (err) throw err;
        console.log("JSON file has been saved.");
    });
}

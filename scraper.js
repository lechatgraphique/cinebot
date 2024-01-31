const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const url = 'http://cinemadourg.free.fr/index.php?numlien=tous%20les%20films%20note';
let moviesData = {};

async function getHTML() {
    const  { data } = await axios.get(url);
    return data;
}

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


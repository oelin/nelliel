import { Actor } from 'apify';
import * as cheerio from 'cheerio';
import fetch from 'chiaki';


// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init()

await Actor.init();

// Structure of input is defined in input_schema.json

const {
    batchSize = 20,
    batchNumber = 0,
    filterByChannelCountry = 'united-states',
} = await Actor.getInput() ?? {};


async function download(url) {
    return fetch(url)
        .then(response => response.body.toString())
        .then(response => cheerio.load(response))
}


for (let pageNumberOffset = 0; pageNumberOffset < batchSize; pageNumberOffset ++) {

    let channelLinks;
    let pageNumber;
    let page;

    try {

        pageNumber = pageNumberOffset + (batchSize * batchNumber)
        page = await download(`https://www.stats.video/top/most-viewed/youtube-channels/${filterByChannelCountry}/of-all-time/page/${pageNumber}`)

        console.log(`[INFO] Scraping page ${pageNumber} (${pageNumberOffset}/${batchSize})...`)
        // Obtain the ID for each channel listed. Annoyingly, this has to be obtained from a separate page. This causes significant
        // overhead due to the additional requests.

        channelLinks = [...page('body').find('.channelLink:nth-child(2n+1)')]
            .map(channelLink => channelLink.attribs.href)
    } 

    catch {
        console.log(`[ERROR] Failed to extract channel links from page ${pageNumber} (skipping)...`)
        continue
    }
    

    for (let channelLink of channelLinks) {

        try {
            let channelPage = await download(`https://www.stats.video${channelLink}`)
            let channelID = [...channelPage('body').find('[data-original-title="YouTube Channel\'s ID"]')][0]
                .children[1]
                .data
                .trim()

            Actor.pushData({ channelID })
        } catch {
            console.log(`[ERROR] Failed to aquire channel ID for ${channelLink}`)
        }
    }
}

Actor.exit()
// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit()

await Actor.exit()

//TODO:
//Figure out save states and only refresh after a certain amount of time
//Figure out saving and displaying settings
//Figure out tcgplayer shipping price, ranked shipping price, and seller shipping price
//Deprecate and remove mvb =(
//Figure out the edge case for 7ed and 8ed
//Figure out the edge case for cards with no pricing source stock for a given condition/language/foiling/etc
//Consider whether failing to make an API call should count as 'updating' that card
//Create a unified scryfall api call that chooses between ID and search terms based on which it has


function olderThan (timestamp, milliseconds) {
  return new Date() - (timestamp ? timestamp : 0) > milliseconds
}

function youngerThan (timestamp, milliseconds) {
  return !olderThan(timestamp, milliseconds)
}

var oneHourInMs = 60*60*1000


var count = 1
function updateAllCards(cardsphereDB) {
    processCardsRepeatedly({
      cardsphereDB: cardsphereDB,
      pause: 5000,
      message: 'Scryfall Loop Complete',
      delayMs: 550,
      filter: card =>  olderThan(card.last_updated.scryfall, 24*oneHourInMs) && youngerThan(card.last_updated.cardsphere, 24*oneHourInMs),
      apiCall: card => ScryfallApiCall(card.name, card.setcode, card.traits, card.foil, card.ids.scryfall),
      updateBuilder: data => ({
        ids: {
          cardmarket: data.cardmarket_id,
          tcgplayer: data.tcgplayer_id,
          scryfall: data.id // hopefully this means that if a search succeds it sticks around, but it also means a bad search ends up misbelieving for as long as the save persists
        },
        last_updated: {
          scryfall: new Date()
        },
        urls: {
          scryfall: data.scryfall_uri,
          tcgplayer: data.purchase_uris.tcgplayer
        }
      }),
      onSuccess: (card) => console.log(`${card.name} ${card.set} loaded Scryfall successfully`),
      onError: (err, card) => console.log(`${card.name} ${card.set} failed Scryfall. Error ${err}`)
    })

    // TCGPlayer
    processCardsRepeatedly({
      cardsphereDB: cardsphereDB,
      pause: 1000,
      message: 'TCGPlayer Loop Complete',
      delayMs: 300,
      filter: card => card.ids.tcgplayer != null && olderThan(card.last_updated.tcgplayer, oneHourInMs) && youngerThan(card.last_updated.cardsphere, 24*oneHourInMs),
      apiCall: card => tcgApiCall(card.ids.tcgplayer, card.foil),
      updateBuilder: data => ({
        prices: {
          tcgplayer: data.price
        },
        last_updated: {
          tcgplayer: new Date()
        }
      }),
      onSuccess: (card) => console.log(`${card.name} ${card.set} loaded TCGPlayer successfully`),
      onError: (err, card) => console.log(`${card.name} ${card.set} failed TCGPlayer. Error ${err}`)
    })

}



function multiverseApiCall(cardsphereid) {
  var path = `https://www.multiversebridge.com/api/v1/cards/cs/${cardsphereid}`
  return fetch(path)
  .then(response => {
    if (!response.ok) {
        throw new Error(`HTTP error in Multiverse Bridge! status: ${response.status} path: ${path}`);
    }
    return response.json();
  })
  .then(data => {
    return data
  })
}


//Unified search and ID based scryfall api
function ScryfallApiCall(name, setcode, traits, foil, scryfallid) {
  if (scryfallid != null){
    var path = `https://api.scryfall.com/cards/${scryfallid}`
  }
  else{
    // TODO: Also consider edge cases related to etched nonsense, may need to consider in cardspheresend whether to overwrite foil with an etched string in the case of being etched
    const traitselector = Object.entries(traits).reduce((accumulator, [key, value]) => {
      accumulator += typeof(value) === 'boolean' ? `${value ? ' ' : ' -'}is:${key}` : ` ${key}:${value}`
      return accumulator
    }, '');

    const setString = Array.isArray(setcode) ? `(set:${setcode.join(' or set:')})` : setcode.length > 0 ? `set:${setcode}` : '';
    const foilString = foil ? 'is:foil' : 'is:nonfoil'

    var path = encodeURI(`https://api.scryfall.com/cards/search?q=!"${name}" ${foilString} ${setString}${traitselector} -is:digital &unique=prints`);
  }
  return fetch(path)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error in Scryfall by search terms! status: ${response.status} path: ${path}`);
      }
      return response.json();
    })
    .then(data => {
      if (scryfallid != null){
        return data
      }
      else{
      if (data.total_cards === 1) {
          return data.data[0];
        } else {
          throw new Error(`${name} - ${setcode} returned ${data.total_cards} results from path ${path}`);
        }
      }
    });

}


function tcgApiCall(tcgpid, isFoil) {
  var path = `https://mp-search-api.tcgplayer.com/v1/product/${tcgpid}/listings?mpfev=4528`
  return fetch(path,{
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "aggregations": [
        "listingType"
      ],
      "context": {
        "cart": {},
        "shippingCountry": "US"
      },
      "filters": {
        "exclude": {
          "channelExclusion": 0
        },
        "range": {
          "quantity": {
            "gte": 1
          }
        },
        "term": {
          "channelId": 0,
          "language": [
            "English"
          ],
          "condition": [
            "Near Mint"
          ],
          "printing": [
            isFoil ? 'Foil' : 'Normal'
          ],
          "sellerStatus": "Live"
        }
      },
      "from": 0,
      "size": 10,
      "sort": {
        "field": "price+shipping",
        "order": "asc"
      }
    })
  })
  .then(response => {
    if (!response.ok) {
        throw new Error(`HTTP error in TCG API Call! status: ${response.status}, path${path}`);
    }
    return response.json();
  })
  .then(data => {
    return {path:path, price: data.results[0].results[0].price}
  })
}


function processCardsRepeatedly({
  cardsphereDB,
  pause = 5000,
  message = "test",
  delayMs = 500,
  filter,
  apiCall,
  updateBuilder,
  onSuccess,
  onError
}) {
  processCards({
    cardsphereDB: cardsphereDB,
    delayMs: delayMs,
    filter: filter,
    apiCall: apiCall,
    updateBuilder: updateBuilder,
    onSuccess: onSuccess,
    onError: onError
  }).then(() => {
    return delay(pause).then(() => {
      console.log(message)
    })
  }).then(() => {
    processCardsRepeatedly({
      cardsphereDB: cardsphereDB,
      pause: pause,
      message: message,
      delayMs: delayMs,
      filter: filter,
      apiCall: apiCall,
      updateBuilder: updateBuilder,
      onSuccess: onSuccess,
      onError: onError
    })
  })
}


function processCards({
  cardsphereDB,
  delayMs = 500,
  filter,
  apiCall,
  updateBuilder,
  onSuccess,
  onError
}) {
  return new Promise((resolve, reject) => {
    const tx = cardsphereDB.transaction('cards', 'readonly');
    const store = tx.objectStore('cards');
    const request = store.openCursor();


    let chain = Promise.resolve();

    request.onsuccess = (event) => {
      const cursor = event.target.result;

      if (!cursor) {
        chain.then(resolve).catch(reject);
        return;
      }

      const card = cursor.value;

      if (filter(card)) {
        chain = chain
          .then(() => delay(delayMs))
          .then(() => apiCall(card))
          .then(data =>
            cardUpdater(
              cardsphereDB,
              card,
              updateBuilder(data, card)
            )
          )
          .then(() => onSuccess(card))
          .catch(err => {
            onError(err, card);
            return Promise.resolve(); // swallow
          });
      }

      // 🔑 ALWAYS continue synchronously
      cursor.continue();
    };

    request.onerror = () => reject(request.error);
  });
}


async function cardUpdater(cardsphereDB, originalCard, changedValues) {
  updatedCard = await getCard(cardsphereDB, originalCard.cardsphereid)
  updatedCard = deepMerge(
    structuredClone(updatedCard),
    changedValues
  );
  if (JSON.stringify(updatedCard) !== JSON.stringify(originalCard)) {
    saveCard(cardsphereDB, updatedCard)
  }
  // return getPreference(csid)
  // .then((updatedCard) => {
  //   updatedCard = deepMerge(
  //     structuredClone(updatedCard),
  //     changedValues
  //   );
  //   if (JSON.stringify(updatedCard) !== JSON.stringify(originalCard)) {
  //     savePreference(csid, updatedCard);
  //     return true;
  //   }
  // });
}

// updateAllCards()

async function establish_prebake(cardsphereDB) {
  try{
    const response = await fetch('./prebake.json')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    for (var [csid, contents] of Object.entries(data)){
      var existing = await getCard(cardsphereDB, csid)
      if (existing === undefined){
        console.log(`saving ${csid}`)
        saveCard(cardsphereDB, contents)
      }
    }
  }
  catch {
    console.error('Fetch error:', error);
  }

}


async function main() {
  console.log('opening db')
  var cardsphereDB = await openCardsphereDB();
  console.log('beginning prebake')
  await establish_prebake(cardsphereDB)
  console.log('starting card update loop, should now be listening for browser requests for db data')
  updateAllCards(cardsphereDB)

  browser.runtime.onMessage.addListener(async (request, sender) => {
  if (request.action === "reloadTab") {
    // Use sender.tab.id to reload the correct tab
    browser.tabs.reload(sender.tab.id, { bypassCache: true }); // Use bypassCache for a force reload
  }
  if (request.action === "storeData") {
    saveCard(cardsphereDB, request.payload);
  }

  if (request.action === "getData") {
    card = await getCard(cardsphereDB, request.query)
    return card;
  }
});
}

main()


// // It's possible these should just live centrally in utils or something, not entirely sure atm
// browser.runtime.onMessage.addListener((request, sender) => {
//   if (request.action === "reloadTab") {
//     // Use sender.tab.id to reload the correct tab
//     browser.tabs.reload(sender.tab.id, { bypassCache: true }); // Use bypassCache for a force reload
//   }
//   if (request.action === "storeData") {
//     await saveToIndexedDB(msg.payload);
//   }

//   if (request.action === "getData") {
//     return await readFromIndexedDB(msg.query);
//   }
// });


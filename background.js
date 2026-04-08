//TODO:
//Figure out save states and only refresh after a certain amount of time
//Figure out saving and displaying settings
//Figure out tcgplayer shipping price, ranked shipping price, and seller shipping price
//Deprecate and remove mvb =(
//Figure out the edge case for 7ed and 8ed
//Figure out the edge case for cards with no pricing source stock for a given condition/language/foiling/etc
//Consider whether failing to make an API call should count as 'updating' that card

function olderThan (timestamp, milliseconds) {
  return new Date() - (timestamp ? timestamp : 0) > milliseconds
}

var oneHourInMs = 60*60*1000


var count = 1
function updateAllCards() {

    // Scryfall with ID
    // processCardsRepeatedly({
    //   pause: 5000,
    //   message: 'Scryfall with ID Loop Complete',
    //   delayMs: 1000,
    //   filter: card => card.ids.scryfall != null && olderThan(card.last_updated.scryfall, 8*oneHourInMs), // this is single not equal and should therefore catch undefined
    //   apiCall: card => scryfallCardIdApiCall(card.ids.scryfall),
    //   updateBuilder: data => ({
    //     ids: {
    //       cardmarket: data.cardmarket_id,
    //       tcgplayer: data.tcgplayer_id
    //     },
    //     last_updated: {
    //       scryfall: new Date()
    //     }
    //   }),
    //   onSuccess: (card) => console.log(`${card.name} ${card.set} loaded Scryfall by ID successfully`),
    //   onError: (err, card) => console.log(`${card.name} ${card.set} failed Scryfall by ID. Error ${err}`)
    // })

    // Scryfall with no ID by search terms
    processCardsRepeatedly({
      pause: 5000,
      message: 'Scryfall by search terms Loop Complete',
      delayMs: 550,
      filter: card => card.ids.scryfall == null && olderThan(card.last_updated.scryfall, 24*oneHourInMs),
      apiCall: card => scryfallCardSearchApiCall(card.name, card.setcode, card.traits, card.foil),
      updateBuilder: data => ({
        ids: {
          cardmarket: data.cardmarket_id,
          tcgplayer: data.tcgplayer_id,
          scryfall: data.id // hopefully this means that if a search succeds it sticks around, but it also means a bad search ends up misbelieving for as long as the save persists
        },
        last_updated: {
          scryfall: new Date()
        }
      }),
      onSuccess: (card) => console.log(`${card.name} ${card.set} loaded Scryfall by search terms successfully`),
      onError: (err, card) => console.log(`${card.name} ${card.set} failed Scryfall by search terms. Error ${err}`)
    })

    // TCGPlayer
    processCardsRepeatedly({
      pause: 1000,
      message: 'TCGPlayer Loop Complete',
      delayMs: 300,
      filter: card => card.ids.tcgplayer != null && olderThan(card.last_updated.tcgplayer, oneHourInMs),
      apiCall: card => tcgApiCall(card.ids.tcgplayer, card.foil),
      updateBuilder: data => ({
        prices: {
          tcgplayer: data.results[0].price
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


// Can/should the url fetch be deprecated?
function scryfallCardIdApiCall(scryfallid) {
  return fetch(`https://api.scryfall.com/cards/${scryfallid}`)
  .then(response => {
    if (!response.ok) {
        throw new Error(`HTTP error in Scryfall by ID! status: ${response.status} path ${path}`);
    }
    return response.json();
  })
  .then(data => {
    return data
  })
}


function scryfallCardSearchApiCall(name, setcode, traits, foil) {
  // TODO: Also consider edge cases related to etched nonsense, may need to consider in cardspheresend whether to overwrite foil with an etched string in the case of being etched
  const traitselector = Object.entries(traits).reduce((accumulator, [key, value]) => {
    accumulator += typeof(value) === 'boolean' ? `${value ? ' ' : ' -'}is:${key}` : ` ${key}:${value}`
    return accumulator
  }, '');

  const setString = Array.isArray(setcode) ? `(set:${setcode.join(' or set:')})` : setcode.length > 0 ? `set:${setcode}` : '';
  const foilString = foil ? 'is:foil' : 'is:nonfoil'

  const path = encodeURI(`https://api.scryfall.com/cards/search?q=!"${name}" ${foilString} ${setString}${traitselector} -is:digital &unique=prints`);

  return fetch(path)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error in Scryfall by search terms! status: ${response.status} path: ${path}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.total_cards === 1) {
        return data.data[0];
      } else {
        throw new Error(`${name} - ${setcode} returned ${data.total_cards} results from path ${path}`);
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
    return data.results[0];
  })
}


function processCardsRepeatedly({
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
    delayMs = 500,
    filter,
    apiCall,
    updateBuilder,
    onSuccess,
    onError
  }) {
    var gettingCards = getPreference('cards', {})
    return gettingCards.then((cards) => {
      let chain = Promise.resolve();

      for (let [csid, card] of Object.entries(cards)) {
        if (!filter(card, csid)) continue;

        chain =  chain
        .then(() => delay(delayMs))
        .then(() => apiCall(card, csid))
        .then(data => cardUpdater(
          card,
          csid,
          updateBuilder(data, card, csid)
        ))
        .then(() => {
          onSuccess(card, csid);
        })
        .catch(err => {
          onError(err, card, csid);
          // IMPORTANT: swallow error so chain continues
          return Promise.resolve();
        });
      }
      return chain
    })
  }



function cardUpdater(originalCard, csid, changedValues) {
  return getPreference('cards')
  .then((updatedCards) => {
    updatedCards[csid] = deepMerge(
      structuredClone(updatedCards[csid]),
      changedValues
    );
    if (JSON.stringify(updatedCards[csid]) !== JSON.stringify(originalCard)) {
      savePreference('cards', updatedCards);
      return true;
    }
  });
}

updateAllCards()



browser.runtime.onMessage.addListener((request, sender) => {
  if (request.action === "reloadTab") {
    // Use sender.tab.id to reload the correct tab
    browser.tabs.reload(sender.tab.id, { bypassCache: true }); // Use bypassCache for a force reload
  }
});


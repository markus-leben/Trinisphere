

function updateCardsAfterSendsLoaded() {
  var gettingCards = getPreference('cards', {})
  gettingCards.then((cards) => {
    var packages = document.querySelectorAll('[class*="PotentialPackage"][class$="_container"]');


    // loop through lines that aren't the blank line that says how many more cards are in package
    for (var package of packages){
      var lines = package.querySelectorAll('[class*="PotentialPackage"][class$="_card"]');
      for (var line of lines){
        var tags = line.querySelector('span:not([data-testid="hovercard"])')
        updateCardsWithLine(cards, line)
        placePriceTag(cards, line, tags)
      }

    }
    savePreference('cards', cards)

    // // // looping separately for sake of separation, is this necessary?
    // for (var package of packages){
    //   var lines = package.querySelectorAll('li:not(.more)')
    //   for (var line of lines){



    //   }
    // }
    delay(10*1000).then(() => {
      updateCardsAfterSendsLoaded()
    })

  })

}

function refreshAfterSendsLoaded() {
  delay(300*1000).then(() => {
    refreshPage()
  })
}


function updateCardsAfterPackageReviewLoaded(mutationsList, observer) {
  // Check if this is the right mutation
  var correctMutation = false
  for (let mutation of mutationsList){
    if (mutation.addedNodes.length > 0 ){
      if ((mutation.target.tagName === 'BODY' && mutation.target.getAttribute('style') === "overflow: hidden;" ) || mutation.target.tagName === 'TBODY'){
        correctMutation = true
      }
    }
  }
  if (!correctMutation){
    return
  }

  // Get cards and put price tags on them.
  var gettingCards = getPreference('cards', {})
  gettingCards.then((cards) => {
    var lines = document.querySelectorAll('tr[class*="cardRow"]');
    for (var line of lines){
      updateCardsWithLine(cards, line)

      var tags = line.querySelector('[class*="__offerColumn"')
      placePriceTag(cards, line, tags)

    }
    savePreference('cards', cards)
  })

}


function updateCardsWithLine(cards, line) {
  var cardTraits = {}
  var cardpeek = line.querySelector('a[href*="/cards/"')
  var cardsphereid = cardpeek.href.replace('https://www.cardsphere.com/cards/','')
  var symbolContainer = line.querySelector('[class*="__symbol"')
  var cardname = cardpeek.textContent.trim()

  // these regexes are basicallly words($NNN)
  // If more name parsing has to occur this should be functionalized
  if (/.*\(#\d*\)/.test(cardname)){
    cardTraits.number = cardname.match(/\(#\d*\)/)[0].replace('(#', '').replace(')', '')
    cardname = cardname.replace(/\(#\d*\)/, '').trim()
  }
  var cardset = line.querySelector('[class*="__symbol"').textContent.trim() //line.getElementsByClassName('ss')[0].getAttribute('data-original-title').trim()
  var cardsetcode = symbolContainer.querySelector('.ss').classList[1].replace('ss-', '')

  var parseDescriptionResults = parseCardsphereSetName(cardset)
  cardset = parseDescriptionResults.setName
  deepMerge(cardTraits, parseDescriptionResults.traits)


  var parseResults = parseCardsphereSetCode(cardsetcode)
  cardsetcode = parseResults.setcode
  deepMerge(cardTraits, parseResults.traits)
  var foil = line.querySelectorAll('[class*="FoilIcon"').length > 0
  // TODO: Consider if saving cardsphere offers is a good idea
  var thiscardsphereprice = parseFloat(line.querySelector('b').textContent.replace('$',''))

  var cardToUpdate = cards[cardsphereid] || {prices:{}, ids:{}, traits: {}, last_updated:{}}
  cardToUpdate.name = cardname
  cardToUpdate.set = cardset
  cardToUpdate.foil = foil
  cardToUpdate.setcode = cardsetcode
  cardToUpdate.traits = cardTraits
  cardToUpdate.ids.cardsphere = cardsphereid // kinda redundant but useful
  cardToUpdate.last_updated.cardsphere = new Date()

  // beware undefineds and nulls here
  cardToUpdate.prices.cardsphere = thiscardsphereprice > cardToUpdate.prices.cardsphere || cardToUpdate.prices.cardsphere === undefined ? thiscardsphereprice : cardToUpdate.prices.cardsphere
  cardToUpdate.ids.cardsphere = cardsphereid

  if (JSON.stringify(cards[cardsphereid]) !== JSON.stringify(cardToUpdate)) {
    console.log(`updated csid ${cardsphereid}: ${cardname} - ${cardset} `)
    cards[cardsphereid] = cardToUpdate
  }
}


function placePriceTag (cards, line, tagHolder){
  if (tagHolder === null) {
    var tagHolder = document.createElement("span")
    line.appendChild(tagHolder)
  }
  var tagContainerExample = document.querySelector('div[class*="tooltipContainer"]')
  var tagExample = document.querySelector('div[class*="Tag-module-scss"]')
  var tooltipExample = document.querySelector('div[class*="Tooltip-module-scss"][class$="__tooltip"]')


  var cardpeek = line.querySelector('a[href*="/cards/"')
  var cardsphereid = cardpeek.href.replace('https://www.cardsphere.com/cards/','')
  var thisCard = cards[cardsphereid] || {prices:{}, ids:{}, traits: {}, last_updated:{}}
  var thisCardspherePrice = parseFloat(line.querySelector('b').textContent.replace('$',''))
  var tcgPrice = thisCard.prices.tcgplayer || 0.0

  // delete old copies of tags
  tagHolder.querySelectorAll('.trinisphere-added').forEach(e => e.remove());

  var tagContainer = document.createElement('div')
  tagContainer.classList.add(tagContainerExample.classList[0])
  tagContainer.classList.add('trinisphere-added')
  tagHolder.appendChild(tagContainer)



  var testTag = document.createElement("div")
  var tooltip = document.createElement("div")


  testTag.classList.add(tagExample.classList[0])
  testTag.classList.add(tagExample.classList[1])
  testTag.classList.add('trinisphere-added')


  tooltip.classList.add(tooltipExample.className)
  tooltip.classList.add('trinisphere-added')

  var color = 'rgb(255, 255, 255)'
  var backgroundColor = "rgb(255, 255, 128)"
  var text = "❓"
  var mouseover = `Tcgplayer Price Unknown - Try refreshing or checking in a few minues`
  if (thisCardspherePrice >= tcgPrice && tcgPrice !== 0.0) {
    color = 'rgb(255, 255, 255)'
    backgroundColor = "rgb(78, 249, 121)"
    text = "🤑"
    mouseover = `$${thisCardspherePrice} > $${tcgPrice}`
  }
  else if (tcgPrice === 0.0) {
    color = 'rgb(255, 255, 255)'
    backgroundColor = "rgb(255, 255, 128)"
    text = "❓"
    mouseover = `Tcgplayer Price Unknown - Try refreshing or checking in a few minues`
  }
  else {
    color = 'rgb(255, 255, 255)'
    backgroundColor = "rgb(234, 115, 85)"
    text = "💸"
    mouseover = `$${thisCardspherePrice} < $${tcgPrice}`

  }

  testTag.style.color = color
  testTag.style.backgroundColor = backgroundColor
  testTag.textContent = text

  tooltip.textContent = mouseover

  tagContainer.appendChild(testTag)
  tagContainer.appendChild(tooltip)
}



function parseCardsphereSetCode(cssetid){

  if (cssetid === 'cha'){
    // Scryfall has mystery booster as the list
    return {
      setcode: 'plst',
      traits: {
      }
    }
  }
  else   if (cssetid === 'pme'){
    // special occasion promos are pme on cardsphere and hho on scryfall, pretty simple
    return {
      setcode: 'hho',
      traits: {
      }
    }
  }
  else   if (cssetid === 'mb2'){
    // Scryfall has mystery booster as the list
    return {
      setcode: ['plst', 'mb2'],
      traits: {
      }
    }
  }
  else if (cssetid === 'gdp'){
    // Scryfall associates game day promos with their set, the only way to manage this is to just search by is:gameday, which the set name should manage, but we can put is:gameday here anyway
    return {
      setcode: '',
      traits: {
        is:'gameday'
      }
    }
  }
  else if (cssetid === 'bab'){
    // Scryfall associates buy a box promos with their set, the only way to manage this is to just search by is:buyabox, which the set name should manage, but we can put is:buyabox here anyway
    return {
      setcode: '',
      traits: {
        is:'buyabox'
      }
    }
  }
  else if (cssetid === 'tsp'){
    // Set code has to be overloaded for Time Spiral due to Scryfall separating timeshifted into a separate set
    return {
      setcode: ['tsp','tsb'],
      traits: {
      }
    }
  }
  else {
    return {
      setcode: cssetid,
      traits: {
      }
    }
  }

}


function parseCardsphereSetName(setName){
  //This is a dict of keywords for dash separated terms and the trais that they have for scryfall search
  //TODO: Double check whether JS objects when instantiated like this retain their ordering
  var terms = {
    ' - Showcase':{showcase:true},
    ' - Scene':{scene:true},
    ' - Borderless':{borderless:true},
    ' - Extended Art':{frame:'extendedart'},
    ' - First Place Foil':{firstplacefil:true},
    ' Through the Ages':{sourcematerial:true},
    'Game Day':{gameday:true},
    '- Borderless Character$':{borderless:true, surgefoil:false},
    '- Borderless Character Surge Foil':{borderless:true, surgefoil:true},
    'Unfinity Borderless$':{borderless:true, galaxyfoil:false},
    'Unfinity Borderless Galaxy Foil':{borderless:true, galaxyfoil:true}
  }
  for (const [term, traitDict] of Object.entries(terms)){
    var patternString = `.*${term}`
    var replacer = new RegExp(`${term}`)
    var reg = new RegExp(patternString)
    if (reg.test(setName)){
      return {
        setName: setName.replace(replacer, ''),
        traits: traitDict
      }
    }
  }

  if (/.* Promos/.test(setName)){
    return {
      setName: setName.replace(/ - Promos/, ''),
      traits: {
      }
    }
  }
  else {
    // This is the normal case for a card, i.e. a normal printing of a card without any fancy stuff or
    return {
      setName: setName,
      traits: {
        showcase:false,
        scene:false,
        borderless:false,
        boosterfun:false,
        boxtopper:false,
        firstplacefoil:false,
        '-frame':'extendedart',
        promo:false
      }
    }
  }
}


function refreshPage() {
  browser.runtime.sendMessage({ action: "reloadTab" });
}


var TAG_DIV_CLASS_LIST = ''
var TAG_CLASS_LIST = ''

// does not currently need to be sync
updateCardsAfterSendsLoaded()

const refreshObserver = new MutationObserver(refreshAfterSendsLoaded);

const packageElement = document.querySelector('[class*="__packageContainer"')
refreshObserver.observe(packageElement, { childList: true});


const packageObserver = new MutationObserver(updateCardsAfterPackageReviewLoaded)

packageObserver.observe(document.body, { childList: true, subtree: true})



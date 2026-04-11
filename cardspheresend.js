async function main() {

  const tagContainerExample = document.querySelector('div[class*="tooltipContainer"]')
  const tagExample = document.querySelector('div[class*="Tag-module-scss"]')
  const tooltipExample = document.querySelector('div[class*="Tooltip-module-scss"][class$="__tooltip"]')
  await clearCardsphereDB()
  const cardsphereDB = await openCardsphereDB()

  function updateCardsAfterSendsLoaded() {
      var packages = document.querySelectorAll('[class*="PotentialPackage"][class$="_container"]');


      // loop through lines that aren't the blank line that says how many more cards are in package
      for (var package of packages){
        var lines = package.querySelectorAll('[class*="PotentialPackage"][class$="_card"]');
        for (var line of lines){
          // var tags = line.querySelector('span:not([data-testid="hovercard"])')
          updateCardsWithLine(line)
          placePriceTag(line, 'span:not([data-testid="hovercard"])')
        }

      }

      delay(1*1000).then(() => {
        updateCardsAfterSendsLoaded()
      })

  }

  function refreshAfterSendsLoaded() {
    delay(600*1000).then(() => {

      refreshPage()
    })
  }


  function updateCardsAfterPackageReviewLoaded(mutationsList, observer) {
    // TODO: Look further into mutations, not sure all forms of package review opening are covered, some pop-in appears to occur
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

    updatePackageCards()

  }

  function updatePackageCards() {
    console.log('updating package cards')
    // Get cards and put price tags on them.
      var lines = document.querySelectorAll('tr[class*="cardRow"]');
      for (var line of lines){
        updateCardsWithLine(line)

        placePriceTag(line, '[class*="__offerColumn"')

      }


      delay(5*1000).then(() => {
        updatePackageCards()
      })
  }

  async function loadCard(cardsphereid) {
    try{
      var dbCard = await browser.runtime.sendMessage({ action: "getData", query: cardsphereid });
      var thisCard = structuredClone(dbCard)
      var thisCard = thisCard === undefined ? {prices:{}, ids:{}, traits: {}, last_updated:{}, urls: {}} : thisCard
    }
    catch (error){
      var thisCard = {prices:{}, ids:{}, traits: {}, last_updated:{}, urls: {}}
    }
    return thisCard
  }


  async function dumpCard(card) {
    await browser.runtime.sendMessage({ action: "storeData", payload: card});
  }



  async function updateCardsWithLine(line) {
    var cardTraits = {}
    var cardpeek = line.querySelector('a[href*="/cards/"')
    var cardsphereid = cardpeek.href.replace('https://www.cardsphere.com/cards/','')
    var thisCard = await loadCard(cardsphereid)
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


    thisCard.name = cardname
    thisCard.cardsphereid = cardsphereid
    thisCard.set = cardset
    thisCard.foil = foil
    thisCard.setcode = cardsetcode
    thisCard.traits = cardTraits
    thisCard.ids.cardsphere = cardsphereid // kinda redundant but useful
    thisCard.urls.cardsphere = `https://cardsphere.com/cards/${cardsphereid}`
    thisCard.last_updated.cardsphere = new Date()

    // beware undefineds and nulls here
    thisCard.prices.cardsphere = thiscardsphereprice > thisCard.prices.cardsphere || thisCard.prices.cardsphere === undefined ? thiscardsphereprice : thisCard.prices.cardsphere
    thisCard.ids.cardsphere = cardsphereid
    console.log(thisCard)
    try{
      dumpCard(thisCard)
    }
    catch {}
    // saveCard(cardsphereDB, thisCard)

  }


  async function placePriceTag (line, tagstring){
    var cardpeek = line.querySelector('a[href*="/cards/"')
    var cardsphereid = cardpeek.href.replace('https://www.cardsphere.com/cards/','')

    var thisCard = await loadCard(cardsphereid)


    var tagHolder = line.querySelector(tagstring)
    if (tagHolder === null) {
      var tagHolder = document.createElement("span")
      line.appendChild(tagHolder)
    }

    let existingTag = tagHolder.querySelector('.trinisphere-tag-container')

    var thisCardspherePrice = parseFloat(line.querySelector('b').textContent.replace('$',''))
    var tcgPrice = thisCard.prices.tcgplayer || 0.0


    if (!existingTag) {
      var tagContainer = document.createElement('div')
      tagContainer.classList.add(tagContainerExample.classList[0])
      tagContainer.classList.add('trinisphere-added')
      tagContainer.classList.add('trinisphere-tag-container')
      tagHolder.appendChild(tagContainer)
      var valueTag = document.createElement("a")
      var tooltip = document.createElement("div")

      valueTag.classList.add(tagExample.classList[0])
      valueTag.classList.add(tagExample.classList[1])
      valueTag.classList.add('trinisphere-added')
      valueTag.classList.add('trinisphere-value-tag')
      valueTag.target = "_blank"


      tooltip.classList.add(tooltipExample.className)
      tooltip.classList.add('trinisphere-added')
      tooltip.classList.add('trinisphere-tooltip')

      tagContainer.appendChild(valueTag)
      tagContainer.appendChild(tooltip)
      // create once
    } else {
      var tagContainer = tagHolder.querySelector('.trinisphere-tag-container')
      var valueTag = tagHolder.querySelector('.trinisphere-value-tag')
      var tooltip = tagHolder.querySelector('.trinisphere-tooltip')
    }

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

    valueTag.style.color = color
    valueTag.style.backgroundColor = backgroundColor
    valueTag.textContent = text
    if (thisCard.urls.tcgplayer !== null){
      valueTag.href = thisCard.urls.tcgplayer
    }

    tooltip.textContent = mouseover

    tagContainer.appendChild(valueTag)
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
    else   if (cssetid === 'lis'){
      // The list on cardsphere is 'lis' according to set code
      return {
        setcode: 'plst',
        traits: {
        }
      }
    }
    else   if (cssetid === '30a'){
      // 30th anniversary
      return {
        setcode: ['p30m', 'p30a'],
        traits: {
        }
      }
    }
    else   if (cssetid === 'ice2'){
      // Ice age set symbol - presumedly an alternate one for web visibility
      return {
        setcode: 'ice',
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
    else   if (cssetid === 'pmei'){
      // special occasion promos are pme on cardsphere and hho on scryfall, pretty simple
      return {
        setcode: 'sch',
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
    else if (cssetid === 'lpr'){
      // Scryfall associates launch promos with their set, the only way to manage this is to just search by is:buyabox, which the set name should manage, but we can put is:buyabox here anyway
      return {
        setcode: '',
        traits: {
          is:'release'
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
      ' - Alternate Art':{showcase:true},
      ' - Showcase':{boosterfun:true}, //Ironically some CS cards called showcase are actually stuff like portraits
      ' - Scene':{scene:true},
      ' - Borderless':{borderless:true},
      ' - Extended Art$':{frame:'extendedart'},
      ' - Extended Art - Surge Foil':{frame:'extendedart', surgefoil:true},
      ' Retro Frame$':{frame:'1997'},
      // ' Retro Frame Etched Foil$':{frame:'1997'}, //TODO: figure out etched foil
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




  // does not currently need to be sync
  updateCardsAfterSendsLoaded()

  refreshAfterSendsLoaded()

  // const refreshObserver = new MutationObserver(refreshAfterSendsLoaded);

  // const packageElement = document.querySelector('[class*="__packageContainer"')
  // refreshObserver.observe(packageElement, { childList: true});


  const packageObserver = new MutationObserver(updateCardsAfterPackageReviewLoaded)

  packageObserver.observe(document.body, { childList: true, subtree: true})


}


main()
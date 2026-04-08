## Purpose

Trinisphere exists as a browser extension to provide in-browser tools to improve quality of life on Cardsphere and make it easier to trade confidently or with better information.

## Existing Features

1. In-browser live price comparison: On loading /send, the browser extension will automatically tag and update tags with information about the status of pricing on cardsphere offers relative to TCGPlayer lowest near mint.
2. Automated refreshing: The browser extension will automatically refresh the page after six minutes.

## Install Instructions



1. Download and unzip the repo.
2. Type about:debugging into the search bar and click "This Firefox" in the left panel.
  <img src="" alt="Screenshot of the 'this firefox panel" width="750px">
3. Click "Load Temporary Add-on" and navigate to the folder where the repo is.
4. Click on the file named manifest.json
  <img src="" alt="screenshot of navigating to manifest.json" width="750px">
5. Trinisphere should now be fully loaded and running. Cards should gradually load in after you first navigate to your /sends page. Currently this takes a bit of time as I haven't got a lot of clever preload solutions set up yet, but



## Feature Wishlist/TODO

1. Settings menus (currently partially complete)
2. Pricing source options like cardmarket, buylists, and the option of custom sources.
3. Improved coverage and consistency of correspondence to pricing sources, possibly including mtgjson integration
4. Coverage of additional browsers and/or build pipeline for concurrency between versions for different browsers
5. Preloading and/or better memoization of card correspondence and/or pricing



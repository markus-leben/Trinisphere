// Function to save a user preference using promises
function savePreference(key, value) {
  // browser.storage.local.set returns a promise
  browser.storage.local.set({ [key]: value })
    .then(() => {
      // console.log(`Value for ${key} saved`);
    })
    .catch((error) => {
      console.error(`Error setting value: ${error}`);
    });
}

// Function to retrieve a user preference using promises
function getPreference(key, defaultValue) {
  // browser.storage.local.get returns a promise that resolves with the result object
  return browser.storage.local.get({[key]: defaultValue})
    .then((result) => {
      //console.log(`Value for ${key} is: ${result[key]}`);
      return result[key];
    })
    .catch((error) => {
      console.error(`Error getting value: ${error}`);
    });
}

//Function to do a promise after a delay
function delay(t, val) {
  return new Promise(resolve => setTimeout(resolve, t, val));
}


//recursively merge objects deeply
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] instanceof Object &&
      key in target &&
      target[key] instanceof Object
    ) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
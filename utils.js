// // Function to save a user preference using promises
// function savePreference(key, value) {
//   // browser.storage.local.set returns a promise
//   browser.storage.local.set({ [key]: value })
//     .then(() => {
//       // console.log(`Value for ${key} saved`);
//     })
//     .catch((error) => {
//       console.error(`Error setting value: ${error}`);
//     });
// }

// // Function to retrieve a user preference using promises
// function getPreference(key, defaultValue) {
//   // browser.storage.local.get returns a promise that resolves with the result object
//   return browser.storage.local.get({[key]: defaultValue})
//     .then((result) => {
//       //console.log(`Value for ${key} is: ${result[key]}`);
//       return result[key];
//     })
//     .catch((error) => {
//       console.error(`Error getting value: ${error}`);
//     });
// }

// function getAllPreferences() {
//   return browser.storage.local.get()
// }

// function getAllKeys() {
//   return browser.storage.local.getKeys()
// }

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


function openCardsphereDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('csdb', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('cards')) {
        const store = db.createObjectStore('cards', { keyPath: 'cardsphereid' });
        store.createIndex('name', 'name', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function clearCardsphereDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('csdb', 1);

    request.onsuccess = () => {
      const db = request.result;

      const transaction = db.transaction('cards', 'readwrite');
      const store = transaction.objectStore('cards');

      const clearRequest = store.clear();

      clearRequest.onsuccess = () => resolve(true);
      clearRequest.onerror = () => reject(clearRequest.error);

      transaction.onerror = () => reject(transaction.error);
    };

    request.onerror = () => reject(request.error);
  });
}

function transact(db, storeName, mode) {
  const transaction = db.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);

  return { transaction, store };
}


function saveCard(db, card) {
  return new Promise((resolve, reject) => {
    const { transaction, store } = transact(db, 'cards', 'readwrite');

    const request = store.put(card);

    request.onsuccess = () => resolve(card);
    request.onerror = () => reject(request.error);

    transaction.onerror = () => reject(transaction.error);
  });
}

function getCard(db, id) {
  return new Promise((resolve, reject) => {
    const { store } = transact(db, 'cards', 'readonly');

    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}


function getAllCards(db) {
  return new Promise((resolve, reject) => {
    const { store } = transact(db, 'cards', 'readonly');

    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}


function getCardsIteratively(db) {
  return {
    async *[Symbol.asyncIterator]() {
      const tx = db.transaction('cards', 'readonly');
      const store = tx.objectStore('cards');
      const request = store.openCursor();

      let resolveCursor;
      let cursorPromise = new Promise(res => (resolveCursor = res));

      request.onsuccess = (event) => {
        resolveCursor(event.target.result);
      };

      request.onerror = () => {
        throw request.error;
      };

      while (true) {
        const cursor = await cursorPromise;

        if (!cursor) return;
        console.log(cursor.value)
        yield cursor.value;

        cursor.continue();

        cursorPromise = new Promise(res => (resolveCursor = res));
      }
    }
  };
}
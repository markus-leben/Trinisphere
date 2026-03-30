async function saveOptions(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  document.querySelector('#output').innerText= 'asdfqwer'
  // await browser.storage.local.set({trinisphere_settings:
  //   {
  //     pricing_source: formData.get('pricing_source'),
  //     cardsphere_value: formData.get('cardsphere_value'),
  //     cardsphere_value: formData.get('non_cardsphere_value'),
  //   }
  // })
  // await browser.storage.local.set({
  //   colour: document.querySelector("#colour").value
  // });
}

async function restoreOptions() {
  try {
    // let settings = await browser.storage.local.get('trinisphere_settings');
    // document.querySelector(`input[value="${settings.pricing_source}"]`).checked = true
  }

  // res = await browser.storage.local.get('colour');
  // document.querySelector("#colour").value = res.colour || 'Firefox red';
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);

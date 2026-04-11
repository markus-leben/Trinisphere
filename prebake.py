import ijson
import json
prebaked_cards = {}
# gonna have to consider what I should be getting form an mtgjson prebake vs what should come from mid-run cardsphere scraping
# this is pretty largely contingent on how good mtgjson cs ids are now that mvb is dead, rip
with open('AllIdentifiers.json', 'rb') as mtgj_cards:
    for uuid, card_obj in ijson.kvitems(mtgj_cards, 'data'):
        if 'isOnlineOnly' in card_obj:
            continue
        for foil_string in ['', 'Foil']:
          if f'cardsphere{foil_string}Id' in card_obj['identifiers']:
              cs_id = card_obj['identifiers'][f'cardsphere{foil_string}Id']
              prebaked_cards[cs_id] = {
                  'cardsphereid':cs_id,
                  'name': card_obj['name'],
                  'setcode': card_obj['setCode'],
                  'prices': {},
                  'ids': {
                  },
                  'traits': {},
                  'last_updated' : {},
                  'urls': {},
                  'is_foil': True if foil_string == 'Foil' else False #still not good with etched stuff, should I be imitating mtgj?
              }
              for identifier in [f'cardKingdom{foil_string}Id', f'mcmId', 'scryfallId', 'scgId', 'tcgplayerProductId']:
                  if identifier in card_obj['identifiers']:
                      prebaked_cards[cs_id]['ids'][identifier.replace('Id','').replace('Product','')] = card_obj['identifiers'][identifier]

with open("prebake.json", "w") as dumpfile:
  json.dump(prebaked_cards, dumpfile)

import { ClueItem } from '../types';

/**
 * Dynamic Narrative Engine for "The Curse of the Lost Dutchman".
 * Tracks player discovery of historical fatalities, forensic ballistics,
 * the fate of Dr. Adolph Ruth and the Ruth family, and the macabre
 * phenomenon of skulls separated from bodies in the Superstition Mountains.
 */

export interface CurseDossier {
  stage: number; // 0 to 3
  stageName: string;
  stageSubtitle: string;
  grimQuote: string;
  discoveredCount: number;
  hasRuthCamp: boolean;
  hasRuthSkull: boolean;
  hasCraveySite: boolean;
  hasMassacre: boolean;
  hasHolmesClues: boolean;
  narrativeSummary: string;
  forensicReport: {
    ruthStatus: string;
    ballisticsNote: string;
    skullDispersalNote: string;
    craveyNote: string;
    ruthFamilyLegacy: string;
  };
}

export const CURSE_CLUE_IDS = [
  'clue_ruth_camp',
  'clue_ruth_skull',
  'clue_cravey_site',
  'clue_massacre',
  'clue_dick_holmes_manuscript',
] as const;

/**
 * Specific clues directly concerning scattered human skulls and decapitated remains
 * in the Superstition wilderness.
 */
export const SCATTERED_SKULL_CLUE_IDS = [
  'clue_ruth_skull',
  'clue_cravey_site',
  'clue_ruth_camp',
] as const;

export function isScatteredSkullClue(clueId: string): boolean {
  if (SCATTERED_SKULL_CLUE_IDS.includes(clueId as any)) return true;
  const lower = clueId.toLowerCase();
  return lower.includes('skull') || lower.includes('headless');
}

export function evaluateCurseProgress(clues: ClueItem[]): CurseDossier {
  const discoveredMap = new Map<string, boolean>();
  clues.forEach((c) => {
    if (c.discovered) discoveredMap.set(c.id, true);
  });

  const hasRuthCamp = Boolean(discoveredMap.get('clue_ruth_camp'));
  const hasRuthSkull = Boolean(discoveredMap.get('clue_ruth_skull'));
  const hasCraveySite = Boolean(discoveredMap.get('clue_cravey_site'));
  const hasMassacre = Boolean(discoveredMap.get('clue_massacre'));
  const hasHolmesClues = Boolean(discoveredMap.get('clue_dick_holmes_manuscript'));

  const count = [hasRuthCamp, hasRuthSkull, hasCraveySite, hasMassacre, hasHolmesClues].filter(Boolean).length;

  let stage = 0;
  let stageName = 'Whispers of the Dutchman’s Curse';
  let stageSubtitle = 'Unconfirmed campfire rumors of vanished prospectors and territorial legends.';
  let grimQuote = '"Many come into these red canyons seeking Waltz’s gold, but the mountain keeps their bones."';

  if (count >= 3 || (hasRuthCamp && hasRuthSkull)) {
    stage = 3;
    stageName = 'The Decapitation Ledger & Ruth Tragedy';
    stageSubtitle = 'Physical proof of execution-style sniper homicides and severed skulls across the canyons.';
    grimQuote = '"Two high-velocity rifle slugs through the temples... and his head resting nearly a mile from his boots. Veni, Vidi, Vici."';
  } else if (count === 2 || hasRuthSkull || hasCraveySite) {
    stage = 2;
    stageName = 'The Scattered Skulls Pattern';
    stageSubtitle = 'Discovery of headless corpses and skulls left exposed on high canyon ridges.';
    grimQuote = '"The coyotes didn’t carry that heavy skull three-quarters of a mile uphill... a human hand placed it there as a warning."';
  } else if (count === 1) {
    stage = 1;
    stageName = 'The First Severed Thread';
    stageSubtitle = 'Initial evidence of abandoned camps, missing maps, and mysterious desert deaths.';
    grimQuote = '"Dr. Ruth walked in on a steel hip pin with genuine Peralta maps from Sonora. The maps are gone, and so is his life."';
  }

  // Generate dynamic forensic narrative
  let narrativeSummary = '';
  if (stage === 3) {
    narrativeSummary =
      'You have pieced together the horrifying reality of the Lost Dutchman Curse. In 1931, Dr. Adolph Ruth arrived from Washington D.C. possessing authentic Peralta land-grant maps obtained by his son in Mexico. Six months later, his headless skeleton was discovered in Black Top Mesa’s east ravine, while his severed skull was retrieved 3/4 mile away in Needle Canyon wash with two rifle execution wounds in the temples. In 1947, James Cravey suffered the exact same fate—beheaded in his sleeping bag with his skull perched atop a high overlook.';
  } else if (stage === 2) {
    narrativeSummary =
      'A macabre pattern has emerged among the volcanic spires: searchers for Jacob Waltz’s bonanza do not merely perish from dehydration—they are decapitated. The skulls of Dr. Adolph Ruth and James Cravey were found hundreds of yards to miles away from their skeletal remains, indicating deliberate trophy placement or calculated terror.';
  } else if (stage === 1) {
    narrativeSummary =
      'Your expedition has uncovered grim physical artifacts of searchers who preceded you. Relics point to the doomed 1931 expedition of crippled scholar Dr. Adolph Ruth and the ancient bones of the Peralta pack train.';
  } else {
    narrativeSummary =
      'Old prospectors in Tortilla Flat whisper that a dark curse guards Jacob Waltz’s hidden drift. Those who come too close to the secret location vanish, leaving only rumors and campfire ghost stories behind.';
  }

  const ruthStatus = hasRuthCamp
    ? hasRuthSkull
      ? 'CONFIRMED HOMICIDE: Headless skeleton located in East Ravine; skull recovered in Needle Canyon wash bearing twin .30-caliber entrance and exit gunshot wounds.'
      : 'CAMP DISCOVERED: Collapsed canvas shelter, unlaced boots, and "Veni, Vidi, Vici" notebook found, but skull and Peralta maps missing.'
    : hasRuthSkull
    ? 'SEVERED SKULL DISCOVERED: Autopsy by Dr. Reed confirms two high-powered rifle bullet holes fired at close range; torso missing.'
    : 'MISSING IN WILDERNESS: 66-year-old Dr. Adolph Ruth entered West Boulder Canyon June 1931 with wooden cane and Mexican Peralta maps. Never returned.';

  const ballisticsNote = hasRuthSkull
    ? 'Forensic ballistics by Dr. R.R. Reed and Smithsonian anthropologist Dr. Aleš Hrdlička confirmed two bullet penetrations: clean entrance in left temple, shattered exit through right parietal bone. Fired from elevated ambush rock, completely refuting suicide or animal scavenging.'
    : 'Rumors persist that Ruth died of a fall or thirst, but Dutch Hunters suspect high-powered sniper fire from hidden cliff perches.';

  const skullDispersalNote = hasRuthSkull || hasCraveySite
    ? 'Macabre Dispersal: In both the Ruth (1931) and Cravey (1947) cases, skulls were discovered separated from the rest of the skeleton by hundreds of yards to nearly a mile. Deputies noted that predators scatter long bones, not heavy craniums across impassable vertical box dry-falls.'
    : 'Local folklore speaks of "the headhunters of Weaver’s Needle"—phantom guardians or claim jumpers who decapitate those who find the mine.';

  const craveyNote = hasCraveySite
    ? '1947 Bivouac Verified: James Cravey chartered a helicopter to search the Needle ridges. Months later, his headless skeleton was found bundled neatly inside his tied sleeping bag; his skull rested 300 yards away atop the canyon rimrock.'
    : 'Unsolved: James Cravey entered via helicopter in 1947 and was never seen alive again.';

  const ruthFamilyLegacy =
    'The Ruth Family Saga: Dr. Erwin C. Ruth (son of Adolph) provided medical aid to Don Thomas Ramirez in Mexico in 1912, receiving original 1848 Peralta maps. In 1931, his father Adolph sought to vindicate the family honor, only to be executed for the parchment maps—which have never been found.';

  return {
    stage,
    stageName,
    stageSubtitle,
    grimQuote,
    discoveredCount: count,
    hasRuthCamp,
    hasRuthSkull,
    hasCraveySite,
    hasMassacre,
    hasHolmesClues,
    narrativeSummary,
    forensicReport: {
      ruthStatus,
      ballisticsNote,
      skullDispersalNote,
      craveyNote,
      ruthFamilyLegacy,
    },
  };
}

/**
 * Returns dynamic NPC dialogue questions reflecting current curse progression.
 */
export function getCurseQuestionsForNPC(
  characterId: string,
  curseDossier: CurseDossier
): string[] {
  const { stage, hasRuthCamp, hasRuthSkull, hasCraveySite } = curseDossier;
  const questions: string[] = [];

  if (stage === 0) {
    if (characterId === 'old_dusty_pete') {
      questions.push('What is the truth behind the Curse of the Lost Dutchman?');
    } else if (characterId === 'sheriff_wyatt') {
      questions.push('Have any miners vanished out in the canyons lately?');
    }
    return questions;
  }

  switch (characterId) {
    case 'old_dusty_pete':
      if (hasRuthSkull) {
        questions.push('Why was Dr. Ruth’s skull found in Needle Canyon with two bullet holes?');
      }
      if (hasRuthCamp) {
        questions.push('What did Adolph Ruth mean by his final words: "Veni, Vidi, Vici"?');
      }
      if (hasCraveySite) {
        questions.push('Did you know James Cravey before he took that helicopter into the Needle?');
      }
      questions.push('Do you believe the Dutchman’s ghost decapitates prospectors?');
      break;

    case 'sheriff_wyatt':
      if (hasRuthSkull) {
        questions.push('What did the coroner’s autopsy determine about the bullet holes in Ruth’s skull?');
      }
      if (hasRuthCamp) {
        questions.push('Who searched Ruth’s camp and took the Peralta maps from his pocket?');
      }
      if (hasCraveySite) {
        questions.push('How was James Cravey found headless inside his own sleeping bag?');
      }
      questions.push('Are there active snipers or claim jumpers ambushing miners in the Superstitions?');
      break;

    case 'barkeep_hank':
      if (hasRuthCamp || hasRuthSkull) {
        questions.push('Did Dr. Adolph Ruth stop in this saloon before heading to West Boulder?');
      }
      questions.push('What do the old-timers say about the skulls found separated from bodies?');
      break;

    case 'assayer_walker':
      if (hasRuthCamp) {
        questions.push('Did Dr. Ruth ever show you rock samples before he was murdered?');
      }
      questions.push('Could the Peralta maps from Sonora have led Ruth straight to the mother lode?');
      break;

    default:
      if (hasRuthSkull || hasCraveySite) {
        questions.push('Why are skulls in these mountains always found miles away from the skeletons?');
      }
      break;
  }

  return questions;
}

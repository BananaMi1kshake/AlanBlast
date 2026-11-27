export const RULES = Object.freeze({
  blockPoints: 1,
  linePoints: 10,
  simultaneousPairPoints: 5,
  maxComboMultiplier: 5,
  fullBoardBonus: 100,
});

export function comboMultiplier(combo) {
  return Math.min(Math.max(combo, 1), RULES.maxComboMultiplier);
}

export function scorePlacement(blocks, lines, previousCombo, fullBoardClear) {
  const combo = lines > 0 ? previousCombo + 1 : 0;
  const pairs = lines * (lines - 1) / 2;
  const linePoints = (lines * RULES.linePoints + pairs * RULES.simultaneousPairPoints)
    * comboMultiplier(combo);
  const bonus = fullBoardClear ? RULES.fullBoardBonus : 0;
  return { points: blocks * RULES.blockPoints + linePoints + bonus, combo, bonus };
}

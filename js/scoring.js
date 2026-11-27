export const RULES = Object.freeze({
  blockPoints: 1,
  linePoints: 10,
  simultaneousPairPoints: 5,
  comboWindow: 3,
  fullBoardBonus: 100,
});

export function scorePlacement(blocks, lines, progress, fullBoardClear) {
  const comboWindow = lines ? RULES.comboWindow : Math.max(0, progress.comboWindow - 1);
  const combo = lines ? progress.combo + 1 : (comboWindow ? progress.combo : 0);
  const pairs = lines * (lines - 1) / 2;
  const linePoints = (lines * RULES.linePoints + pairs * RULES.simultaneousPairPoints) * combo;
  const bonus = fullBoardClear ? RULES.fullBoardBonus : 0;
  return { points: blocks * RULES.blockPoints + linePoints + bonus, combo, comboWindow, bonus };
}

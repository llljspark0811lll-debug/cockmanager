// allocateCourtsForLevelGroups 새 로직 시뮬레이션
// 조건: group_0 (8명, AB), group_1 (14명, CD), totalCourts=4

// 새 credit 기반 통합 배분 로직
function allocate(groups, totalCourts) {
  const courts = new Map(groups.map(g => [g.id, 0]));
  const credits = new Map(groups.map(g => [g.id, g.courtCredit]));
  const eligibleGroups = groups.filter(g => g.need !== 0 && g.maxCourts >= 1);
  if (eligibleGroups.length === 0) return { courts, credits };

  const totalPlayers = eligibleGroups.reduce((s, g) => s + g.playerCount, 0);
  const minCourts = new Map(eligibleGroups.map(g => [g.id, Math.min(Math.max(1, Math.ceil(g.prevRested / 4)), g.maxCourts)]));
  const totalMin = [...minCourts.values()].reduce((s, v) => s + v, 0);

  if (totalMin > totalCourts) {
    const sorted = [...eligibleGroups].sort((a, b) => b.prevRested - a.prevRested);
    let rem = totalCourts;
    for (const g of sorted) {
      if (rem <= 0) break;
      const min = minCourts.get(g.id) ?? 1;
      courts.set(g.id, Math.min(min, rem));
      rem -= courts.get(g.id);
    }
    for (const g of eligibleGroups) {
      const fairShare = (g.playerCount / totalPlayers) * totalCourts;
      credits.set(g.id, g.courtCredit + fairShare - (courts.get(g.id) ?? 0));
    }
    return { courts, credits };
  }

  const shares = eligibleGroups.map(g => {
    const fairShare = (g.playerCount / totalPlayers) * totalCourts;
    return { id: g.id, maxCourts: g.maxCourts, fairShare, effectiveCredit: g.courtCredit + fairShare };
  });

  let allocated = 0;
  for (const s of shares) {
    const c = Math.min(Math.floor(s.effectiveCredit), s.maxCourts);
    courts.set(s.id, c);
    allocated += c;
  }

  let remaining = totalCourts - allocated;
  const sortedByFrac = [...shares].sort((a, b) => (b.effectiveCredit % 1) - (a.effectiveCredit % 1));
  for (const s of sortedByFrac) {
    if (remaining <= 0) break;
    const cur = courts.get(s.id) ?? 0;
    if (cur < s.maxCourts) { courts.set(s.id, cur + 1); remaining--; }
  }

  for (const g of eligibleGroups) {
    const min = minCourts.get(g.id) ?? 1;
    const cur = courts.get(g.id) ?? 0;
    if (cur < min) {
      let deficit = min - cur;
      courts.set(g.id, min);
      const donors = [...eligibleGroups].filter(d => d.id !== g.id).sort((a, b) => {
        return ((courts.get(b.id)??0)-(minCourts.get(b.id)??1)) - ((courts.get(a.id)??0)-(minCourts.get(a.id)??1));
      });
      for (const donor of donors) {
        if (deficit <= 0) break;
        const dc = courts.get(donor.id) ?? 0;
        const dm = minCourts.get(donor.id) ?? 1;
        const donated = Math.min(Math.max(0, dc - dm), deficit);
        if (donated > 0) { courts.set(donor.id, dc - donated); deficit -= donated; }
      }
    }
  }

  for (const s of shares) {
    credits.set(s.id, s.effectiveCredit - (courts.get(s.id) ?? 0));
  }
  return { courts, credits };
}

// 간단 시뮬레이션: 8명 + 14명, 4코트, minGames=4
// 각 라운드 코트 배정 시뮬레이션 (선수 선택 상세 생략, 이상적 분배 가정)
const g0 = { id: 'g0', players: 8 };
const g1 = { id: 'g1', players: 14 };
const totalCourts = 4;
const minGames = 4;

// 선수별 게임수 (단순화: 코트 배정 비율로만 추정)
let g0Games = Array(8).fill(0);
let g1Games = Array(14).fill(0);
let g0Rested = 0;
let g1Rested = 0;
let g0CourtTotal = 0;
let g1CourtTotal = 0;
let g0Credit = 0;
let g1Credit = 0;

const allNeed = (games, n) => games.reduce((s, g) => s + Math.max(0, n - g), 0);
const allSatisfied = (games, n) => games.every(g => g >= n);

console.log('Round | g0 courts | g1 courts | g0 avg | g1 avg');
console.log('------+-----------+-----------+--------+--------');

for (let round = 1; round <= 12; round++) {
  const g0Need = allNeed(g0Games, minGames);
  const g1Need = allNeed(g1Games, minGames);

  let g0NeedEff = g0Need;
  let g1NeedEff = g1Need;
  let g0IsActive = true, g1IsActive = true;

  if (allSatisfied(g0Games, minGames)) {
    if (!allSatisfied(g0Games, minGames + 1)) { g0NeedEff = -1; }
    else { g0NeedEff = 0; g0IsActive = false; }
  }
  if (allSatisfied(g1Games, minGames)) {
    if (!allSatisfied(g1Games, minGames + 1)) { g1NeedEff = -1; }
    else { g1NeedEff = 0; g1IsActive = false; }
  }

  const anyActive = g0NeedEff > 0 || g0NeedEff === -1 || g1NeedEff > 0 || g1NeedEff === -1;
  if (g0NeedEff === 0 && anyActive) g0NeedEff = -2;
  if (g1NeedEff === 0 && anyActive) g1NeedEff = -2;

  if (g0NeedEff === 0 && g1NeedEff === 0) break;

  const groups = [
    { id: 'g0', need: g0NeedEff, maxCourts: Math.floor(g0.players / 4), prevRested: g0Rested, playerCount: g0.players, courtCredit: g0Credit },
    { id: 'g1', need: g1NeedEff, maxCourts: Math.floor(g1.players / 4), prevRested: g1Rested, playerCount: g1.players, courtCredit: g1Credit },
  ];

  const { courts: allocMap, credits: newCredits } = allocate(groups, totalCourts);
  const c0 = allocMap.get('g0') ?? 0;
  const c1 = allocMap.get('g1') ?? 0;
  g0Credit = newCredits.get('g0') ?? g0Credit;
  g1Credit = newCredits.get('g1') ?? g1Credit;
  g0CourtTotal += c0;
  g1CourtTotal += c1;

  // 이상적 분배: 코트당 4슬롯, 가장 게임수 적은 선수 우선
  const g0Slots = c0 * 4;
  const g1Slots = c1 * 4;

  // 선수 업데이트 (단순화: 최소 게임수 선수부터 채움)
  const updateGames = (games, slots) => {
    let rested = 0;
    const sorted = games.map((g, i) => ({ g, i })).sort((a, b) => a.g - b.g);
    const toPlay = Math.min(slots, games.length);
    for (let i = 0; i < games.length; i++) {
      if (i < toPlay) games[sorted[i].i]++;
      else rested++;
    }
    return rested;
  };

  g0Rested = g0.players - Math.min(g0Slots, g0.players);
  g1Rested = g1.players - Math.min(g1Slots, g1.players);

  // 실제 게임 증가
  const g0Sorted = [...g0Games].map((g, i) => ({ g, i })).sort((a, b) => a.g - b.g);
  const g1Sorted = [...g1Games].map((g, i) => ({ g, i })).sort((a, b) => a.g - b.g);
  const g0Play = Math.min(g0Slots, g0.players);
  const g1Play = Math.min(g1Slots, g1.players);
  for (let i = 0; i < g0Play; i++) g0Games[g0Sorted[i].i]++;
  for (let i = 0; i < g1Play; i++) g1Games[g1Sorted[i].i]++;

  const g0Avg = (g0Games.reduce((s, g) => s + g, 0) / g0.players).toFixed(2);
  const g1Avg = (g1Games.reduce((s, g) => s + g, 0) / g1.players).toFixed(2);
  console.log(`  ${String(round).padStart(3)} | ${String(c0).padStart(9)} | ${String(c1).padStart(9)} | ${g0Avg.padStart(6)} | ${g1Avg.padStart(6)}`);
}

console.log('\n=== 최종 결과 ===');
console.log(`g0 게임 분포: [${g0Games.sort((a,b)=>a-b).join(',')}] (min=${Math.min(...g0Games)}, max=${Math.max(...g0Games)})`);
console.log(`g1 게임 분포: [${g1Games.sort((a,b)=>a-b).join(',')}] (min=${Math.min(...g1Games)}, max=${Math.max(...g1Games)})`);
console.log(`전체 min=${Math.min(...g0Games,...g1Games)}, max=${Math.max(...g0Games,...g1Games)}, 차이=${Math.max(...g0Games,...g1Games)-Math.min(...g0Games,...g1Games)}`);
console.log(`g0 총 코트슬롯: ${g0CourtTotal}, g1 총 코트슬롯: ${g1CourtTotal}`);

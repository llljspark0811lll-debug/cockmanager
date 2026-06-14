// credit 기반 통합 배분 로직 - 다양한 조건 검증
function allocate(groups, totalCourts) {
  const courts = new Map(groups.map(g => [g.id, 0]));
  const credits = new Map(groups.map(g => [g.id, g.courtCredit]));
  const eligibleGroups = groups.filter(g => g.need !== 0 && g.maxCourts >= 1);
  if (eligibleGroups.length === 0) return { courts, credits };

  const totalPlayers = eligibleGroups.reduce((s, g) => s + g.playerCount, 0);
  const minCourts = new Map(eligibleGroups.map(g => [g.id, Math.min(Math.ceil(g.prevRested / 4), g.maxCourts)]));
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
      const donors = [...eligibleGroups].filter(d => d.id !== g.id).sort((a, b) =>
        ((courts.get(b.id)??0)-(minCourts.get(b.id)??1)) - ((courts.get(a.id)??0)-(minCourts.get(a.id)??1))
      );
      for (const donor of donors) {
        if (deficit <= 0) break;
        const dc = courts.get(donor.id) ?? 0, dm = minCourts.get(donor.id) ?? 1;
        const donated = Math.min(Math.max(0, dc - dm), deficit);
        if (donated > 0) { courts.set(donor.id, dc - donated); deficit -= donated; }
      }
    }
  }

  for (const s of shares) credits.set(s.id, s.effectiveCredit - (courts.get(s.id) ?? 0));
  return { courts, credits };
}

function runSimulation(groupDefs, totalCourts, minGames) {
  const allNeed = (games, n) => games.reduce((s, g) => s + Math.max(0, n - g), 0);
  const allSatisfied = (games, n) => games.every(g => g >= n);

  const state = groupDefs.map(def => ({
    ...def,
    games: Array(def.players).fill(0),
    rested: 0,
    credit: 0,
    courtTotal: 0,
  }));

  const rounds = [];

  for (let round = 1; round <= 20; round++) {
    const rawNeeds = state.map(s =>
      !allSatisfied(s.games, minGames) ? allNeed(s.games, minGames) :
      !allSatisfied(s.games, minGames + 1) ? -1 : 0
    );
    const anyActive = rawNeeds.some(n => n > 0 || n === -1);
    const groupNeeds = rawNeeds.map(n => n === 0 && anyActive ? -2 : n);

    if (groupNeeds.every(n => n === 0)) break;

    const groups = state.map((s, i) => ({
      id: `g${i}`,
      need: groupNeeds[i],
      maxCourts: Math.floor(s.players / 4),
      prevRested: s.rested,
      playerCount: s.players,
      courtCredit: s.credit,
    }));

    const { courts: allocMap, credits: newCredits } = allocate(groups, totalCourts);

    const roundAlloc = {};
    let totalAllocated = 0;
    for (const s of state.map((s, i) => ({ s, i }))) {
      const c = allocMap.get(`g${s.i}`) ?? 0;
      roundAlloc[s.i] = c;
      s.s.credit = newCredits.get(`g${s.i}`) ?? s.s.credit;
      s.s.courtTotal += c;
      totalAllocated += c;
    }
    if (totalAllocated === 0) break;

    rounds.push(roundAlloc);

    // 게임 업데이트 (단순화: 게임수 최솟값 선수 우선)
    for (let i = 0; i < state.length; i++) {
      const s = state[i];
      const slots = roundAlloc[i] * 4;
      const play = Math.min(slots, s.players);
      const sorted = s.games.map((g, idx) => ({ g, idx })).sort((a, b) => a.g - b.g);
      for (let j = 0; j < play; j++) s.games[sorted[j].idx]++;
      s.rested = s.players - play;
    }
  }

  const allGames = state.flatMap(s => s.games);
  const min = Math.min(...allGames), max = Math.max(...allGames);
  const courtPattern = rounds.map(r => `(${Object.values(r).join(',')})`).join(' ');
  const perGroupStats = state.map((s, i) =>
    `g${i}[${s.players}명]: ${s.games.sort((a,b)=>a-b).join(',')} (${s.courtTotal}코트슬롯)`
  );

  return { min, max, diff: max - min, rounds: rounds.length, courtPattern, perGroupStats, state };
}

const cases = [
  // [그룹정의, 총코트, minGames, 설명]
  { groups: [{ players: 8 }, { players: 14 }], courts: 4, min: 4, desc: '8+14명, 4코트 (보고된 케이스)' },
  { groups: [{ players: 5 }, { players: 10 }], courts: 2, min: 4, desc: '5+10명, 2코트' },
  { groups: [{ players: 8 }, { players: 14 }], courts: 3, min: 4, desc: '8+14명, 3코트' },
  { groups: [{ players: 10 }, { players: 10 }], courts: 4, min: 4, desc: '10+10명, 4코트 (동등)' },
  { groups: [{ players: 6 }, { players: 16 }], courts: 4, min: 4, desc: '6+16명, 4코트 (극단 비율)' },
  { groups: [{ players: 4 }, { players: 18 }], courts: 4, min: 4, desc: '4+18명, 4코트 (최소그룹)' },
  { groups: [{ players: 12 }, { players: 12 }], courts: 3, min: 5, desc: '12+12명, 3코트, minGames=5' },
  { groups: [{ players: 8 }, { players: 12 }, { players: 6 }], courts: 4, min: 4, desc: '8+12+6명 3그룹, 4코트' },
  { groups: [{ players: 6 }, { players: 8 }, { players: 10 }], courts: 4, min: 4, desc: '6+8+10명 3그룹, 4코트' },
  { groups: [{ players: 8 }, { players: 14 }], courts: 4, min: 5, desc: '8+14명, 4코트, minGames=5' },
  { groups: [{ players: 8 }, { players: 14 }], courts: 4, min: 3, desc: '8+14명, 4코트, minGames=3' },
  { groups: [{ players: 16 }, { players: 6 }], courts: 4, min: 4, desc: '16+6명, 4코트 (그룹순서 반전)' },
];

console.log('조건별 게임수 균등성 검증\n');
let allPassed = true;
for (const c of cases) {
  const result = runSimulation(c.groups, c.courts, c.min);
  const pass = result.diff <= 1;
  if (!pass) allPassed = false;
  console.log(`${pass ? '✓' : '✗'} ${c.desc}`);
  console.log(`  ${result.rounds}라운드, 차이=${result.diff} (min=${result.min}, max=${result.max})`);
  console.log(`  패턴: ${result.courtPattern}`);
  for (const s of result.perGroupStats) console.log(`  ${s}`);
  console.log('');
}
console.log(allPassed ? '✅ 모든 케이스 통과 (차이 ≤ 1)' : '❌ 일부 케이스 실패');

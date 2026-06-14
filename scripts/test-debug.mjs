// 5+10명 2코트, 4+18명 4코트 실패 케이스 상세 분석
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
    return { courts, credits, fallback: true };
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
  return { courts, credits, fallback: false };
}

function debugCase(groupDefs, totalCourts, minGames, label) {
  console.log(`\n=== ${label} ===`);
  const allNeed = (games, n) => games.reduce((s, g) => s + Math.max(0, n - g), 0);
  const allSatisfied = (games, n) => games.every(g => g >= n);

  const state = groupDefs.map((def, i) => ({
    id: `g${i}`, players: def.players,
    games: Array(def.players).fill(0),
    rested: 0, credit: 0, courtTotal: 0,
  }));

  for (let round = 1; round <= 15; round++) {
    const rawNeeds = state.map(s =>
      !allSatisfied(s.games, minGames) ? allNeed(s.games, minGames) :
      !allSatisfied(s.games, minGames + 1) ? -1 : 0
    );
    const anyActive = rawNeeds.some(n => n > 0 || n === -1);
    const groupNeeds = rawNeeds.map(n => n === 0 && anyActive ? -2 : n);
    if (groupNeeds.every(n => n === 0)) break;

    const groups = state.map(s => ({
      id: s.id, need: groupNeeds[state.indexOf(s)],
      maxCourts: Math.floor(s.players / 4),
      prevRested: s.rested,
      playerCount: s.players,
      courtCredit: s.credit,
    }));

    const { courts: allocMap, credits: newCredits, fallback } = allocate(groups, totalCourts);

    const alloc = state.map(s => allocMap.get(s.id) ?? 0);
    const courtStr = `(${alloc.join(',')})`;
    const needStr = groupNeeds.map((n,i) => `g${i}:${n>0?'act':n===-1?'fil':n===-2?'sfil':'done'}`).join(' ');
    const creditStr = state.map((s,i) => `cr${i}:${s.credit.toFixed(2)}`).join(' ');
    const restedStr = state.map((s,i) => `r${i}:${s.rested}`).join(' ');
    console.log(`R${String(round).padStart(2)}: ${courtStr}${fallback?'[FALLBACK]':''} | ${needStr} | ${creditStr} | ${restedStr}`);

    let anyAlloc = false;
    for (const s of state) {
      const c = allocMap.get(s.id) ?? 0;
      s.credit = newCredits.get(s.id) ?? s.credit;
      s.courtTotal += c;
      if (c > 0) anyAlloc = true;
      const slots = c * 4;
      const play = Math.min(slots, s.players);
      const sorted = s.games.map((g, idx) => ({ g, idx })).sort((a, b) => a.g - b.g);
      for (let j = 0; j < play; j++) s.games[sorted[j].idx]++;
      s.rested = s.players - play;
    }
    if (!anyAlloc) break;
  }

  const allGames = state.flatMap(s => s.games);
  console.log('결과:');
  state.forEach(s => console.log(`  g[${s.players}명]: games=[${s.games.sort((a,b)=>a-b).join(',')}], totalCourts=${s.courtTotal}`));
  console.log(`  전체 min=${Math.min(...allGames)}, max=${Math.max(...allGames)}, 차이=${Math.max(...allGames)-Math.min(...allGames)}`);
}

debugCase([{ players: 5 }, { players: 10 }], 2, 4, '5+10명, 2코트');
debugCase([{ players: 4 }, { players: 18 }], 4, 4, '4+18명, 4코트');

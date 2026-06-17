import { generateSessionBracketLevelGroups, type LevelGroupBracketInput } from "../lib/session-bracket";

function makePlayer(id: string, name: string, level: string, gender: "남" | "여") {
  return { playerId: id, participantId: Number(id), name, level, gender, age: 30, isGuest: true, hostName: null };
}

const groups: LevelGroupBracketInput[] = [
  {
    groupId: "level_2", groupName: "A",
    players: [
      makePlayer("1", "남A1", "2", "남"), makePlayer("2", "남A2", "2", "남"),
      makePlayer("3", "여A1", "2", "여"), makePlayer("4", "여A2", "2", "여"), makePlayer("5", "여A3", "2", "여"),
    ],
    fixedPairs: [],
  },
  {
    groupId: "level_3", groupName: "B",
    players: [
      makePlayer("6", "남B1", "3", "남"), makePlayer("7", "남B2", "3", "남"),
      makePlayer("8", "여B1", "3", "여"), makePlayer("9", "여B2", "3", "여"),
      makePlayer("10", "여B3", "3", "여"), makePlayer("11", "여B4a", "3", "여"), makePlayer("12", "여B4b", "3", "여"),
    ],
    fixedPairs: [],
  },
  {
    groupId: "level_4", groupName: "C",
    players: [
      makePlayer("13", "남C1", "4", "남"), makePlayer("14", "남C2", "4", "남"), makePlayer("15", "남C3", "4", "남"),
      makePlayer("16", "여C1", "4", "여"), makePlayer("17", "여C2", "4", "여"),
    ],
    fixedPairs: [],
  },
];

const results = generateSessionBracketLevelGroups(groups, 4, 4, false, false, 42);

const roundCounts = results.map(r => r.rounds.length);
console.log(`\n총 라운드 수: ${Math.max(...roundCounts)}`);

for (const result of results) {
  const group = groups.find(g => g.groupId === result.groupId)!;
  console.log(`\n=== ${group.groupName}그룹 (${result.rounds.length}라운드) ===`);

  for (const round of result.rounds) {
    const playing = round.matches.flatMap((m: { teamA: { players: { name: string }[] }; teamB: { players: { name: string }[] } }) => [...m.teamA.players, ...m.teamB.players]).map((p: { name: string }) => p.name);
    const resting = (round.restingPlayers as { name: string }[] | undefined)?.map(p => p.name) ?? [];
    console.log(`  R${round.roundNumber}: 경기[${playing.join(",")}] 휴식[${resting.join(",")}]`);
  }

  const stats = result.summary.playerStats.sort((a: { games: number }, b: { games: number }) => a.games - b.games);
  const minG = stats[0]?.games ?? 0;
  const maxG = stats[stats.length - 1]?.games ?? 0;
  console.log(`  경기수: 최소 ${minG} ~ 최대 ${maxG}`);
  for (const s of stats) {
    console.log(`    ${s.name}: ${s.games}경기 ${s.rests}휴식`);
  }
}

import { generateSessionBracket } from "../lib/session-bracket";

// 실제 상황: B5 C5 D2, 전원 20-30대 (나이 보정 없음)
const players = [
  { playerId: "b1", participantId: 1,  name: "B1", gender: "남", level: "B", age: 25, isGuest: false, hostName: null },
  { playerId: "b2", participantId: 2,  name: "B2", gender: "남", level: "B", age: 28, isGuest: false, hostName: null },
  { playerId: "b3", participantId: 3,  name: "B3", gender: "남", level: "B", age: 30, isGuest: false, hostName: null },
  { playerId: "b4", participantId: 4,  name: "B4", gender: "남", level: "B", age: 32, isGuest: false, hostName: null },
  { playerId: "b5", participantId: 5,  name: "B5", gender: "남", level: "B", age: 35, isGuest: false, hostName: null },
  { playerId: "c1", participantId: 6,  name: "C1", gender: "남", level: "C", age: 25, isGuest: false, hostName: null },
  { playerId: "c2", participantId: 7,  name: "C2", gender: "남", level: "C", age: 27, isGuest: false, hostName: null },
  { playerId: "c3", participantId: 8,  name: "C3", gender: "남", level: "C", age: 30, isGuest: false, hostName: null },
  { playerId: "c4", participantId: 9,  name: "C4", gender: "남", level: "C", age: 33, isGuest: false, hostName: null },
  { playerId: "c5", participantId: 10, name: "C5", gender: "남", level: "C", age: 36, isGuest: false, hostName: null },
  { playerId: "d1", participantId: 11, name: "D1", gender: "남", level: "D", age: 28, isGuest: false, hostName: null },
  { playerId: "d2", participantId: 12, name: "D2", gender: "남", level: "D", age: 31, isGuest: false, hostName: null },
];

// 여러 시드로 반복 테스트
for (const seed of [1, 2, 3, 42, 100]) {
  const result = generateSessionBracket({
    players, courtCount: 3, minGamesPerPlayer: 4, separateByGender: true, seed,
  });
  const r1 = result.rounds[0]!;
  const labels = r1.matches.map((m) => {
    const a = m.teamA.players.map((p) => p.level).join("");
    const b = m.teamB.players.map((p) => p.level).join("");
    return `[${a} vs ${b}]`;
  });
  console.log(`seed=${seed}:`, labels.join("  "));
}

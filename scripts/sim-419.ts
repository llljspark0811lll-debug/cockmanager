import { generateSessionBracket } from "../lib/session-bracket";

// 4/19 정기모임 실제 REGISTERED 참가자 (16명)
// 남자: 5B남 + 6C남 + 1D남 = 12명
// 여자: 2B여 + 1C여 + 1D여 = 4명
const players = [
  // B남 5명
  { playerId: "m1", participantId:1,  name:"박준성", gender:"남", level:"B", age:37, isGuest:false, hostName:null },
  { playerId: "m2", participantId:2,  name:"이승현", gender:"남", level:"B", age:26, isGuest:false, hostName:null },
  { playerId: "m3", participantId:3,  name:"조장휘", gender:"남", level:"B", age:25, isGuest:false, hostName:null },
  { playerId: "m4", participantId:4,  name:"정현우", gender:"남", level:"B", age:26, isGuest:false, hostName:null },
  { playerId: "m5", participantId:5,  name:"박상현", gender:"남", level:"B", age:29, isGuest:false, hostName:null },
  // C남 6명
  { playerId: "m6", participantId:6,  name:"이정헌", gender:"남", level:"C", age:36, isGuest:false, hostName:null },
  { playerId: "m7", participantId:7,  name:"김재구", gender:"남", level:"C", age:25, isGuest:false, hostName:null },
  { playerId: "m8", participantId:8,  name:"김규민", gender:"남", level:"C", age:25, isGuest:false, hostName:null },
  { playerId: "m9", participantId:9,  name:"손상문", gender:"남", level:"C", age:31, isGuest:false, hostName:null },
  { playerId:"m10", participantId:10, name:"이승윤", gender:"남", level:"C", age:32, isGuest:false, hostName:null },
  { playerId:"m11", participantId:11, name:"원태귀", gender:"남", level:"C", age:28, isGuest:false, hostName:null },
  // D남 1명
  { playerId:"m12", participantId:12, name:"손재우", gender:"남", level:"D", age:37, isGuest:false, hostName:null },
  // B여 2명
  { playerId: "f1", participantId:13, name:"이화윤", gender:"여", level:"B", age:34, isGuest:false, hostName:null },
  { playerId: "f2", participantId:14, name:"이원경", gender:"여", level:"B", age:30, isGuest:false, hostName:null },
  // C여 1명
  { playerId: "f3", participantId:15, name:"배민경", gender:"여", level:"C", age:36, isGuest:false, hostName:null },
  // D여 1명
  { playerId: "f4", participantId:16, name:"박지민", gender:"여", level:"D", age:24, isGuest:false, hostName:null },
];

console.log("=== 4/19 정기모임 시뮬레이션 (남:5B+6C+1D, 여:2B+1C+1D, 3코트, separateByGender=true) ===\n");

let bbCount = 0; let ccCount = 0; const total = 20;

for (let i = 0; i < total; i++) {
  const seed = i * 137 + 42;
  const result = generateSessionBracket({ players, courtCount: 3, minGamesPerPlayer: 4, separateByGender: true, seed });
  const r1 = result.rounds[0]!;

  const maleMatches = r1.matches.filter(m => m.teamA.players.every(p => ["남"].includes(players.find(x=>x.playerId===p.playerId)?.gender ?? "")));

  const labels = r1.matches.map(m => {
    const a = m.teamA.players.map(p => {
      const lv = p.level; // normalized: "3"=B, "4"=C, "5"=D
      return lv === "3" ? "B" : lv === "4" ? "C" : lv === "5" ? "D" : lv;
    }).join("");
    const b = m.teamB.players.map(p => {
      const lv = p.level;
      return lv === "3" ? "B" : lv === "4" ? "C" : lv === "5" ? "D" : lv;
    }).join("");
    return `[${a}vs${b}]`;
  });

  const hasBB = labels.some(l => l === "[BBvsBB]");
  const hasCC = labels.some(l => l === "[CCvsCC]");
  if (hasBB) bbCount++;
  if (hasCC) ccCount++;

  const hasDmixed = labels.some(l => l.includes("D") && !l.includes("DD"));
  console.log(`seed=${String(seed).padStart(5)}: ${labels.join("  ")}${hasDmixed ? "  ← D혼합" : ""}`);
}

console.log(`\nBBvsBB: ${bbCount}/${total}`);
console.log(`CCvsCC: ${ccCount}/${total}`);

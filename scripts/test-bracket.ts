import { generateSessionBracket } from "../lib/session-bracket";
import type { SessionBracketGenerationInput, SessionBracketPlayerInput } from "../lib/session-bracket";

let passed = 0;
let failed = 0;
let errored = 0;
const failedCases: string[] = [];

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function makePlayer(
  id: string,
  name: string,
  gender: string,
  level: string
): SessionBracketPlayerInput {
  return { playerId: id, participantId: parseInt(id), name, gender, level, isGuest: false, hostName: null };
}

const DEFAULT_LEVELS = ["B", "C", "C", "D", "A"];

function makePlayers(
  count: number,
  gender: string,
  startId = 0,
  levels = DEFAULT_LEVELS
): SessionBracketPlayerInput[] {
  return Array.from({ length: count }, (_, i) =>
    makePlayer(
      String(startId + i + 1),
      `${gender === "남" ? "M" : "F"}${startId + i + 1}`,
      gender,
      levels[i % levels.length]!
    )
  );
}

function countGender(players: SessionBracketPlayerInput[], gender: string) {
  const aliases = gender === "남"
    ? ["남", "남자", "m", "male"]
    : ["여", "여자", "f", "female"];
  return players.filter(p => aliases.includes(p.gender.trim().toLowerCase())).length;
}

// ─── 검증 로직 ────────────────────────────────────────────────────────────────

function validate(
  name: string,
  input: SessionBracketGenerationInput,
  expectThrow = false
) {
  try {
    const result = generateSessionBracket({ ...input, seed: 12345 });

    if (expectThrow) {
      console.log(`❌ FAIL [예외 미발생] ${name}`);
      failed++;
      failedCases.push(name);
      return;
    }

    const { rounds, summary, config } = result;
    const errors: string[] = [];

    // ① 모든 선수 최소 경기 수 충족
    for (const stat of summary.playerStats) {
      if (stat.games < config.minGamesPerPlayer) {
        errors.push(`미충족: ${stat.name} → ${stat.games}경기 (최소 ${config.minGamesPerPlayer})`);
      }
    }

    // ② 연속 휴식 없음
    const lastRestRound = new Map<string, number>();
    for (const round of rounds) {
      for (const resting of round.restingPlayers) {
        const prev = lastRestRound.get(resting.playerId);
        if (prev !== undefined && prev === round.roundNumber - 1) {
          errors.push(`연속휴식: ${resting.name} (${prev}R → ${round.roundNumber}R)`);
        }
        lastRestRound.set(resting.playerId, round.roundNumber);
      }
    }

    // ③ 코트 최대 활용 (이론적 최대치와 비교)
    const menCount = countGender(input.players, "남");
    const womenCount = countGender(input.players, "여");

    const theoreticalMax = config.separateByGender
      ? Math.min(config.courtCount, Math.floor(menCount / 4) + Math.floor(womenCount / 4))
      : Math.min(config.courtCount, Math.floor(input.players.length / 4));

    for (const round of rounds) {
      if (round.matches.length < theoreticalMax) {
        const restNames = round.restingPlayers.map(p => p.name).join(", ");
        errors.push(
          `코트미사용: ${round.roundNumber}R → ${round.matches.length}/${theoreticalMax}코트 사용 (휴식: ${restNames})`
        );
      }
    }

    // ④ 성별 분리 시 같은 성별끼리만 경기
    if (config.separateByGender) {
      for (const round of rounds) {
        for (const match of round.matches) {
          const genders = new Set([...match.teamA.players, ...match.teamB.players].map(p => p.gender));
          if (genders.size > 1) {
            errors.push(`성별혼합: ${round.roundNumber}R 코트${match.courtNumber}`);
          }
        }
      }
    }

    // ⑤ 각 경기 정확히 4명
    for (const round of rounds) {
      for (const match of round.matches) {
        const total = match.teamA.players.length + match.teamB.players.length;
        if (total !== 4) {
          errors.push(`인원오류: ${round.roundNumber}R 코트${match.courtNumber} → ${total}명`);
        }
      }
    }

    if (errors.length > 0) {
      const info = `[${input.players.length}명, ${config.courtCount}코트, 최소${config.minGamesPerPlayer}경기${config.separateByGender ? ", 분리" : ""}]`;
      console.log(`❌ FAIL ${name} ${info} → ${rounds.length}R/${summary.totalMatches}경기`);
      errors.forEach(e => console.log(`      └ ${e}`));
      failed++;
      failedCases.push(name);
    } else {
      const info = `[${input.players.length}명, ${config.courtCount}코트, 최소${config.minGamesPerPlayer}경기${config.separateByGender ? ", 분리" : ""}]`;
      console.log(`✅ PASS ${name} ${info} → ${rounds.length}R/${summary.totalMatches}경기`);
      passed++;
    }
  } catch (e) {
    if (expectThrow) {
      console.log(`✅ PASS ${name} [예상 예외: ${e instanceof Error ? e.message.slice(0, 70) : String(e)}]`);
      passed++;
    } else {
      console.log(`💥 ERROR ${name}: ${e instanceof Error ? e.message : String(e)}`);
      errored++;
      failedCases.push(name);
    }
  }
}

// ─── 테스트 케이스 ────────────────────────────────────────────────────────────

console.log("\n══════════════════════════════════════════════");
console.log("  자동대진 알고리즘 전체 검증");
console.log("══════════════════════════════════════════════\n");

// ── 1. 일반 모드 (성별 분리 없음) ──────────────────────────────────────────────
console.log("── 일반 모드 (성별 분리 없음) ──────────────────");

validate("일반_4명_1코트_min4", { players: makePlayers(4, "남"), courtCount: 1, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_5명_1코트_min4", { players: makePlayers(5, "남"), courtCount: 1, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_6명_1코트_min4", { players: makePlayers(6, "남"), courtCount: 1, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_7명_2코트_min4", { players: makePlayers(7, "남"), courtCount: 2, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_8명_2코트_min4", { players: makePlayers(8, "남"), courtCount: 2, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_9명_2코트_min4", { players: makePlayers(9, "남"), courtCount: 2, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_10명_2코트_min4", { players: makePlayers(10, "남"), courtCount: 2, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_11명_3코트_min4", { players: makePlayers(11, "남"), courtCount: 3, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_12명_3코트_min4", { players: makePlayers(12, "남"), courtCount: 3, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_13명_3코트_min4", { players: makePlayers(13, "남"), courtCount: 3, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_14명_3코트_min4", { players: makePlayers(14, "남"), courtCount: 3, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_15명_3코트_min4", { players: makePlayers(15, "남"), courtCount: 3, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_16명_3코트_min4", { players: makePlayers(16, "남"), courtCount: 3, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_16명_4코트_min4", { players: makePlayers(16, "남"), courtCount: 4, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_20명_4코트_min4", { players: makePlayers(20, "남"), courtCount: 4, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_24명_4코트_min4", { players: makePlayers(24, "남"), courtCount: 4, minGamesPerPlayer: 4, separateByGender: false });
validate("일반_16명_3코트_min6", { players: makePlayers(16, "남"), courtCount: 3, minGamesPerPlayer: 6, separateByGender: false });
validate("일반_16명_3코트_min8", { players: makePlayers(16, "남"), courtCount: 3, minGamesPerPlayer: 8, separateByGender: false });
validate("일반_20명_5코트_min5", { players: makePlayers(20, "남"), courtCount: 5, minGamesPerPlayer: 5, separateByGender: false });

// ── 2. 성별 분리 — 균형 케이스 ────────────────────────────────────────────────
console.log("\n── 성별 분리 — 균형 케이스 ─────────────────────");

validate("분리_4남4여_2코트_min4", { players: [...makePlayers(4, "남"), ...makePlayers(4, "여", 4)], courtCount: 2, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_8남8여_4코트_min4", { players: [...makePlayers(8, "남"), ...makePlayers(8, "여", 8)], courtCount: 4, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_8남8여_2코트_min4", { players: [...makePlayers(8, "남"), ...makePlayers(8, "여", 8)], courtCount: 2, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_12남12여_4코트_min4", { players: [...makePlayers(12, "남"), ...makePlayers(12, "여", 12)], courtCount: 4, minGamesPerPlayer: 4, separateByGender: true });

// ── 3. 성별 분리 — 남 > 여 비대칭 (오늘 버그 유형) ────────────────────────────
console.log("\n── 성별 분리 — 남 > 여 비대칭 ─────────────────");

validate("분리_9남7여_3코트_min4", { players: [...makePlayers(9, "남"), ...makePlayers(7, "여", 9)], courtCount: 3, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_9남7여_3코트_min6", { players: [...makePlayers(9, "남"), ...makePlayers(7, "여", 9)], courtCount: 3, minGamesPerPlayer: 6, separateByGender: true });
validate("분리_8남4여_3코트_min4", { players: [...makePlayers(8, "남"), ...makePlayers(4, "여", 8)], courtCount: 3, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_8남4여_3코트_min6", { players: [...makePlayers(8, "남"), ...makePlayers(4, "여", 8)], courtCount: 3, minGamesPerPlayer: 6, separateByGender: true });
validate("분리_10남6여_4코트_min4", { players: [...makePlayers(10, "남"), ...makePlayers(6, "여", 10)], courtCount: 4, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_12남4여_4코트_min4", { players: [...makePlayers(12, "남"), ...makePlayers(4, "여", 12)], courtCount: 4, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_11남5여_3코트_min4", { players: [...makePlayers(11, "남"), ...makePlayers(5, "여", 11)], courtCount: 3, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_13남7여_4코트_min4", { players: [...makePlayers(13, "남"), ...makePlayers(7, "여", 13)], courtCount: 4, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_16남8여_5코트_min4", { players: [...makePlayers(16, "남"), ...makePlayers(8, "여", 16)], courtCount: 5, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_9남5여_3코트_min4", { players: [...makePlayers(9, "남"), ...makePlayers(5, "여", 9)], courtCount: 3, minGamesPerPlayer: 4, separateByGender: true });

// ── 4. 성별 분리 — 여 > 남 비대칭 (역전 케이스) ────────────────────────────────
console.log("\n── 성별 분리 — 여 > 남 비대칭 ─────────────────");

validate("분리_7남9여_3코트_min4", { players: [...makePlayers(7, "남"), ...makePlayers(9, "여", 7)], courtCount: 3, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_4남8여_3코트_min4", { players: [...makePlayers(4, "남"), ...makePlayers(8, "여", 4)], courtCount: 3, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_6남10여_4코트_min4", { players: [...makePlayers(6, "남"), ...makePlayers(10, "여", 6)], courtCount: 4, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_5남9여_3코트_min4", { players: [...makePlayers(5, "남"), ...makePlayers(9, "여", 5)], courtCount: 3, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_5남11여_4코트_min4", { players: [...makePlayers(5, "남"), ...makePlayers(11, "여", 5)], courtCount: 4, minGamesPerPlayer: 4, separateByGender: true });

// ── 5. 성별 분리 — 코트 > 이론적 최대 케이스 ───────────────────────────────────
console.log("\n── 성별 분리 — 코트 > 이론적 최대 ─────────────");

// floor(6/4)+floor(6/4)=2 < courtCount=3 → 2코트만 써야 정상
validate("분리_6남6여_3코트_min4 [코트3>이론2]", { players: [...makePlayers(6, "남"), ...makePlayers(6, "여", 6)], courtCount: 3, minGamesPerPlayer: 4, separateByGender: true });
// floor(5/4)+floor(7/4)=1+1=2 < courtCount=3 → 2코트
validate("분리_5남7여_3코트_min4 [코트3>이론2]", { players: [...makePlayers(5, "남"), ...makePlayers(7, "여", 5)], courtCount: 3, minGamesPerPlayer: 4, separateByGender: true });
// floor(8/4)+floor(6/4)=2+1=3 < courtCount=4 → 3코트
validate("분리_8남6여_4코트_min4 [코트4>이론3]", { players: [...makePlayers(8, "남"), ...makePlayers(6, "여", 8)], courtCount: 4, minGamesPerPlayer: 4, separateByGender: true });

// ── 6. 단일 성별 (분리 옵션 켜도 한 쪽만) ─────────────────────────────────────
console.log("\n── 단일 성별 ────────────────────────────────────");

validate("분리_8남0여_2코트_min4 [전원남]", { players: makePlayers(8, "남"), courtCount: 2, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_0남8여_2코트_min4 [전원여]", { players: makePlayers(8, "여"), courtCount: 2, minGamesPerPlayer: 4, separateByGender: true });
validate("분리_9남0여_2코트_min4 [전원남홀수]", { players: makePlayers(9, "남"), courtCount: 2, minGamesPerPlayer: 4, separateByGender: true });

// ── 7. 대규모 케이스 ──────────────────────────────────────────────────────────
console.log("\n── 대규모 케이스 ────────────────────────────────");

validate("대규모_20남16여_5코트_min4", { players: [...makePlayers(20, "남"), ...makePlayers(16, "여", 20)], courtCount: 5, minGamesPerPlayer: 4, separateByGender: true });
validate("대규모_24남16여_6코트_min4", { players: [...makePlayers(24, "남"), ...makePlayers(16, "여", 24)], courtCount: 6, minGamesPerPlayer: 4, separateByGender: true });
validate("대규모_일반_32명_8코트_min4", { players: makePlayers(32, "남"), courtCount: 8, minGamesPerPlayer: 4, separateByGender: false });

// ── 8. 다양한 최소 경기 수 ────────────────────────────────────────────────────
console.log("\n── 다양한 최소 경기 수 ──────────────────────────");

validate("min경기_9남7여_3코트_min3", { players: [...makePlayers(9, "남"), ...makePlayers(7, "여", 9)], courtCount: 3, minGamesPerPlayer: 3, separateByGender: true });
validate("min경기_9남7여_3코트_min5", { players: [...makePlayers(9, "남"), ...makePlayers(7, "여", 9)], courtCount: 3, minGamesPerPlayer: 5, separateByGender: true });
validate("min경기_9남7여_3코트_min6", { players: [...makePlayers(9, "남"), ...makePlayers(7, "여", 9)], courtCount: 3, minGamesPerPlayer: 6, separateByGender: true });
validate("min경기_16명_3코트_min2", { players: makePlayers(16, "남"), courtCount: 3, minGamesPerPlayer: 2, separateByGender: false });
validate("min경기_16명_3코트_min10", { players: makePlayers(16, "남"), courtCount: 3, minGamesPerPlayer: 10, separateByGender: false });

// ── 9. 예외 케이스 (3명 이하) ─────────────────────────────────────────────────
console.log("\n── 예외 케이스 ──────────────────────────────────");

validate("예외_3명_1코트_min4 [4명미만 예외]", { players: makePlayers(3, "남"), courtCount: 1, minGamesPerPlayer: 4, separateByGender: false }, true);

// ── 결과 요약 ─────────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════");
console.log(`  결과: ✅ ${passed}개 통과  /  ❌ ${failed}개 실패  /  💥 ${errored}개 오류`);
console.log(`  총 테스트: ${passed + failed + errored}개`);
if (failedCases.length > 0) {
  console.log("\n  실패/오류 케이스:");
  failedCases.forEach(c => console.log(`    • ${c}`));
}
console.log("══════════════════════════════════════════════\n");

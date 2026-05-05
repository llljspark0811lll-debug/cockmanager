import type {
  SessionBracketConfig,
  SessionBracketMatch,
  SessionBracketPlayerEntry,
  SessionBracketPlayerStat,
  SessionBracketRound,
  SessionBracketSummary,
} from "@/components/dashboard/types";

export type SessionBracketPlayerInput = {
  playerId: string;
  participantId: number;
  name: string;
  gender: string;
  level: string;
  birth?: string | Date | null;
  age?: number | null;
  isGuest: boolean;
  hostName: string | null;
};

export type SessionBracketGenerationInput = {
  players: SessionBracketPlayerInput[];
  courtCount: number;
  minGamesPerPlayer: number;
  separateByGender: boolean;
  generationMode?: "STANDARD" | "TEAM_BATTLE";
  teamAssignments?: Record<string, "A" | "B">;
  teamLabels?: {
    A: string;
    B: string;
  };
  fixedPairs?: Array<[string, string]>;
  seed?: number;
};

type DivisionKey = "ALL" | "MEN" | "WOMEN";
type InternalPlayer = SessionBracketPlayerEntry & {
  age: number | null;
};
type RandomFn = () => number;

type PlayerState = {
  games: number;
  rests: number;
  lastPlayedRound: number;
};

type Pool = {
  key: DivisionKey;
  label: string;
  players: InternalPlayer[];
};

type TeamBattleSide = "A" | "B";

type TeamBattlePool = {
  key: DivisionKey;
  label: string;
  teamAPlayers: InternalPlayer[];
  teamBPlayers: InternalPlayer[];
};

type MatchCandidate = {
  match: SessionBracketMatch;
  playerIds: string[];
  score: number;
};

const LEVEL_SCORE_MAP: Record<string, number> = {
  S: 7,
  A: 6,
  B: 5,
  C: 4,
  D: 3,
  E: 2,
  초심: 1,
};

const BALANCE_GAP_WEIGHT = 14;
const OPPONENT_REPEAT_WEIGHT = 15;
const FIXED_PAIR_REPEAT_WEIGHT = 80;
const FIXED_PAIR_STRONG_TEAM_THRESHOLD = 10;

function hasFixedPair(
  teamPlayers: InternalPlayer[],
  fixedPairMap: Map<string, string>
) {
  if (teamPlayers.length !== 2) {
    return false;
  }

  const [first, second] = teamPlayers;
  return (
    fixedPairMap.get(first!.playerId) === second!.playerId ||
    fixedPairMap.get(second!.playerId) === first!.playerId
  );
}

function getFixedPairBalanceProtectionPenalty(
  teamAPlayers: InternalPlayer[],
  teamBPlayers: InternalPlayer[],
  teamATotal: number,
  teamBTotal: number,
  balanceGap: number,
  fixedPairMap: Map<string, string>
) {
  const teamAIsFixedPair = hasFixedPair(teamAPlayers, fixedPairMap);
  const teamBIsFixedPair = hasFixedPair(teamBPlayers, fixedPairMap);

  if (!teamAIsFixedPair && !teamBIsFixedPair) {
    return 0;
  }

  const strongerTotal = Math.max(teamATotal, teamBTotal);

  if (strongerTotal < FIXED_PAIR_STRONG_TEAM_THRESHOLD) {
    return 0;
  }

  if (balanceGap >= 4) {
    return 40;
  }

  if (balanceGap >= 3) {
    return 20;
  }

  return 0;
}

function createSeededRandom(seed: number): RandomFn {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleArray<T>(items: T[], random: RandomFn) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[nextIndex]] = [
      shuffled[nextIndex]!,
      shuffled[index]!,
    ];
  }

  return shuffled;
}

function normalizeGender(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (["남", "남자", "m", "male"].includes(normalized)) {
    return "남";
  }

  if (["여", "여자", "f", "female"].includes(normalized)) {
    return "여";
  }

  return String(value ?? "").trim() || "미정";
}

function normalizeLevel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return "초심";
  }

  const upper = normalized.toUpperCase();
  if (LEVEL_SCORE_MAP[upper] !== undefined) {
    return upper;
  }

  if (normalized === "초심") {
    return normalized;
  }

  return normalized;
}

function getLevelScore(level: string) {
  return LEVEL_SCORE_MAP[level] ?? LEVEL_SCORE_MAP["초심"];
}

function normalizeAge(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const age = Math.floor(Number(value));
  return age > 0 ? age : null;
}

function getAgeFromBirth(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const birthDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthGap = today.getMonth() - birthDate.getMonth();

  if (
    monthGap < 0 ||
    (monthGap === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age > 0 ? age : null;
}

function getAgeBandAdjustment(age: number | null) {
  if (age === null) {
    return 0;
  }

  if (age >= 60) {
    return -3;
  }

  if (age >= 50) {
    return -2;
  }

  if (age >= 40) {
    return -1;
  }

  return 0;
}

function getGenderAdjustment(gender: string, separateByGender: boolean) {
  if (separateByGender) {
    return 0;
  }

  const normalized = String(gender ?? "").trim().toLowerCase();
  return ["여", "여자", "f", "female"].includes(normalized) ? -1 : 0;
}

function getAdjustedPlayerScore(
  level: string,
  gender: string,
  age: number | null,
  separateByGender: boolean
) {
  const ageBalanceLevels = ["S", "A", "B", "C", "D"] as const;
  const genderBalanceLevels = ["S", "A", "B", "C", "D", "초심"] as const;
  const levelIndex = ageBalanceLevels.indexOf(
    level as (typeof ageBalanceLevels)[number]
  );

  if (levelIndex === -1) {
    return getLevelScore(level);
  }

  const agePenalty = Math.abs(getAgeBandAdjustment(age));
  const ageAdjustedIndex = Math.min(
    ageBalanceLevels.length - 1,
    levelIndex + agePenalty
  );
  const ageAdjustedLevel = ageBalanceLevels[ageAdjustedIndex]!;

  const genderPenalty = Math.abs(
    getGenderAdjustment(gender, separateByGender)
  );
  const genderBaseIndex = genderBalanceLevels.indexOf(ageAdjustedLevel);
  const adjustedIndex = Math.min(
    genderBalanceLevels.length - 1,
    genderBaseIndex + genderPenalty
  );

  return getLevelScore(genderBalanceLevels[adjustedIndex]!);
}

function createPlayerEntry(
  input: SessionBracketPlayerInput,
  separateByGender: boolean
): InternalPlayer {
  const gender = normalizeGender(input.gender);
  const level = normalizeLevel(input.level);
  const age = normalizeAge(input.age) ?? getAgeFromBirth(input.birth);

  return {
    playerId: input.playerId,
    participantId: input.participantId,
    name: input.name.trim(),
    gender,
    level,
    score: getAdjustedPlayerScore(level, gender, age, separateByGender),
    age,
    isGuest: input.isGuest,
    hostName: input.hostName,
  };
}

function buildPools(
  players: InternalPlayer[],
  separateByGender: boolean
) {
  if (!separateByGender) {
    return [
      {
        key: "ALL" as const,
        label: "통합 복식",
        players,
      },
    ];
  }

  const invalidPlayers = players.filter(
    (player) => !["남", "여"].includes(player.gender)
  );

  if (invalidPlayers.length > 0) {
    throw new Error(
      `남복/여복 분리 생성은 모든 참가자의 성별 정보가 필요합니다. ${invalidPlayers
        .map((player) => player.name)
        .join(", ")} 참가자의 성별을 먼저 확인해 주세요.`
    );
  }

  return [
    {
      key: "MEN" as const,
      label: "남복",
      players: players.filter((player) => player.gender === "남"),
    },
    {
      key: "WOMEN" as const,
      label: "여복",
      players: players.filter((player) => player.gender === "여"),
    },
  ].filter((pool) => pool.players.length > 0);
}

function getTeamBattleLabel(
  division: DivisionKey,
  teamLabels: { A: string; B: string }
) {
  if (division === "MEN") {
    return `${teamLabels.A} 남복 vs ${teamLabels.B} 남복`;
  }

  if (division === "WOMEN") {
    return `${teamLabels.A} 여복 vs ${teamLabels.B} 여복`;
  }

  return `${teamLabels.A} vs ${teamLabels.B}`;
}

function buildTeamBattlePools(
  players: InternalPlayer[],
  separateByGender: boolean,
  teamAssignments: Record<string, "A" | "B">,
  teamLabels: { A: string; B: string }
) {
  const unassignedPlayers = players.filter(
    (player) => !teamAssignments[player.playerId]
  );

  if (unassignedPlayers.length > 0) {
    throw new Error(
      `팀 대항 자동대진은 모든 참가자를 팀에 배정해야 합니다. ${unassignedPlayers
        .map((player) => player.name)
        .join(", ")} 참가자의 팀을 선택해 주세요.`
    );
  }

  if (!separateByGender) {
    return [
      {
        key: "ALL" as const,
        label: getTeamBattleLabel("ALL", teamLabels),
        teamAPlayers: players.filter(
          (player) => teamAssignments[player.playerId] === "A"
        ),
        teamBPlayers: players.filter(
          (player) => teamAssignments[player.playerId] === "B"
        ),
      },
    ];
  }

  const invalidPlayers = players.filter(
    (player) => !["남", "여"].includes(player.gender)
  );

  if (invalidPlayers.length > 0) {
    throw new Error(
      `남복/여복 분리 생성은 모든 참가자의 성별 정보가 필요합니다. ${invalidPlayers
        .map((player) => player.name)
        .join(", ")} 참가자의 성별을 먼저 확인해 주세요.`
    );
  }

  return [
    {
      key: "MEN" as const,
      label: getTeamBattleLabel("MEN", teamLabels),
      teamAPlayers: players.filter(
        (player) =>
          teamAssignments[player.playerId] === "A" && player.gender === "남"
      ),
      teamBPlayers: players.filter(
        (player) =>
          teamAssignments[player.playerId] === "B" && player.gender === "남"
      ),
    },
    {
      key: "WOMEN" as const,
      label: getTeamBattleLabel("WOMEN", teamLabels),
      teamAPlayers: players.filter(
        (player) =>
          teamAssignments[player.playerId] === "A" && player.gender === "여"
      ),
      teamBPlayers: players.filter(
        (player) =>
          teamAssignments[player.playerId] === "B" && player.gender === "여"
      ),
    },
  ].filter(
    (pool) => pool.teamAPlayers.length > 0 || pool.teamBPlayers.length > 0
  );
}

function keyForPair(leftId: string, rightId: string) {
  return [leftId, rightId].sort().join(":");
}

function sortPlayersForSelection(
  players: InternalPlayer[],
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>
) {
  return [...players].sort((left, right) => {
    const leftMustPlay = previousRested.has(left.playerId) ? 0 : 1;
    const rightMustPlay = previousRested.has(right.playerId) ? 0 : 1;

    if (leftMustPlay !== rightMustPlay) {
      return leftMustPlay - rightMustPlay;
    }

    const leftState = states.get(left.playerId)!;
    const rightState = states.get(right.playerId)!;

    const leftNeedsMoreGames =
      leftState.games < minGamesPerPlayer ? 0 : 1;
    const rightNeedsMoreGames =
      rightState.games < minGamesPerPlayer ? 0 : 1;

    if (leftNeedsMoreGames !== rightNeedsMoreGames) {
      return leftNeedsMoreGames - rightNeedsMoreGames;
    }

    if (leftState.games !== rightState.games) {
      return leftState.games - rightState.games;
    }

    if (leftState.lastPlayedRound !== rightState.lastPlayedRound) {
      return leftState.lastPlayedRound - rightState.lastPlayedRound;
    }

    if (left.score !== right.score) {
      return right.score - left.score;
    }

    const leftRandom = randomOrder.get(left.playerId) ?? 0;
    const rightRandom = randomOrder.get(right.playerId) ?? 0;

    if (leftRandom !== rightRandom) {
      return leftRandom - rightRandom;
    }

    return left.name.localeCompare(right.name, "ko");
  });
}

function getPoolMatchLimit(pool: Pool) {
  return Math.floor(pool.players.length / 4);
}

function getPoolRecoveryMatchFloor(pool: Pool) {
  const matchLimit = getPoolMatchLimit(pool);

  if (matchLimit <= 0) {
    return 0;
  }

  const maxSelectableNextRound = matchLimit * 4;
  const unrecoverableCarryCount =
    pool.players.length - maxSelectableNextRound;

  if (unrecoverableCarryCount <= 0) {
    return 0;
  }

  return Math.ceil(unrecoverableCarryCount / 4);
}

function getPoolAverageGames(
  pool: Pool,
  states: Map<string, PlayerState>
) {
  if (pool.players.length === 0) {
    return 0;
  }

  const totalGames = pool.players.reduce((total, player) => {
    return total + (states.get(player.playerId)?.games ?? 0);
  }, 0);

  return totalGames / pool.players.length;
}

function getOverallAverageGames(
  pools: Pool[],
  states: Map<string, PlayerState>
) {
  const players = pools.flatMap((pool) => pool.players);

  if (players.length === 0) {
    return 0;
  }

  const totalGames = players.reduce((total, player) => {
    return total + (states.get(player.playerId)?.games ?? 0);
  }, 0);

  return totalGames / players.length;
}

function getPoolMatchPriority(
  pool: Pool,
  currentMatches: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>,
  overallAverageGames: number
) {
  const nextSelectedCount = (currentMatches + 1) * 4;
  const orderedPlayers = sortPlayersForSelection(
    pool.players,
    states,
    previousRested,
    minGamesPerPlayer,
    randomOrder
  );

  if (orderedPlayers.length < nextSelectedCount) {
    return Number.NEGATIVE_INFINITY;
  }

  const selectedPlayers = orderedPlayers.slice(0, nextSelectedCount);
  const poolAverageGames = getPoolAverageGames(pool, states);
  const gameGap = overallAverageGames - poolAverageGames;

  return selectedPlayers.reduce((total, player, index) => {
    const state = states.get(player.playerId)!;
    const unmetGames = Math.max(0, minGamesPerPlayer - state.games);
    const mustPlayBonus = previousRested.has(player.playerId)
      ? 6
      : 0;
    const lowGamesBonus = Math.max(
      0,
      overallAverageGames - state.games
    );
    const randomBias =
      (randomOrder.get(player.playerId) ?? 0) * (index + 1) * 0.01;

    return (
      total +
      unmetGames * 10 +
      mustPlayBonus +
      lowGamesBonus * 4 +
      randomBias
    );
  }, gameGap * 40 - currentMatches * 12);
}

function allocateMatchesForRound(
  pools: Pool[],
  courtCount: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>
) {
  const allocations = new Map<DivisionKey, number>();
  let requiredMatches = 0;
  const overallAverageGames = getOverallAverageGames(
    pools,
    states
  );

  for (const pool of pools) {
    if (pool.players.length > 0 && pool.players.length < 4) {
      const needsGames = pool.players.some((player) => {
        const state = states.get(player.playerId)!;
        return state.games < minGamesPerPlayer;
      });
      const hasPreviousResters = pool.players.some((player) =>
        previousRested.has(player.playerId)
      );

      if (needsGames || hasPreviousResters) {
        throw new Error(
          `${pool.label} 참가 인원이 4명 미만이라 자동 대진표를 생성할 수 없습니다.`
        );
      }
    }

    const mustPlayCount = pool.players.filter((player) =>
      previousRested.has(player.playerId)
    ).length;
    const requiredFromPreviousRest =
      mustPlayCount === 0
        ? 0
        : Math.ceil(mustPlayCount / 4);
    const requiredForRecovery =
      getPoolRecoveryMatchFloor(pool);
    const required = Math.max(
      requiredFromPreviousRest,
      requiredForRecovery
    );

    if (required > getPoolMatchLimit(pool)) {
      throw new Error(
        `${pool.label}에서 직전 라운드를 쉰 인원을 모두 이번 라운드에 넣을 수 없습니다. 코트를 늘리거나 참가 인원을 다시 확인해 주세요.`
      );
    }

    allocations.set(pool.key, required);
    requiredMatches += required;
  }

  if (requiredMatches > courtCount) {
    throw new Error(
      "직전 라운드 휴식 인원을 모두 다음 라운드에 배치할 수 없습니다. 코트를 늘리거나 대진 생성 조건을 다시 확인해 주세요."
    );
  }

  let remainingMatches = courtCount - requiredMatches;

  while (remainingMatches > 0) {
    let bestPool: Pool | null = null;
    let bestPriority = Number.NEGATIVE_INFINITY;

    for (const pool of pools) {
      const currentMatches = allocations.get(pool.key) ?? 0;
      const matchLimit = getPoolMatchLimit(pool);

      if (currentMatches >= matchLimit) {
        continue;
      }

      const priority = getPoolMatchPriority(
        pool,
        currentMatches,
        states,
        previousRested,
        minGamesPerPlayer,
        randomOrder,
        overallAverageGames
      );

      if (priority > bestPriority) {
        bestPriority = priority;
        bestPool = pool;
      }
    }

    if (!bestPool || bestPriority <= 0) {
      break;
    }

    allocations.set(
      bestPool.key,
      (allocations.get(bestPool.key) ?? 0) + 1
    );
    remainingMatches -= 1;
  }

  return allocations;
}

function chooseSelectedPlayers(
  players: InternalPlayer[],
  target: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>,
  fixedPairMap: Map<string, string>
) {
  if (target <= 0) {
    return [];
  }

  const selectableIds = new Set(players.map((p) => p.playerId));
  const sorted = sortPlayersForSelection(
    players,
    states,
    previousRested,
    minGamesPerPlayer,
    randomOrder
  );

  // ?섏뼱???먯옄 ?⑥쐞濡?痍④툒: ?????좏깮?섍굅???????쒖쇅
  const selected = new Set<string>();
  for (const player of sorted) {
    if (selected.size >= target) break;
    if (selected.has(player.playerId)) continue;

    const partnerId = fixedPairMap.get(player.playerId);
    if (
      partnerId &&
      selectableIds.has(partnerId) &&
      !selected.has(partnerId)
    ) {
      if (selected.size + 2 <= target) {
        selected.add(player.playerId);
        selected.add(partnerId);
      }
      // ?щ’??1媛쒕쭔 ?⑥쑝硫??섏뼱 ?ㅽ궢 (?ㅼ쓬 媛쒖씤 ?좎닔媛 梨꾩?)
    } else {
      selected.add(player.playerId);
    }
  }

  return players.filter((p) => selected.has(p.playerId));
}

function chooseSelectedPlayersForPool(
  pool: Pool,
  matchCount: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>,
  fixedPairMap: Map<string, string>
) {
  return chooseSelectedPlayers(
    pool.players,
    matchCount * 4,
    states,
    previousRested,
    minGamesPerPlayer,
    randomOrder,
    fixedPairMap
  );
}

function getTeamBattleMatchLimit(pool: TeamBattlePool) {
  return Math.min(
    Math.floor(pool.teamAPlayers.length / 2),
    Math.floor(pool.teamBPlayers.length / 2)
  );
}

function getTeamBattleRecoveryMatchFloor(pool: TeamBattlePool) {
  const matchLimit = getTeamBattleMatchLimit(pool);

  if (matchLimit <= 0) {
    return 0;
  }

  const maxSelectableNextRound = matchLimit * 2;
  const unrecoverableCarryA =
    pool.teamAPlayers.length - maxSelectableNextRound;
  const unrecoverableCarryB =
    pool.teamBPlayers.length - maxSelectableNextRound;

  return Math.max(
    unrecoverableCarryA <= 0 ? 0 : Math.ceil(unrecoverableCarryA / 2),
    unrecoverableCarryB <= 0 ? 0 : Math.ceil(unrecoverableCarryB / 2)
  );
}

function getTeamBattlePoolAverageGames(
  pool: TeamBattlePool,
  states: Map<string, PlayerState>
) {
  const players = [...pool.teamAPlayers, ...pool.teamBPlayers];

  if (players.length === 0) {
    return 0;
  }

  const totalGames = players.reduce(
    (total, player) => total + (states.get(player.playerId)?.games ?? 0),
    0
  );

  return totalGames / players.length;
}

function getOverallAverageGamesForTeamBattle(
  pools: TeamBattlePool[],
  states: Map<string, PlayerState>
) {
  const players = pools.flatMap((pool) => [
    ...pool.teamAPlayers,
    ...pool.teamBPlayers,
  ]);

  if (players.length === 0) {
    return 0;
  }

  const totalGames = players.reduce(
    (total, player) => total + (states.get(player.playerId)?.games ?? 0),
    0
  );

  return totalGames / players.length;
}

function getTeamBattlePoolMatchPriority(
  pool: TeamBattlePool,
  currentMatches: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>,
  overallAverageGames: number,
  fixedPairMap: Map<string, string>
) {
  const nextSelectedCount = (currentMatches + 1) * 2;
  const selectedA = chooseSelectedPlayers(
    pool.teamAPlayers,
    nextSelectedCount,
    states,
    previousRested,
    minGamesPerPlayer,
    randomOrder,
    fixedPairMap
  );
  const selectedB = chooseSelectedPlayers(
    pool.teamBPlayers,
    nextSelectedCount,
    states,
    previousRested,
    minGamesPerPlayer,
    randomOrder,
    fixedPairMap
  );

  if (
    selectedA.length < nextSelectedCount ||
    selectedB.length < nextSelectedCount
  ) {
    return Number.NEGATIVE_INFINITY;
  }

  const poolAverageGames = getTeamBattlePoolAverageGames(pool, states);
  const gameGap = overallAverageGames - poolAverageGames;

  return [...selectedA, ...selectedB].reduce((total, player, index) => {
    const state = states.get(player.playerId)!;
    const unmetGames = Math.max(0, minGamesPerPlayer - state.games);
    const mustPlayBonus = previousRested.has(player.playerId) ? 6 : 0;
    const lowGamesBonus = Math.max(0, overallAverageGames - state.games);
    const randomBias =
      (randomOrder.get(player.playerId) ?? 0) * (index + 1) * 0.01;

    return (
      total +
      unmetGames * 10 +
      mustPlayBonus +
      lowGamesBonus * 4 +
      randomBias
    );
  }, gameGap * 40 - currentMatches * 12);
}

function allocateMatchesForRoundTeamBattle(
  pools: TeamBattlePool[],
  courtCount: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>,
  fixedPairMap: Map<string, string>
) {
  const allocations = new Map<DivisionKey, number>();
  let requiredMatches = 0;
  const overallAverageGames = getOverallAverageGamesForTeamBattle(
    pools,
    states
  );

  for (const pool of pools) {
    const needsGamesA = pool.teamAPlayers.some((player) => {
      const state = states.get(player.playerId)!;
      return state.games < minGamesPerPlayer;
    });
    const needsGamesB = pool.teamBPlayers.some((player) => {
      const state = states.get(player.playerId)!;
      return state.games < minGamesPerPlayer;
    });
    const hasPreviousRestersA = pool.teamAPlayers.some((player) =>
      previousRested.has(player.playerId)
    );
    const hasPreviousRestersB = pool.teamBPlayers.some((player) =>
      previousRested.has(player.playerId)
    );

    if (pool.teamAPlayers.length < 2 && (needsGamesA || hasPreviousRestersA)) {
      throw new Error(
        `${pool.label} ?앹꽦?먮뒗 ${pool.label.includes("?⑤났") ? "A? ?⑥옄" : pool.label.includes("?щ났") ? "A? ?ъ옄" : "A?"} 李멸??먭? 理쒖냼 2紐??댁긽 ?꾩슂?⑸땲??`
      );
    }

    if (pool.teamBPlayers.length < 2 && (needsGamesB || hasPreviousRestersB)) {
      throw new Error(
        `${pool.label} ?앹꽦?먮뒗 ${pool.label.includes("?⑤났") ? "B? ?⑥옄" : pool.label.includes("?щ났") ? "B? ?ъ옄" : "B?"} 李멸??먭? 理쒖냼 2紐??댁긽 ?꾩슂?⑸땲??`
      );
    }

    const mustPlayCountA = pool.teamAPlayers.filter((player) =>
      previousRested.has(player.playerId)
    ).length;
    const mustPlayCountB = pool.teamBPlayers.filter((player) =>
      previousRested.has(player.playerId)
    ).length;
    const requiredFromPreviousRest = Math.max(
      mustPlayCountA === 0 ? 0 : Math.ceil(mustPlayCountA / 2),
      mustPlayCountB === 0 ? 0 : Math.ceil(mustPlayCountB / 2)
    );
    const requiredForRecovery = getTeamBattleRecoveryMatchFloor(pool);
    const required = Math.max(requiredFromPreviousRest, requiredForRecovery);

    if (required > getTeamBattleMatchLimit(pool)) {
      throw new Error(
        `${pool.label}?먯꽌 吏곸쟾 ?쇱슫?쒕? ???몄썝??紐⑤몢 ?대쾲 ?쇱슫?쒖뿉 ?ｌ쓣 ???놁뒿?덈떎. ? ?몄썝 ?먮뒗 肄뷀듃 ?섎? ?ㅼ떆 ?뺤씤??二쇱꽭??`
      );
    }

    allocations.set(pool.key, required);
    requiredMatches += required;
  }

  if (requiredMatches > courtCount) {
    throw new Error(
      "吏곸쟾 ?쇱슫???댁떇 ?몄썝??紐⑤몢 ?ㅼ쓬 ?쇱슫?쒖뿉 諛곗젙?????놁뒿?덈떎. 肄뷀듃 ?섎? ?섎━嫄곕굹 ?吏??앹꽦 議곌굔???ㅼ떆 ?뺤씤??二쇱꽭??"
    );
  }

  let remainingMatches = courtCount - requiredMatches;

  while (remainingMatches > 0) {
    let bestPool: TeamBattlePool | null = null;
    let bestPriority = Number.NEGATIVE_INFINITY;

    for (const pool of pools) {
      const currentMatches = allocations.get(pool.key) ?? 0;
      const matchLimit = getTeamBattleMatchLimit(pool);

      if (currentMatches >= matchLimit) {
        continue;
      }

      const priority = getTeamBattlePoolMatchPriority(
        pool,
        currentMatches,
        states,
        previousRested,
        minGamesPerPlayer,
        randomOrder,
        overallAverageGames,
        fixedPairMap
      );

      if (priority > bestPriority) {
        bestPriority = priority;
        bestPool = pool;
      }
    }

    if (!bestPool || bestPriority <= 0) {
      break;
    }

    allocations.set(
      bestPool.key,
      (allocations.get(bestPool.key) ?? 0) + 1
    );
    remainingMatches -= 1;
  }

  return allocations;
}

function chooseSelectedPlayersForTeamBattlePool(
  pool: TeamBattlePool,
  matchCount: number,
  states: Map<string, PlayerState>,
  previousRested: Set<string>,
  minGamesPerPlayer: number,
  randomOrder: Map<string, number>,
  fixedPairMap: Map<string, string>
) {
  const target = matchCount * 2;

  return {
    teamAPlayers: chooseSelectedPlayers(
      pool.teamAPlayers,
      target,
      states,
      previousRested,
      minGamesPerPlayer,
      randomOrder,
      fixedPairMap
    ),
    teamBPlayers: chooseSelectedPlayers(
      pool.teamBPlayers,
      target,
      states,
      previousRested,
      minGamesPerPlayer,
      randomOrder,
      fixedPairMap
    ),
  };
}

function generateCombinations<T>(
  items: T[],
  count: number
): T[][] {
  if (count === 0) {
    return [[]];
  }

  if (items.length < count) {
    return [];
  }

  const result: T[][] = [];

  for (let index = 0; index <= items.length - count; index += 1) {
    const head = items[index]!;
    const tails = generateCombinations(
      items.slice(index + 1),
      count - 1
    );

    for (const tail of tails) {
      result.push([head, ...tail]);
    }
  }

  return result;
}

function getPairingRandomBias(
  teamAPlayers: InternalPlayer[],
  teamBPlayers: InternalPlayer[],
  randomOrder: Map<string, number>
) {
  return (
    (randomOrder.get(teamAPlayers[0]!.playerId) ?? 0) * 0.001 +
    (randomOrder.get(teamAPlayers[1]!.playerId) ?? 0) * 0.002 +
    (randomOrder.get(teamBPlayers[0]!.playerId) ?? 0) * 0.003 +
    (randomOrder.get(teamBPlayers[1]!.playerId) ?? 0) * 0.004
  );
}

function isPairingValidForFixedPairs(
  teamAPlayers: InternalPlayer[],
  teamBPlayers: InternalPlayer[],
  fixedPairMap: Map<string, string>
) {
  for (const player of [...teamAPlayers, ...teamBPlayers]) {
    const partnerId = fixedPairMap.get(player.playerId);
    if (!partnerId) continue;
    const playerInA = teamAPlayers.some((p) => p.playerId === player.playerId);
    const partnerInA = teamAPlayers.some((p) => p.playerId === partnerId);
    const partnerInB = teamBPlayers.some((p) => p.playerId === partnerId);
    // ?뚰듃?덇? ??荑쇳뀩 ?덉뿉 ?덈뒗???ㅻⅨ ???諛곗젙??寃쎌슦 ??臾댄슚
    if ((partnerInA || partnerInB) && playerInA !== partnerInA) {
      return false;
    }
  }
  return true;
}

function evaluateQuartetPairings(
  quartet: InternalPlayer[],
  division: DivisionKey,
  label: string,
  courtNumber: number,
  partnerHistory: Map<string, number>,
  opponentHistory: Map<string, number>,
  randomOrder: Map<string, number>,
  fixedPairMap: Map<string, string>
): MatchCandidate | null {
  const [p1, p2, p3, p4] = quartet;
  const pairings: [InternalPlayer[], InternalPlayer[]][] = [
    [
      [p1, p2],
      [p3, p4],
    ],
    [
      [p1, p3],
      [p2, p4],
    ],
    [
      [p1, p4],
      [p2, p3],
    ],
  ];

  let bestCandidate: MatchCandidate | null = null;

  for (const [teamAPlayers, teamBPlayers] of pairings) {
    // 怨좎젙 ?뚰듃?덇? ?ㅻⅨ ??쇰줈 遺꾨━?섎뒗 諛곗젙? 嫄대꼫?
    if (!isPairingValidForFixedPairs(teamAPlayers!, teamBPlayers!, fixedPairMap)) {
      continue;
    }
    const teamATotal = teamAPlayers.reduce(
      (total, player) => total + player.score,
      0
    );
    const teamBTotal = teamBPlayers.reduce(
      (total, player) => total + player.score,
      0
    );
    const balanceGap = Math.abs(teamATotal - teamBTotal);

    const partnerPenalty =
      (partnerHistory.get(
        keyForPair(
          teamAPlayers[0]!.playerId,
          teamAPlayers[1]!.playerId
        )
      ) ?? 0) *
        FIXED_PAIR_REPEAT_WEIGHT +
      (partnerHistory.get(
        keyForPair(
          teamBPlayers[0]!.playerId,
          teamBPlayers[1]!.playerId
        )
      ) ?? 0) *
        FIXED_PAIR_REPEAT_WEIGHT;

    const opponentPairs = [
      [teamAPlayers[0]!, teamBPlayers[0]!],
      [teamAPlayers[0]!, teamBPlayers[1]!],
      [teamAPlayers[1]!, teamBPlayers[0]!],
      [teamAPlayers[1]!, teamBPlayers[1]!],
    ];

    const opponentPenalty = opponentPairs.reduce(
      (total, [left, right]) =>
        total +
        (opponentHistory.get(
          keyForPair(left.playerId, right.playerId)
        ) ?? 0) *
          OPPONENT_REPEAT_WEIGHT,
      0
    );

    const scoreSpread =
      Math.max(...quartet.map((player) => player.score)) -
      Math.min(...quartet.map((player) => player.score));

    const fixedPairBalancePenalty = getFixedPairBalanceProtectionPenalty(
      teamAPlayers,
      teamBPlayers,
      teamATotal,
      teamBTotal,
      balanceGap,
      fixedPairMap
    );

    const score =
      balanceGap * BALANCE_GAP_WEIGHT +
      partnerPenalty +
      opponentPenalty +
      fixedPairBalancePenalty +
      scoreSpread * 3 +
      getPairingRandomBias(
        teamAPlayers,
        teamBPlayers,
        randomOrder
      );

    const candidate: MatchCandidate = {
      score,
      playerIds: quartet.map((player) => player.playerId),
      match: {
        courtNumber,
        label,
        division,
        balanceGap,
        teamA: {
          players: teamAPlayers,
          totalScore: teamATotal,
        },
        teamB: {
          players: teamBPlayers,
          totalScore: teamBTotal,
        },
      },
    };

    if (!bestCandidate || candidate.score < bestCandidate.score) {
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function wouldSplitFixedPair(
  selectedPlayers: InternalPlayer[],
  availablePlayers: InternalPlayer[],
  fixedPairMap: Map<string, string>
) {
  const selectedIds = new Set(selectedPlayers.map((player) => player.playerId));
  const availableIds = new Set(availablePlayers.map((player) => player.playerId));

  return selectedPlayers.some((player) => {
    const partnerId = fixedPairMap.get(player.playerId);
    return (
      partnerId !== undefined &&
      availableIds.has(partnerId) &&
      !selectedIds.has(partnerId)
    );
  });
}

function evaluateTeamBattlePairing(
  teamAPlayers: InternalPlayer[],
  teamBPlayers: InternalPlayer[],
  division: DivisionKey,
  label: string,
  courtNumber: number,
  partnerHistory: Map<string, number>,
  opponentHistory: Map<string, number>,
  randomOrder: Map<string, number>,
  fixedPairMap: Map<string, string>
): MatchCandidate | null {
  if (
    !isPairingValidForFixedPairs(teamAPlayers, teamBPlayers, fixedPairMap)
  ) {
    return null;
  }

  const teamATotal = teamAPlayers.reduce(
    (total, player) => total + player.score,
    0
  );
  const teamBTotal = teamBPlayers.reduce(
    (total, player) => total + player.score,
    0
  );
  const balanceGap = Math.abs(teamATotal - teamBTotal);

  const partnerPenalty =
    (partnerHistory.get(
      keyForPair(teamAPlayers[0]!.playerId, teamAPlayers[1]!.playerId)
    ) ?? 0) *
      FIXED_PAIR_REPEAT_WEIGHT +
    (partnerHistory.get(
      keyForPair(teamBPlayers[0]!.playerId, teamBPlayers[1]!.playerId)
    ) ?? 0) *
      FIXED_PAIR_REPEAT_WEIGHT;

  const opponentPairs = [
    [teamAPlayers[0]!, teamBPlayers[0]!],
    [teamAPlayers[0]!, teamBPlayers[1]!],
    [teamAPlayers[1]!, teamBPlayers[0]!],
    [teamAPlayers[1]!, teamBPlayers[1]!],
  ];

  const opponentPenalty = opponentPairs.reduce(
    (total, [left, right]) =>
      total +
      (opponentHistory.get(keyForPair(left.playerId, right.playerId)) ?? 0) *
        OPPONENT_REPEAT_WEIGHT,
    0
  );

  const quartet = [...teamAPlayers, ...teamBPlayers];
  const scoreSpread =
    Math.max(...quartet.map((player) => player.score)) -
    Math.min(...quartet.map((player) => player.score));

  const fixedPairBalancePenalty = getFixedPairBalanceProtectionPenalty(
    teamAPlayers,
    teamBPlayers,
    teamATotal,
    teamBTotal,
    balanceGap,
    fixedPairMap
  );

  const score =
    balanceGap * BALANCE_GAP_WEIGHT +
    partnerPenalty +
    opponentPenalty +
    fixedPairBalancePenalty +
    scoreSpread * 3 +
    getPairingRandomBias(teamAPlayers, teamBPlayers, randomOrder);

  return {
    score,
    playerIds: quartet.map((player) => player.playerId),
    match: {
      courtNumber,
      label,
      division,
      balanceGap,
      teamA: {
        players: teamAPlayers,
        totalScore: teamATotal,
      },
      teamB: {
        players: teamBPlayers,
        totalScore: teamBTotal,
      },
    },
  };
}

function buildRoundMatchesForTeamBattlePool(
  pool: TeamBattlePool,
  selectedTeamAPlayers: InternalPlayer[],
  selectedTeamBPlayers: InternalPlayer[],
  firstCourtNumber: number,
  partnerHistory: Map<string, number>,
  opponentHistory: Map<string, number>,
  randomOrder: Map<string, number>,
  random: RandomFn,
  fixedPairMap: Map<string, string>
) {
  const remainingTeamA = shuffleArray(selectedTeamAPlayers, random);
  const remainingTeamB = shuffleArray(selectedTeamBPlayers, random);
  const matches: SessionBracketMatch[] = [];
  let nextCourtNumber = firstCourtNumber;

  while (remainingTeamA.length >= 2 && remainingTeamB.length >= 2) {
    const teamACombos = shuffleArray(
      generateCombinations(remainingTeamA, 2),
      random
    );
    const teamBCombos = shuffleArray(
      generateCombinations(remainingTeamB, 2),
      random
    );

    let bestCandidate: MatchCandidate | null = null;

    for (const teamAPlayers of teamACombos) {
      if (
        wouldSplitFixedPair(teamAPlayers, remainingTeamA, fixedPairMap)
      ) {
        continue;
      }

      for (const teamBPlayers of teamBCombos) {
        if (
          wouldSplitFixedPair(teamBPlayers, remainingTeamB, fixedPairMap)
        ) {
          continue;
        }

        const candidate = evaluateTeamBattlePairing(
          teamAPlayers,
          teamBPlayers,
          pool.key,
          pool.label,
          nextCourtNumber,
          partnerHistory,
          opponentHistory,
          randomOrder,
          fixedPairMap
        );

        if (candidate && (!bestCandidate || candidate.score < bestCandidate.score)) {
          bestCandidate = candidate;
        }
      }
    }

    if (!bestCandidate) {
      throw new Error(
        `${pool.label} ?吏꾩쓣 援ъ꽦?섏? 紐삵뻽?듬땲?? ? 諛곗젙 ?먮뒗 怨좎젙 ?뚰듃???ㅼ젙???ㅼ떆 ?뺤씤??二쇱꽭??`
      );
    }

    matches.push(bestCandidate.match);
    nextCourtNumber += 1;

    const selectedIdSet = new Set(bestCandidate.playerIds);
    for (let index = remainingTeamA.length - 1; index >= 0; index -= 1) {
      if (selectedIdSet.has(remainingTeamA[index]!.playerId)) {
        remainingTeamA.splice(index, 1);
      }
    }
    for (let index = remainingTeamB.length - 1; index >= 0; index -= 1) {
      if (selectedIdSet.has(remainingTeamB[index]!.playerId)) {
        remainingTeamB.splice(index, 1);
      }
    }
  }

  return matches.map((match, index) => ({
    ...match,
    courtNumber: firstCourtNumber + index,
  }));
}

function buildRoundMatchesForPool(
  pool: Pool,
  selectedPlayers: InternalPlayer[],
  firstCourtNumber: number,
  partnerHistory: Map<string, number>,
  opponentHistory: Map<string, number>,
  randomOrder: Map<string, number>,
  random: RandomFn,
  fixedPairMap: Map<string, string>
) {
  const orderedPlayers = shuffleArray(selectedPlayers, random);
  const matches: SessionBracketMatch[] = [];
  let nextCourtNumber = firstCourtNumber;

  while (orderedPlayers.length >= 4) {
    const anchorIndex = Math.floor(random() * orderedPlayers.length);
    const anchor = orderedPlayers[anchorIndex]!;
    const remaining = orderedPlayers.filter((_, index) => index !== anchorIndex);
    const combos = shuffleArray(generateCombinations(remaining, 3), random);

    let bestCandidate: MatchCandidate | null = null;

    for (const combo of combos) {
      const quartet = [anchor, ...combo];
      const quartetIds = new Set(quartet.map((p) => p.playerId));

      // 怨좎젙 ?뚰듃?덇? ??荑쇳뀩?먮뒗 ?녿뒗???꾩쭅 ?⑥? ?좎닔 以묒뿉 ?덈떎硫???遺꾨━ ??嫄대꼫?
      const splitsPair = quartet.some((player) => {
        const partnerId = fixedPairMap.get(player.playerId);
        return (
          partnerId !== undefined &&
          orderedPlayers.some((p) => p.playerId === partnerId) &&
          !quartetIds.has(partnerId)
        );
      });
      if (splitsPair) continue;

      const candidate = evaluateQuartetPairings(
        quartet,
        pool.key,
        pool.label,
        nextCourtNumber,
        partnerHistory,
        opponentHistory,
        randomOrder,
        fixedPairMap
      );

      if (candidate && (!bestCandidate || candidate.score < bestCandidate.score)) {
        bestCandidate = candidate;
      }
    }

    if (!bestCandidate) {
      throw new Error(
        `${pool.label} ?吏꾪몴瑜?援ъ꽦?섏? 紐삵뻽?듬땲?? 怨좎젙 ?뚰듃???ㅼ젙 ?먮뒗 李멸????섏? 議곌굔???ㅼ떆 ?뺤씤??二쇱꽭??`
      );
    }

    const selectedIdSet = new Set(bestCandidate.playerIds);
    const flippedMatch =
      random() < 0.5
        ? bestCandidate.match
        : {
            ...bestCandidate.match,
            teamA: bestCandidate.match.teamB,
            teamB: bestCandidate.match.teamA,
          };

    matches.push(flippedMatch);
    nextCourtNumber += 1;

    for (let index = orderedPlayers.length - 1; index >= 0; index -= 1) {
      if (selectedIdSet.has(orderedPlayers[index]!.playerId)) {
        orderedPlayers.splice(index, 1);
      }
    }
  }

  return shuffleArray(matches, random).map((match, index) => ({
    ...match,
    courtNumber: firstCourtNumber + index,
  }));
}

function registerMatchHistory(
  match: SessionBracketMatch,
  partnerHistory: Map<string, number>,
  opponentHistory: Map<string, number>
) {
  const teamAPlayers = match.teamA.players;
  const teamBPlayers = match.teamB.players;

  const teamAPartnerKey = keyForPair(
    teamAPlayers[0]!.playerId,
    teamAPlayers[1]!.playerId
  );
  const teamBPartnerKey = keyForPair(
    teamBPlayers[0]!.playerId,
    teamBPlayers[1]!.playerId
  );

  partnerHistory.set(
    teamAPartnerKey,
    (partnerHistory.get(teamAPartnerKey) ?? 0) + 1
  );
  partnerHistory.set(
    teamBPartnerKey,
    (partnerHistory.get(teamBPartnerKey) ?? 0) + 1
  );

  for (const left of teamAPlayers) {
    for (const right of teamBPlayers) {
      const opponentKey = keyForPair(left.playerId, right.playerId);
      opponentHistory.set(
        opponentKey,
        (opponentHistory.get(opponentKey) ?? 0) + 1
      );
    }
  }
}

function allPlayersSatisfied(
  players: InternalPlayer[],
  states: Map<string, PlayerState>,
  minGamesPerPlayer: number
) {
  return players.every((player) => {
    const state = states.get(player.playerId)!;
    return state.games >= minGamesPerPlayer;
  });
}

function getEntryMap(players: InternalPlayer[]) {
  return new Map(players.map((player) => [player.playerId, player]));
}

function validateGenerationInput(
  players: InternalPlayer[],
  config: SessionBracketConfig
) {
  if (players.length < 4) {
    throw new Error(
      "자동 대진표는 최소 4명 이상의 참석 확정 인원이 있어야 생성할 수 있습니다."
    );
  }

  if (config.courtCount < 1) {
    throw new Error("사용 코트 수는 1개 이상이어야 합니다.");
  }

  if (config.minGamesPerPlayer < 1) {
    throw new Error("최소 경기 수는 1경기 이상이어야 합니다.");
  }

  const maxPlayersPerRound = config.courtCount * 4;

  if (players.length > maxPlayersPerRound * 2) {
    throw new Error(
      "현재 코트 수로는 모든 참가자에게 연속 휴식 없이 대진표를 만들 수 없습니다. 코트를 늘리거나 참가 인원을 다시 확인해 주세요."
    );
  }
}

function validateTeamBattleInput(
  players: InternalPlayer[],
  config: SessionBracketConfig,
  teamAssignments: Record<string, "A" | "B">,
  fixedPairMap: Map<string, string>
) {
  validateGenerationInput(players, config);

  const unassignedPlayers = players.filter(
    (player) => !teamAssignments[player.playerId]
  );
  if (unassignedPlayers.length > 0) {
    throw new Error(
      `팀 대항 자동대진은 모든 참가자의 팀 배정이 필요합니다. ${unassignedPlayers
        .map((player) => player.name)
        .join(", ")} 참가자의 팀을 먼저 선택해 주세요.`
    );
  }

  const teamAPlayers = players.filter(
    (player) => teamAssignments[player.playerId] === "A"
  );
  const teamBPlayers = players.filter(
    (player) => teamAssignments[player.playerId] === "B"
  );

  if (teamAPlayers.length < 2 || teamBPlayers.length < 2) {
    throw new Error(
      "팀 대항 자동대진은 A팀과 B팀에 각각 최소 2명 이상 있어야 생성할 수 있습니다."
    );
  }

  for (const [playerId, partnerId] of fixedPairMap.entries()) {
    if (playerId > partnerId) {
      continue;
    }

    if (teamAssignments[playerId] !== teamAssignments[partnerId]) {
      throw new Error(
        "고정 파트너는 같은 팀 안에서만 설정할 수 있습니다. 팀 배정 또는 고정 파트너를 다시 확인해 주세요."
      );
    }

    if (config.separateByGender) {
      const player = players.find((entry) => entry.playerId === playerId);
      const partner = players.find((entry) => entry.playerId === partnerId);
      if (player && partner && player.gender !== partner.gender) {
        throw new Error(
          "남복/여복 분리 생성에서는 고정 파트너도 같은 성별 안에서만 설정할 수 있습니다."
        );
      }
    }
  }
}

function buildSummary(
  players: InternalPlayer[],
  states: Map<string, PlayerState>,
  config: SessionBracketConfig,
  rounds: SessionBracketRound[],
  warnings: string[]
): SessionBracketSummary {
  const playerStats: SessionBracketPlayerStat[] = players
    .map((player) => {
      const state = states.get(player.playerId)!;
      return {
        ...player,
        games: state.games,
        rests: state.rests,
      };
    })
    .sort((left, right) => {
      if (left.games !== right.games) {
        return right.games - left.games;
      }

      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return left.name.localeCompare(right.name, "ko");
    });

  return {
    totalPlayers: players.length,
    totalRounds: rounds.length,
    totalMatches: rounds.reduce(
      (total, round) => total + round.matches.length,
      0
    ),
    warnings,
    playerStats,
  };
}

function generateTeamBattleRounds(
  players: InternalPlayer[],
  config: SessionBracketConfig,
  teamAssignments: Record<string, "A" | "B">,
  randomOrder: Map<string, number>,
  random: RandomFn,
  fixedPairMap: Map<string, string>
) {
  const teamLabels = config.teamLabels ?? { A: "?A", B: "?B" };
  const pools = buildTeamBattlePools(
    players,
    config.separateByGender,
    teamAssignments,
    teamLabels
  );
  const playerEntryMap = getEntryMap(players);
  const states = new Map<string, PlayerState>(
    players.map((player) => [
      player.playerId,
      {
        games: 0,
        rests: 0,
        lastPlayedRound: 0,
      },
    ])
  );
  const partnerHistory = new Map<string, number>();
  const opponentHistory = new Map<string, number>();
  const rounds: SessionBracketRound[] = [];
  const warnings: string[] = [];
  let previousRested = new Set<string>();

  const teamACount = players.filter(
    (player) => teamAssignments[player.playerId] === "A"
  ).length;
  const teamBCount = players.filter(
    (player) => teamAssignments[player.playerId] === "B"
  ).length;
  if (teamACount !== teamBCount) {
    warnings.push(
      `${teamLabels.A} ${teamACount}紐?/ ${teamLabels.B} ${teamBCount}紐낆쑝濡?? ?몄썝 李⑥씠媛 ?덉뼱 ?쒖そ ????댁떇 ?몄썝????留롮븘吏????덉뒿?덈떎.`
    );
  }

  for (const pool of pools) {
    if (pool.teamAPlayers.length !== pool.teamBPlayers.length) {
      warnings.push(
        `${pool.label} ?몄썝 李⑥씠濡??쇱슫?쒕퀎 ?댁떇 ?몄썝??怨좊Ⅴ寃??섎돇吏 ?딆쓣 ???덉뒿?덈떎.`
      );
    }
  }

  const estimatedRounds = Math.ceil(
    (players.length * config.minGamesPerPlayer) /
      Math.max(1, config.courtCount * 4)
  );
  const maxRounds = Math.max(
    estimatedRounds + players.length,
    config.minGamesPerPlayer * 3,
    6
  );

  for (let roundNumber = 1; roundNumber <= maxRounds; roundNumber += 1) {
    if (
      rounds.length > 0 &&
      allPlayersSatisfied(players, states, config.minGamesPerPlayer)
    ) {
      break;
    }

    const allocations = allocateMatchesForRoundTeamBattle(
      pools,
      config.courtCount,
      states,
      previousRested,
      config.minGamesPerPlayer,
      randomOrder,
      fixedPairMap
    );
    const roundMatches: SessionBracketMatch[] = [];
    const restedPlayerIds = new Set<string>();
    let nextCourtNumber = 1;

    for (const pool of pools) {
      const matchCount = allocations.get(pool.key) ?? 0;
      const selectedPlayers = chooseSelectedPlayersForTeamBattlePool(
        pool,
        matchCount,
        states,
        previousRested,
        config.minGamesPerPlayer,
        randomOrder,
        fixedPairMap
      );

      const selectedIdSet = new Set([
        ...selectedPlayers.teamAPlayers.map((player) => player.playerId),
        ...selectedPlayers.teamBPlayers.map((player) => player.playerId),
      ]);

      const restingPlayers = [...pool.teamAPlayers, ...pool.teamBPlayers].filter(
        (player) => !selectedIdSet.has(player.playerId)
      );

      for (const restingPlayer of restingPlayers) {
        restedPlayerIds.add(restingPlayer.playerId);
      }

      const poolMatches = buildRoundMatchesForTeamBattlePool(
        pool,
        selectedPlayers.teamAPlayers,
        selectedPlayers.teamBPlayers,
        nextCourtNumber,
        partnerHistory,
        opponentHistory,
        randomOrder,
        random,
        fixedPairMap
      );

      roundMatches.push(...poolMatches);
      nextCourtNumber += poolMatches.length;
    }

    if (roundMatches.length === 0) {
      break;
    }

    for (const match of roundMatches) {
      registerMatchHistory(match, partnerHistory, opponentHistory);
    }

    for (const player of players) {
      const state = states.get(player.playerId)!;

      if (restedPlayerIds.has(player.playerId)) {
        state.rests += 1;
      } else {
        state.games += 1;
        state.lastPlayedRound = roundNumber;
      }
    }

    previousRested = restedPlayerIds;

    rounds.push({
      roundNumber,
      matches: roundMatches,
      restingPlayers: [...restedPlayerIds]
        .map((playerId) => playerEntryMap.get(playerId)!)
        .sort((left, right) => {
          if (left.score !== right.score) {
            return right.score - left.score;
          }

          return left.name.localeCompare(right.name, "ko");
        }),
    });
  }

  if (!allPlayersSatisfied(players, states, config.minGamesPerPlayer)) {
    throw new Error(
      "현재 조건으로는 모든 참가자에게 최소 경기 수를 배정할 수 없습니다. 코트 수나 참가 인원을 다시 확인해 주세요."
    );
  }

  for (const player of players) {
    const state = states.get(player.playerId)!;

    if (state.games > config.minGamesPerPlayer + 1) {
      warnings.push(
        `${player.name} 선수는 경기 수가 다른 인원보다 많게 배정되었습니다.`
      );
    }
  }

  return {
    rounds,
    summary: buildSummary(players, states, config, rounds, warnings),
  };
}

export function generateSessionBracket(
  input: SessionBracketGenerationInput
) {
  const random = createSeededRandom(
    Number.isFinite(input.seed) ? Number(input.seed) : Date.now()
  );

  const config: SessionBracketConfig = {
    courtCount: Math.max(1, Math.floor(input.courtCount)),
    minGamesPerPlayer: Math.max(
      1,
      Math.floor(input.minGamesPerPlayer)
    ),
    separateByGender: Boolean(input.separateByGender),
    generationMode:
      input.generationMode === "TEAM_BATTLE" ? "TEAM_BATTLE" : "STANDARD",
    teamAssignments:
      input.generationMode === "TEAM_BATTLE"
        ? input.teamAssignments ?? {}
        : undefined,
    teamLabels:
      input.generationMode === "TEAM_BATTLE"
        ? {
            A: input.teamLabels?.A?.trim() || "?A",
            B: input.teamLabels?.B?.trim() || "?B",
          }
        : undefined,
    fixedPairs: input.fixedPairs ?? [],
  };

  const players = shuffleArray(
    input.players.map((player) =>
      createPlayerEntry(player, config.separateByGender)
    ),
    random
  );
  validateGenerationInput(players, config);

  // 怨좎젙 ?뚰듃??留?援ъ꽦 (?묐갑??
  const playerIdSet = new Set(players.map((p) => p.playerId));
  const fixedPairMap = new Map<string, string>();
  for (const [idA, idB] of config.fixedPairs ?? []) {
    if (playerIdSet.has(idA) && playerIdSet.has(idB) && idA !== idB) {
      fixedPairMap.set(idA, idB);
      fixedPairMap.set(idB, idA);
    }
  }

  const randomOrder = new Map(
    players.map((player) => [player.playerId, random()])
  );

  if (config.generationMode === "TEAM_BATTLE") {
    validateTeamBattleInput(
      players,
      config,
      config.teamAssignments ?? {},
      fixedPairMap
    );

    return {
      config,
      ...generateTeamBattleRounds(
        players,
        config,
        config.teamAssignments ?? {},
        randomOrder,
        random,
        fixedPairMap
      ),
    };
  }

  const pools = buildPools(players, config.separateByGender);
  const playerEntryMap = getEntryMap(players);
  const states = new Map<string, PlayerState>(
    players.map((player) => [
      player.playerId,
      {
        games: 0,
        rests: 0,
        lastPlayedRound: 0,
      },
    ])
  );
  const partnerHistory = new Map<string, number>();
  const opponentHistory = new Map<string, number>();
  const rounds: SessionBracketRound[] = [];
  const warnings: string[] = [];
  let previousRested = new Set<string>();

  const estimatedRounds = Math.ceil(
    (players.length * config.minGamesPerPlayer) /
      Math.max(1, config.courtCount * 4)
  );
  const maxRounds = Math.max(
    estimatedRounds + players.length,
    config.minGamesPerPlayer * 3,
    6
  );

  for (let roundNumber = 1; roundNumber <= maxRounds; roundNumber += 1) {
    if (
      rounds.length > 0 &&
      allPlayersSatisfied(players, states, config.minGamesPerPlayer)
    ) {
      break;
    }

    const allocations = allocateMatchesForRound(
      pools,
      config.courtCount,
      states,
      previousRested,
      config.minGamesPerPlayer,
      randomOrder
    );
    const roundMatches: SessionBracketMatch[] = [];
    const restedPlayerIds = new Set<string>();
    let nextCourtNumber = 1;

    for (const pool of pools) {
      const matchCount = allocations.get(pool.key) ?? 0;
      const selectedPlayers = chooseSelectedPlayersForPool(
        pool,
        matchCount,
        states,
        previousRested,
        config.minGamesPerPlayer,
        randomOrder,
        fixedPairMap
      );
      const selectedIdSet = new Set(
        selectedPlayers.map((player) => player.playerId)
      );
      const restingPlayers = pool.players.filter(
        (player) => !selectedIdSet.has(player.playerId)
      );

      for (const restingPlayer of restingPlayers) {
        restedPlayerIds.add(restingPlayer.playerId);
      }

      const poolMatches = buildRoundMatchesForPool(
        pool,
        selectedPlayers,
        nextCourtNumber,
        partnerHistory,
        opponentHistory,
        randomOrder,
        random,
        fixedPairMap
      );

      roundMatches.push(...poolMatches);
      nextCourtNumber += poolMatches.length;
    }

    if (roundMatches.length === 0) {
      break;
    }

    for (const match of roundMatches) {
      registerMatchHistory(match, partnerHistory, opponentHistory);
    }

    for (const player of players) {
      const state = states.get(player.playerId)!;

      if (restedPlayerIds.has(player.playerId)) {
        state.rests += 1;
      } else {
        state.games += 1;
        state.lastPlayedRound = roundNumber;
      }
    }

    previousRested = restedPlayerIds;

    rounds.push({
      roundNumber,
      matches: roundMatches,
      restingPlayers: [...restedPlayerIds]
        .map((playerId) => playerEntryMap.get(playerId)!)
        .sort((left, right) => {
          if (left.score !== right.score) {
            return right.score - left.score;
          }

          return left.name.localeCompare(right.name, "ko");
        }),
    });
  }

  if (!allPlayersSatisfied(players, states, config.minGamesPerPlayer)) {
    throw new Error(
      "현재 조건으로는 모든 참가자에게 최소 경기 수를 배정할 수 없습니다. 코트를 늘리거나 최소 경기 수를 낮춰 주세요."
    );
  }

  for (const player of players) {
    const state = states.get(player.playerId)!;

    if (state.games > config.minGamesPerPlayer + 1) {
      warnings.push(
        `${player.name} 선수는 경기 수가 다른 인원보다 많게 배정되었습니다.`
      );
    }
  }

  return {
    config,
    rounds,
    summary: buildSummary(players, states, config, rounds, warnings),
  };
}








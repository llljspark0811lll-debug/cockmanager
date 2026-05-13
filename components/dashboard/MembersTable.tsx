"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClubPosition, Member } from "@/components/dashboard/types";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import {
  formatDate,
  formatPhoneNumber,
  getGenderBadgeClasses,
  getGenderSortRank,
  getLevelRank,
  getLevelTextClasses,
  getSortedLevels,
  normalizeGenderLabel,
} from "@/components/dashboard/utils";

type MembersTableProps = {
  members: Member[];
  positions: ClubPosition[];
  customFieldLabel: string;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
  onAddMember: () => void;
  onOpenPositionSettings: () => void;
};

type SortOption = "position" | "name" | "gender" | "level" | "recent";

const STORAGE_KEY = "dashboard-members-filters-v2";
const MEMBERS_PAGE_SIZE = 15;

function PositionBadge({ position }: { position?: ClubPosition | null }) {
  if (!position) {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
        미지정
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
      {position.name}
    </span>
  );
}

function MemberCard({
  member,
  customFieldLabel,
  onEdit,
  onDelete,
}: {
  member: Member;
  customFieldLabel: string;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-slate-900">
              {member.name}
            </span>
            <PositionBadge position={member.position} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getGenderBadgeClasses(
                member.gender
              )}`}
            >
              {normalizeGenderLabel(member.gender)}
            </span>
            <span
              className={`text-xs font-extrabold ${getLevelTextClasses(
                member.level
              )}`}
            >
              {member.level}
            </span>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-[92px_1fr] gap-y-2 text-sm">
        <dt className="font-semibold text-slate-500">생년월일</dt>
        <dd className="text-slate-700">{formatDate(member.birth)}</dd>

        <dt className="font-semibold text-slate-500">연락처</dt>
        <dd className="text-slate-700">
          {formatPhoneNumber(member.phone) || "-"}
        </dd>

        <dt className="font-semibold text-slate-500">
          {customFieldLabel}
        </dt>
        <dd className="text-slate-700">
          {member.customFieldValue || "-"}
        </dd>

        <dt className="font-semibold text-slate-500">메모</dt>
        <dd className="text-slate-700">{member.note || "-"}</dd>
      </dl>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onEdit(member)}
          className="flex-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
        >
          수정
        </button>
        <button
          onClick={() => onDelete(member.id)}
          className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
        >
          탈퇴 처리
        </button>
      </div>
    </div>
  );
}

export function MembersTable({
  members,
  positions,
  customFieldLabel,
  onEdit,
  onDelete,
  onAddMember,
  onOpenPositionSettings,
}: MembersTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("position");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as {
        searchQuery?: string;
        genderFilter?: string;
        levelFilter?: string;
        positionFilter?: string;
        sortOption?: SortOption;
      };

      setSearchQuery(parsed.searchQuery ?? "");
      setGenderFilter(parsed.genderFilter ?? "ALL");
      setLevelFilter(parsed.levelFilter ?? "ALL");
      setPositionFilter(parsed.positionFilter ?? "ALL");
      setSortOption(parsed.sortOption ?? "position");
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        searchQuery,
        genderFilter,
        levelFilter,
        positionFilter,
        sortOption,
      })
    );
  }, [genderFilter, levelFilter, positionFilter, searchQuery, sortOption]);

  const levels = getSortedLevels(
    Array.from(
      new Set(members.map((member) => member.level).filter(Boolean))
    )
  );

  const getPositionOrder = (member: Member) => {
    if (!member.positionId) return 9999;
    const pos = positions.find((p) => p.id === member.positionId);
    return pos?.order ?? 9999;
  };

  const query = searchQuery.trim().toLowerCase();
  const filteredMembers = members
    .filter((member) => {
      const normalizedGender = normalizeGenderLabel(member.gender);
      const formattedPhone = formatPhoneNumber(member.phone);
      const matchesSearch =
        !query ||
        member.name.toLowerCase().includes(query) ||
        member.phone.toLowerCase().includes(query) ||
        formattedPhone.toLowerCase().includes(query) ||
        member.customFieldValue.toLowerCase().includes(query);
      const matchesGender =
        genderFilter === "ALL" || normalizedGender === genderFilter;
      const matchesLevel =
        levelFilter === "ALL" || member.level === levelFilter;
      const matchesPosition =
        positionFilter === "ALL" ||
        (positionFilter === "UNASSIGNED"
          ? !member.positionId
          : String(member.positionId) === positionFilter);

      return matchesSearch && matchesGender && matchesLevel && matchesPosition;
    })
    .sort((left, right) => {
      if (sortOption === "position") {
        const rankDiff = getPositionOrder(left) - getPositionOrder(right);
        if (rankDiff !== 0) return rankDiff;
        return left.name.localeCompare(right.name, "ko");
      }

      if (sortOption === "gender") {
        const rankDiff =
          getGenderSortRank(left.gender) - getGenderSortRank(right.gender);
        if (rankDiff !== 0) return rankDiff;
      }

      if (sortOption === "level") {
        const rankDiff = getLevelRank(left.level) - getLevelRank(right.level);
        if (rankDiff !== 0) return rankDiff;
      }

      if (sortOption === "recent") {
        return (
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
        );
      }

      return left.name.localeCompare(right.name, "ko");
    });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, genderFilter, levelFilter, positionFilter, sortOption, members.length]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / MEMBERS_PAGE_SIZE)
  );
  const paginatedMembers = useMemo(() => {
    const startIndex = (page - 1) * MEMBERS_PAGE_SIZE;
    return filteredMembers.slice(startIndex, startIndex + MEMBERS_PAGE_SIZE);
  }, [filteredMembers, page]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const maleCount = members.filter(
    (member) => normalizeGenderLabel(member.gender) === "남"
  ).length;
  const femaleCount = members.filter(
    (member) => normalizeGenderLabel(member.gender) === "여"
  ).length;

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4 md:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              회원 관리
            </h3>
            <p className="text-sm text-slate-500">
              이름, 성별, 급수 기준으로 빠르게 회원을 찾을 수 있어요.
            </p>
          </div>
          <div className="text-sm font-semibold text-slate-500">
            현재 보기 {filteredMembers.length}명
          </div>
        </div>

        {/* PC: 통계 배지 */}
        <div className="mt-4 hidden flex-wrap items-center justify-between gap-2 sm:flex">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
              전체 {members.length}명
            </span>
            <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
              남자 {maleCount}명
            </span>
            <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
              여자 {femaleCount}명
            </span>
            {levels.map((level) => {
              const count = members.filter((m) => m.level === level).length;
              return (
                <span key={level} className={`rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold ${getLevelTextClasses(level)}`}>
                  {level} {count}명
                </span>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onOpenPositionSettings}
              className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
            >
              직위 설정
            </button>
            <button
              onClick={onAddMember}
              data-tutorial-id="add-member-button"
              className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700"
            >
              회원 직접 등록
            </button>
          </div>
        </div>

        {/* 모바일: 통계 배지 */}
        <div className="mt-4 space-y-2 sm:hidden">
          <div className="flex gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
              전체 {members.length}명
            </span>
            <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">
              남자 {maleCount}명
            </span>
            <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
              여자 {femaleCount}명
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {levels.map((level) => {
              const count = members.filter((m) => m.level === level).length;
              return (
                <span key={level} className={`rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold ${getLevelTextClasses(level)}`}>
                  {level} {count}명
                </span>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onOpenPositionSettings}
              className="flex-1 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
            >
              직위 설정
            </button>
            <button
              onClick={onAddMember}
              data-tutorial-id="add-member-button"
              className="flex-1 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700"
            >
              회원 직접 등록
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-6">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="이름, 연락처, 추가 정보 검색"
            className="col-span-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 xl:col-span-2"
          />

          <select
            value={positionFilter}
            onChange={(event) => setPositionFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
          >
            <option value="ALL">전체 직위</option>
            {positions.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
            <option value="UNASSIGNED">미지정</option>
          </select>

          <select
            value={genderFilter}
            onChange={(event) => setGenderFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
          >
            <option value="ALL">전체 성별</option>
            <option value="남">남자만</option>
            <option value="여">여자만</option>
          </select>

          <select
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
          >
            <option value="ALL">전체 급수</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>

          <select
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as SortOption)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
          >
            <option value="position">직위순</option>
            <option value="name">이름순 (가나다)</option>
            <option value="gender">성별순 (남, 여)</option>
            <option value="level">급수순 (S ~ E)</option>
            <option value="recent">최근 등록순</option>
          </select>
        </div>
      </div>

      {/* PC 테이블 */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-4 font-semibold">직위</th>
              <th className="px-4 py-4 font-semibold">이름</th>
              <th className="px-4 py-4 font-semibold">성별</th>
              <th className="px-4 py-4 font-semibold">생년월일</th>
              <th className="px-4 py-4 font-semibold">연락처</th>
              <th className="px-4 py-4 font-semibold">급수</th>
              <th className="px-4 py-4 font-semibold">{customFieldLabel}</th>
              <th className="px-4 py-4 font-semibold">메모</th>
              <th className="px-4 py-4 font-semibold">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedMembers.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50">
                <td className="px-4 py-4">
                  <PositionBadge position={member.position} />
                </td>
                <td className="px-4 py-4 font-bold text-slate-900">
                  {member.name}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getGenderBadgeClasses(member.gender)}`}
                  >
                    {normalizeGenderLabel(member.gender)}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-500">
                  {formatDate(member.birth)}
                </td>
                <td className="px-4 py-4 font-medium text-slate-700">
                  {formatPhoneNumber(member.phone) || "-"}
                </td>
                <td className="px-4 py-4">
                  <span className={`text-xs font-extrabold ${getLevelTextClasses(member.level)}`}>
                    {member.level}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-500">
                  {member.customFieldValue || "-"}
                </td>
                <td className="max-w-[200px] px-4 py-4 text-slate-400">
                  {member.note || "-"}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(member)}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => onDelete(member.id)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                    >
                      탈퇴 처리
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredMembers.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-sm text-slate-400"
                >
                  {members.length === 0
                    ? "등록된 회원이 없습니다."
                    : "조건에 맞는 회원이 없습니다."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 */}
      <div className="space-y-3 p-4 lg:hidden">
        {filteredMembers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
            {members.length === 0
              ? "등록된 회원이 없습니다."
              : "조건에 맞는 회원이 없습니다."}
          </div>
        ) : null}

        {paginatedMembers.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            customFieldLabel={customFieldLabel}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div className="border-t border-slate-100 px-4 py-4">
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onChange={setPage}
        />
      </div>
    </div>
  );
}

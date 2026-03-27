"use client";

import { useEffect, useState } from "react";
import type { Member } from "@/components/dashboard/types";
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
  customFieldLabel: string;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
};

type SortOption = "name" | "gender" | "level" | "recent";

const STORAGE_KEY = "dashboard-members-filters-v1";

export function MembersTable({
  members,
  customFieldLabel,
  onEdit,
  onDelete,
}: MembersTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [sortOption, setSortOption] =
    useState<SortOption>("name");

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
        sortOption?: SortOption;
      };

      setSearchQuery(parsed.searchQuery ?? "");
      setGenderFilter(parsed.genderFilter ?? "ALL");
      setLevelFilter(parsed.levelFilter ?? "ALL");
      setSortOption(parsed.sortOption ?? "name");
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
        sortOption,
      })
    );
  }, [genderFilter, levelFilter, searchQuery, sortOption]);

  const levels = getSortedLevels(
    Array.from(
      new Set(
        members.map((member) => member.level).filter(Boolean)
      )
    )
  );

  const query = searchQuery.trim().toLowerCase();
  const filteredMembers = members
    .filter((member) => {
      const normalizedGender = normalizeGenderLabel(
        member.gender
      );
      const formattedPhone = formatPhoneNumber(member.phone);
      const matchesSearch =
        !query ||
        member.name.toLowerCase().includes(query) ||
        member.phone.toLowerCase().includes(query) ||
        formattedPhone.toLowerCase().includes(query) ||
        member.customFieldValue.toLowerCase().includes(query);
      const matchesGender =
        genderFilter === "ALL" ||
        normalizedGender === genderFilter;
      const matchesLevel =
        levelFilter === "ALL" || member.level === levelFilter;

      return matchesSearch && matchesGender && matchesLevel;
    })
    .sort((left, right) => {
      if (sortOption === "gender") {
        const rankDiff =
          getGenderSortRank(left.gender) -
          getGenderSortRank(right.gender);

        if (rankDiff !== 0) return rankDiff;
      }

      if (sortOption === "level") {
        const rankDiff =
          getLevelRank(left.level) -
          getLevelRank(right.level);

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
              이름, 성별, 급수 기준으로 빠르게 회원을 찾을 수
              있어요.
            </p>
          </div>
          <div className="text-sm font-semibold text-slate-500">
            현재 보기 {filteredMembers.length}명
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
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
            const count = members.filter(
              (member) => member.level === level
            ).length;

            return (
              <span
                key={level}
                className={`rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold ${getLevelTextClasses(
                  level
                )}`}
              >
                {level} {count}명
              </span>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            placeholder="이름, 연락처, 추가 정보 검색"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
          />

          <select
            value={genderFilter}
            onChange={(event) =>
              setGenderFilter(event.target.value)
            }
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
          >
            <option value="ALL">전체 성별</option>
            <option value="남">남자만</option>
            <option value="여">여자만</option>
          </select>

          <select
            value={levelFilter}
            onChange={(event) =>
              setLevelFilter(event.target.value)
            }
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
            onChange={(event) =>
              setSortOption(event.target.value as SortOption)
            }
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
          >
            <option value="name">이름순 (가나다)</option>
            <option value="gender">성별순 (남 → 여)</option>
            <option value="level">급수순 (S → E)</option>
            <option value="recent">최근 등록순</option>
          </select>
        </div>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-[1040px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-4 font-semibold">이름</th>
              <th className="px-4 py-4 font-semibold">성별</th>
              <th className="px-4 py-4 font-semibold">생년월일</th>
              <th className="px-4 py-4 font-semibold">연락처</th>
              <th className="px-4 py-4 font-semibold">급수</th>
              <th className="px-4 py-4 font-semibold">
                {customFieldLabel}
              </th>
              <th className="px-4 py-4 font-semibold">메모</th>
              <th className="px-4 py-4 font-semibold">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMembers.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50">
                <td className="px-4 py-4 font-bold text-slate-900">
                  {member.name}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getGenderBadgeClasses(
                      member.gender
                    )}`}
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
                  <span
                    className={`text-xs font-extrabold ${getLevelTextClasses(
                      member.level
                    )}`}
                  >
                    {member.level}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-500">
                  {member.customFieldValue || "-"}
                </td>
                <td className="max-w-[220px] px-4 py-4 text-slate-400">
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
                  colSpan={8}
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

      <div className="space-y-3 p-4 lg:hidden">
        {filteredMembers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
            {members.length === 0
              ? "등록된 회원이 없습니다."
              : "조건에 맞는 회원이 없습니다."}
          </div>
        ) : null}

        {filteredMembers.map((member) => (
          <div
            key={member.id}
            className="rounded-[1.25rem] border border-slate-200 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-black text-slate-900">
                  {member.name}
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

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>생년월일: {formatDate(member.birth)}</p>
              <p>연락처: {formatPhoneNumber(member.phone) || "-"}</p>
              <p>
                {customFieldLabel}: {member.customFieldValue || "-"}
              </p>
              <p>메모: {member.note || "-"}</p>
            </div>

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
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription";

type SubRequest = {
  id: number;
  plan: string;
  amount: number;
  depositorName: string;
  createdAt: string;
  club: {
    id: number;
    name: string;
    subscriptionStatus: string;
    subscriptionEnd: string | null;
  };
};

type ExemptClub = {
  id: number;
  name: string;
  subscriptionStatus: string;
  subscriptionEnd: string | null;
};

type HistoryItem = {
  id: number;
  plan: string;
  amount: number;
  depositorName: string;
  status: "APPROVED" | "REJECTED";
  createdAt: string;
  processedAt: string | null;
  club: { id: number; name: string };
};

export default function OpPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [requests, setRequests] = useState<SubRequest[]>([]);
  const [processing, setProcessing] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 15;
  const [exemptClubId, setExemptClubId] = useState("");
  const [exemptLoading, setExemptLoading] = useState(false);
  const [exemptMsg, setExemptMsg] = useState("");
  const [exemptClubs, setExemptClubs] = useState<ExemptClub[]>([]);
  const [exemptClubsLoading, setExemptClubsLoading] = useState(false);
  const [revertingId, setRevertingId] = useState<number | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/op/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
      loadRequests();
      loadHistory();
      loadExemptClubs();
    } else {
      setLoginError("비밀번호가 틀렸습니다.");
    }
  }

  async function loadRequests() {
    const res = await fetch("/api/op/requests");
    if (res.ok) setRequests(await res.json());
  }

  async function loadHistory() {
    setHistoryLoading(true);
    const res = await fetch("/api/op/history");
    if (res.ok) {
      setHistory(await res.json());
      setHistoryLoaded(true);
    }
    setHistoryLoading(false);
  }

  async function loadExemptClubs() {
    setExemptClubsLoading(true);
    const res = await fetch("/api/op/exempt");
    if (res.ok) setExemptClubs(await res.json());
    setExemptClubsLoading(false);
  }

  async function handleRevertToTrial(clubId: number) {
    if (!confirm("TRIAL로 복구하시겠습니까?")) return;
    setRevertingId(clubId);
    const res = await fetch(`/api/op/clubs/${clubId}/exempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exempt: false }),
    });
    if (res.ok) await loadExemptClubs();
    setRevertingId(null);
  }

  async function handleAction(requestId: number, action: "APPROVED" | "REJECTED") {
    setProcessing(requestId);
    await fetch("/api/op/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action }),
    });
    await Promise.all([loadRequests(), loadHistory()]);
    setProcessing(null);
  }

  async function handleExempt(exempt: boolean) {
    const id = Number(exemptClubId.trim());
    if (!id) return;
    setExemptLoading(true);
    const res = await fetch(`/api/op/clubs/${id}/exempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exempt }),
    });
    const data = await res.json();
    setExemptMsg(res.ok ? "✅ 무료 사용 설정 완료" : `❌ ${data.error}`);
    if (res.ok) {
      setExemptClubId("");
      await loadExemptClubs();
    }
    setExemptLoading(false);
  }

  useEffect(() => {
    fetch("/api/op/requests").then(r => {
      if (r.ok) {
        setAuthed(true);
        r.json().then(setRequests);
        loadHistory();
        loadExemptClubs();
      }
    });
  }, []);

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-2xl font-black text-slate-900">🔐 운영자 페이지</h1>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-400"
          />
          {loginError && <p className="mt-2 text-sm text-red-500">{loginError}</p>}
          <button type="submit" className="mt-4 w-full rounded-xl bg-sky-600 py-3 font-bold text-white hover:bg-sky-700">
            로그인
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <h1 className="mb-6 text-2xl font-black text-slate-900">🛠️ 콕매니저 운영자 패널</h1>

      {/* Subscription Requests */}
      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">💳 구독 입금 신청 ({requests.length}건 대기중)</h2>
          <button onClick={loadRequests} className="rounded-lg bg-slate-200 px-3 py-1 text-sm font-medium hover:bg-slate-300">
            새로고침
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-slate-400">대기 중인 신청이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {requests.map(r => {
              const planInfo = SUBSCRIPTION_PLANS[r.plan as keyof typeof SUBSCRIPTION_PLANS];
              const kst = new Date(new Date(r.createdAt).getTime() + 9 * 60 * 60 * 1000);
              return (
                <div key={r.id} className="rounded-xl bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        클럽 ID {r.club.id} — {r.club.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        플랜: <span className="font-semibold">{planInfo?.label ?? r.plan}</span>
                        {" · "}금액: <span className="font-semibold">{r.amount.toLocaleString()}원</span>
                        {" · "}입금자명: <span className="font-semibold">{r.depositorName}</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        신청: {kst.toISOString().replace("T", " ").slice(0, 19)} KST
                        {" · "}현재 상태: {r.club.subscriptionStatus}
                        {r.club.subscriptionEnd && ` (만료: ${new Date(r.club.subscriptionEnd).toISOString().slice(0, 10)})`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(r.id, "APPROVED")}
                        disabled={processing === r.id}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        ✅ 승인
                      </button>
                      <button
                        onClick={() => handleAction(r.id, "REJECTED")}
                        disabled={processing === r.id}
                        className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        ❌ 거절
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* EXEMPT 설정 */}
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold text-slate-800">⭐ 클럽 무료 사용 설정 (EXEMPT)</h2>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs text-slate-400">클럽 ID를 입력해 영구 무료 사용으로 설정합니다. 복구는 아래 목록에서 할 수 있습니다.</p>
          <div className="flex flex-wrap gap-3">
            <input
              type="number"
              value={exemptClubId}
              onChange={e => { setExemptClubId(e.target.value); setExemptMsg(""); }}
              placeholder="클럽 ID 입력"
              className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
            />
            <button
              onClick={() => handleExempt(true)}
              disabled={exemptLoading}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              무료 사용 설정
            </button>
          </div>
          {exemptMsg && <p className="mt-3 text-sm font-medium text-slate-700">{exemptMsg}</p>}
        </div>
      </section>

      {/* 현재 무료 사용 클럽 목록 */}
      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">⭐ 무료 사용 클럽 목록</h2>
          <button
            onClick={loadExemptClubs}
            disabled={exemptClubsLoading}
            className="rounded-lg bg-slate-200 px-3 py-1 text-sm font-medium hover:bg-slate-300 disabled:opacity-50"
          >
            {exemptClubsLoading ? "로딩 중..." : "새로고침"}
          </button>
        </div>

        {exemptClubs.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-slate-400">
            {exemptClubsLoading ? "로딩 중..." : "무료 사용 설정된 클럽이 없습니다."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <th className="px-4 py-3">클럽 ID</th>
                  <th className="px-4 py-3">클럽명</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">구독 만료일</th>
                  <th className="px-4 py-3">관리</th>
                </tr>
              </thead>
              <tbody>
                {exemptClubs.map((club, i) => (
                  <tr
                    key={club.id}
                    className={`border-b border-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}
                  >
                    <td className="px-4 py-3 text-xs text-slate-400">#{club.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{club.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">⭐ EXEMPT</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {club.subscriptionEnd
                        ? new Date(club.subscriptionEnd).toISOString().slice(0, 10)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRevertToTrial(club.id)}
                        disabled={revertingId === club.id}
                        className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                      >
                        {revertingId === club.id ? "처리 중..." : "TRIAL로 복구"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 처리 히스토리 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">
            📋 승인/거절 히스토리
            {historyLoaded && (
              <span className="ml-2 text-sm font-normal text-slate-400">전체 {history.length}건</span>
            )}
          </h2>
          <button
            onClick={() => { setHistoryPage(1); loadHistory(); }}
            disabled={historyLoading}
            className="rounded-lg bg-slate-200 px-3 py-1 text-sm font-medium hover:bg-slate-300 disabled:opacity-50"
          >
            {historyLoading ? "로딩 중..." : "새로고침"}
          </button>
        </div>

        {!historyLoaded ? (
          <div className="rounded-xl bg-white p-6 text-center text-slate-400">로딩 중...</div>
        ) : history.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-slate-400">처리된 내역이 없습니다.</div>
        ) : (() => {
          const totalPages = Math.ceil(history.length / HISTORY_PAGE_SIZE);
          const paginated = history.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);
          return (
            <>
              <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                      <th className="px-4 py-3">처리일시 (KST)</th>
                      <th className="px-4 py-3">클럽</th>
                      <th className="px-4 py-3">플랜</th>
                      <th className="px-4 py-3">금액</th>
                      <th className="px-4 py-3">입금자명</th>
                      <th className="px-4 py-3">신청일시</th>
                      <th className="px-4 py-3">결과</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((h, i) => {
                      const planInfo = SUBSCRIPTION_PLANS[h.plan as keyof typeof SUBSCRIPTION_PLANS];
                      const processedKst = h.processedAt
                        ? new Date(new Date(h.processedAt).getTime() + 9 * 60 * 60 * 1000)
                            .toISOString().replace("T", " ").slice(0, 16)
                        : "-";
                      const createdKst = new Date(new Date(h.createdAt).getTime() + 9 * 60 * 60 * 1000)
                        .toISOString().replace("T", " ").slice(0, 16);
                      return (
                        <tr
                          key={h.id}
                          className={`border-b border-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}
                        >
                          <td className="px-4 py-3 font-medium text-slate-700">{processedKst}</td>
                          <td className="px-4 py-3 text-slate-900">
                            <span className="font-semibold">{h.club.name}</span>
                            <span className="ml-1 text-xs text-slate-400">#{h.club.id}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{planInfo?.label ?? h.plan}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{h.amount.toLocaleString()}원</td>
                          <td className="px-4 py-3 text-slate-600">{h.depositorName}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{createdKst}</td>
                          <td className="px-4 py-3">
                            {h.status === "APPROVED" ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">✅ 승인</span>
                            ) : (
                              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-600">❌ 거절</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-1">
                  <button
                    onClick={() => setHistoryPage(1)}
                    disabled={historyPage === 1}
                    className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => Math.abs(p - historyPage) <= 2)
                    .map(p => (
                      <button
                        key={p}
                        onClick={() => setHistoryPage(p)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                          p === historyPage
                            ? "bg-slate-900 text-white"
                            : "text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  <button
                    onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                    disabled={historyPage === totalPages}
                    className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setHistoryPage(totalPages)}
                    disabled={historyPage === totalPages}
                    className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                  >
                    »
                  </button>
                  <span className="ml-2 text-xs text-slate-400">{historyPage} / {totalPages} 페이지</span>
                </div>
              )}
            </>
          );
        })()}
      </section>
    </div>
  );
}

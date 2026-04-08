"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { AttendancePanel } from "@/components/dashboard/AttendancePanel";
import { ClubSettingsPanel } from "@/components/dashboard/ClubSettingsPanel";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  DashboardTutorial,
  type DashboardTutorialFinishMode,
  type DashboardTutorialStep,
} from "@/components/dashboard/DashboardTutorial";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { DeletedMembersTable } from "@/components/dashboard/DeletedMembersTable";
import { FeesTable } from "@/components/dashboard/FeesTable";
import { JoinRequestLinkPanel } from "@/components/dashboard/JoinRequestLinkPanel";
import { MemberFormModal } from "@/components/dashboard/MemberFormModal";
import { MembersTable } from "@/components/dashboard/MembersTable";
import { RequestsTable } from "@/components/dashboard/RequestsTable";
import { SessionsPanel } from "@/components/dashboard/SessionsPanel";
import { SpecialFeesPanel } from "@/components/dashboard/SpecialFeesPanel";
import { SubscriptionOverlay } from "@/components/dashboard/SubscriptionOverlay";
import type {
  ClubInfo,
  ClubSession,
  DashboardStats,
  DashboardTab,
  Fee,
  FeeMember,
  Member,
  MemberFormState,
  MemberRequest,
  SpecialFee,
} from "@/components/dashboard/types";
import { toDateInputValue } from "@/components/dashboard/utils";
import {
  getPaymentMode,
  getSubscriptionAmount,
  getTossClientKey,
} from "@/lib/payments-client";

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (input: { customerKey: string }) => {
        requestPayment: (input: {
          method: string;
          amount: { currency: string; value: number };
          orderId: string;
          orderName: string;
          successUrl: string;
          failUrl: string;
          customerEmail?: string;
          customerName?: string;
        }) => Promise<void>;
      };
    };
  }
}

const initialForm: MemberFormState = {
  name: "",
  gender: "",
  birth: "",
  phone: "",
  level: "",
  customFieldValue: "",
  note: "",
};

async function readJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  return await response.json();
}

async function requestJson<T>(
  input: string,
  init?: RequestInit
) {
  const response = await fetch(input, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(data?.error ?? "요청에 실패했습니다.");
  }

  return data as T;
}

function isIgnorableDashboardNotFound(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("수시회비 항목을 찾을 수 없습니다") ||
      error.message.includes("운동 일정을 찾을 수 없습니다"))
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [clubInfo, setClubInfo] = useState<ClubInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [sessions, setSessions] = useState<ClubSession[]>([]);
  const [specialFees, setSpecialFees] = useState<SpecialFee[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [feeMembers, setFeeMembers] = useState<FeeMember[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [feesCache, setFeesCache] = useState<Record<number, Fee[]>>(
    {}
  );
  const [activeTab, setActiveTab] =
    useState<DashboardTab>("members");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );
  const [selectedSessionId, setSelectedSessionId] = useState<
    number | null
  >(null);
  const [selectedSpecialFeeId, setSelectedSpecialFeeId] =
    useState<number | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] =
    useState<Member | null>(null);
  const [form, setForm] = useState<MemberFormState>(initialForm);
  const [sdkReady, setSdkReady] = useState(false);
  const [paymentLoading, setPaymentLoading] =
    useState(false);
  const [customFieldLabelDraft, setCustomFieldLabelDraft] =
    useState("차량번호");
  const [adminEmailDraft, setAdminEmailDraft] = useState("");
  const [customFieldLabelDirty, setCustomFieldLabelDirty] =
    useState(false);
  const [adminEmailDirty, setAdminEmailDirty] = useState(false);
  const [savingClubSettings, setSavingClubSettings] =
    useState(false);
  const [approvingRequestIds, setApprovingRequestIds] =
    useState<number[]>([]);
  const [loadingSpecialFeeDetail, setLoadingSpecialFeeDetail] =
    useState(false);
  const [loadingSessionDetail, setLoadingSessionDetail] =
    useState(false);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [specialFeesLoaded, setSpecialFeesLoaded] =
    useState(false);
  const [loadingFees, setLoadingFees] = useState(false);
  const [loadingSpecialFees, setLoadingSpecialFees] =
    useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingFeeMembers, setLoadingFeeMembers] =
    useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [feeMembersLoaded, setFeeMembersLoaded] =
    useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialFinishMode, setTutorialFinishMode] =
    useState<DashboardTutorialFinishMode>("prompt");
  const [tutorialMemberPracticePending, setTutorialMemberPracticePending] =
    useState(false);
  const [tutorialInitialized, setTutorialInitialized] =
    useState(false);

  const paymentMode = getPaymentMode();
  const subscriptionAmount = getSubscriptionAmount();
  const tossClientKey = getTossClientKey();
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const publicJoinLink =
    clubInfo?.publicJoinToken && origin
      ? `${origin}/join/${clubInfo.publicJoinToken}`
      : "";
  const publicSessionBaseUrl = origin
    ? `${origin}/session`
    : "/session";

  const activeMembers = [...members]
    .filter((member) => !member.deleted)
    .sort((left, right) =>
      left.name.localeCompare(right.name, "ko")
    );

  const deletedMembers = members
    .filter((member) => member.deleted)
    .sort((left, right) =>
      left.name.localeCompare(right.name, "ko")
    );

  const isExpired =
    clubInfo?.calculatedStatus === "EXPIRED" ||
    clubInfo?.calculatedStatus === "BLOCKED";
  const hasCachedFeesForSelectedYear = Boolean(
    feesCache[selectedYear]
  );
  const shouldShowInitialFeesLoading =
    activeTab === "fees" &&
    ((loadingFeeMembers && !feeMembersLoaded) ||
      (loadingFees && !hasCachedFeesForSelectedYear) ||
      (loadingSpecialFees && !specialFeesLoaded));
  const shouldShowInitialSessionsLoading =
    (activeTab === "sessions" || activeTab === "attendance") &&
    loadingSessions &&
    sessions.length === 0;
  const tutorialSteps = useMemo<DashboardTutorialStep[]>(
    () => [
      {
        id: "welcome",
        title: "콕매니저 사용 가이드",
        description:
          "처음 쓰는 관리자도 바로 시작할 수 있도록\n주요 탭과 버튼만 짧게 안내해드릴게요.",
      },
      {
        id: "members",
        title: "회원 관리부터 시작하세요",
        description:
          "회원 직접 등록, 수정, 탈퇴 처리는 여기서 합니다.\n이미 등록된 회원 명단도 이 탭에서 가장 자주 확인하게 됩니다.",
        targetId: "tab-members",
        tab: "members",
      },
      {
        id: "requests",
        title: "가입 신청 링크를 먼저 공유하세요",
        description:
          "가입 신청 탭 맨 위에서 공유 링크를 복사해 단톡방이나 공지에 올리면,\n신규 회원이 직접 신청서를 작성할 수 있습니다.",
        targetId: "tab-requests",
        tab: "requests",
      },
      {
        id: "sessions",
        title: "운동 일정은 링크로 받습니다",
        description:
          "운동 일정을 만들고 참석 링크를 공유하면,\n참석 신청 · 대기 인원 · 게스트 신청이 한 흐름으로 정리됩니다.",
        targetId: "tab-sessions",
        tab: "sessions",
      },
      {
        id: "fees",
        title: "회비는 월회비와 수시회비로 나눠 관리합니다",
        description:
          "월회비는 체크 방식으로 빠르게 관리하고,\n대회비나 단체복비 같은 일시성 비용은 수시회비로 따로 관리하면 됩니다.",
        targetId: "tab-fees",
        tab: "fees",
      },
      {
        id: "attendance",
        title: "출석은 실제 참석 상태만 체크하면 됩니다",
        description:
          "운동 신청된 명단이 자동으로 넘어오기 때문에,\n현장에서는 출석 · 지각 · 결석만 체크하면 됩니다.",
        targetId: "tab-attendance",
        tab: "attendance",
      },
      {
        id: "stats",
        title: "운영 통계도 바로 확인할 수 있습니다",
        description:
          "주간 · 월간 기준으로 참석, 게스트, 미납 현황을 보면서\n총무가 운영 상태를 빠르게 파악할 수 있습니다.",
        targetId: "tab-stats",
        tab: "stats",
      },
      {
        id: "finish",
        title: "이제 바로 운영을 시작해보세요",
        description:
          "회원 등록부터 시작하거나,\n가입 신청 링크와 운동 일정 링크를 먼저 공유해도 좋습니다.",
      },
    ],
    []
  );

  async function refreshClubInfo() {
    const nextClubInfo = await requestJson<ClubInfo>("/api/club-info");

    setClubInfo(nextClubInfo);
    setCustomFieldLabelDraft((current) =>
      customFieldLabelDirty
        ? current
        : nextClubInfo.customFieldLabel
    );
    setAdminEmailDraft((current) =>
      adminEmailDirty ? current : nextClubInfo.adminEmail
    );
  }

  async function refreshMembers() {
    setLoadingMembers(true);

    try {
      setMembers(await requestJson<Member[]>("/api/members"));
      setMembersLoaded(true);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function refreshFeeMembers() {
    setLoadingFeeMembers(true);

    try {
      setFeeMembers(
        await requestJson<FeeMember[]>("/api/members?scope=fees")
      );
      setFeeMembersLoaded(true);
    } finally {
      setLoadingFeeMembers(false);
    }
  }

  async function refreshRequests() {
    setLoadingRequests(true);

    try {
      setRequests(
        await requestJson<MemberRequest[]>("/api/member-request")
      );
      setRequestsLoaded(true);
    } finally {
      setLoadingRequests(false);
    }
  }

  async function refreshStats() {
    setLoadingStats(true);

    try {
      setStats(
        await requestJson<DashboardStats>("/api/dashboard-stats")
      );
      setStatsLoaded(true);
    } finally {
      setLoadingStats(false);
    }
  }

  async function refreshSessions() {
    setLoadingSessions(true);

    try {
      const nextSessions = await requestJson<ClubSession[]>(
        "/api/sessions"
      );

      const nextSelectedSessionId =
        nextSessions.length === 0
          ? null
          : nextSessions.some(
                (session) => session.id === selectedSessionId
              )
            ? selectedSessionId
            : nextSessions[0].id;

      let mergedSessions = nextSessions.map((session) => {
        const existing = sessions.find(
          (item) => item.id === session.id
        );

        return existing?.participants
          ? { ...session, participants: existing.participants }
          : session;
      });

      if (nextSelectedSessionId) {
        const selectedSummary = mergedSessions.find(
          (session) => session.id === nextSelectedSessionId
        );

        if (selectedSummary && !selectedSummary.participants) {
          try {
            const detail = await requestJson<ClubSession>(
              `/api/sessions?id=${nextSelectedSessionId}`
            );

            mergedSessions = mergedSessions.map((session) =>
              session.id === nextSelectedSessionId
                ? { ...session, ...detail }
                : session
            );
          } catch {
            // Ignore initial detail load failures on tab open.
          }
        }
      }

      setSessions(mergedSessions);
      setSelectedSessionId(nextSelectedSessionId);
    } finally {
      setLoadingSessions(false);
    }
  }

  async function refreshSessionDetail(
    sessionId: number,
    options?: { silent?: boolean }
  ) {
    const silent = options?.silent ?? false;

    if (!silent) {
      setLoadingSessionDetail(true);
    }

    try {
      const detail = await requestJson<ClubSession>(
        `/api/sessions?id=${sessionId}`
      );

      setSessions((current) =>
        current.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                ...detail,
              }
            : session
        )
      );
    } finally {
      if (!silent) {
        setLoadingSessionDetail(false);
      }
    }
  }

  async function refreshSpecialFees() {
    setLoadingSpecialFees(true);

    try {
      const nextSpecialFees = await requestJson<SpecialFee[]>(
        "/api/special-fees"
      );

      setSpecialFeesLoaded(true);

      const nextSelectedSpecialFeeId =
        nextSpecialFees.length === 0
          ? null
          : nextSpecialFees.some(
                (specialFee) =>
                  specialFee.id === selectedSpecialFeeId
              )
            ? selectedSpecialFeeId
            : nextSpecialFees[0].id;

      let mergedSpecialFees = nextSpecialFees.map((specialFee) => {
        const existing = specialFees.find(
          (item) => item.id === specialFee.id
        );

        return existing?.payments
          ? { ...specialFee, payments: existing.payments }
          : specialFee;
      });

      if (nextSelectedSpecialFeeId) {
        const selectedSummary = mergedSpecialFees.find(
          (specialFee) => specialFee.id === nextSelectedSpecialFeeId
        );

        if (selectedSummary && !selectedSummary.payments) {
          try {
            const detail = await requestJson<SpecialFee>(
              `/api/special-fees?id=${nextSelectedSpecialFeeId}`
            );

            mergedSpecialFees = mergedSpecialFees.map((specialFee) =>
              specialFee.id === nextSelectedSpecialFeeId
                ? { ...specialFee, ...detail }
                : specialFee
            );
          } catch {
            // Ignore initial detail load failures on tab open.
          }
        }
      }

      setSpecialFees(mergedSpecialFees);
      setSelectedSpecialFeeId(nextSelectedSpecialFeeId);
    } finally {
      setLoadingSpecialFees(false);
    }
  }

  async function refreshSpecialFeeDetail(
    specialFeeId: number,
    suppressNotFoundAlert = false
  ) {
    setLoadingSpecialFeeDetail(true);

    try {
      const detail = await requestJson<SpecialFee>(
        `/api/special-fees?id=${specialFeeId}`
      );

      setSpecialFees((current) =>
        current.map((specialFee) =>
          specialFee.id === specialFeeId
            ? {
                ...specialFee,
                ...detail,
              }
            : specialFee
        )
      );
    } catch (error) {
      if (suppressNotFoundAlert) {
        setSelectedSpecialFeeId((current) =>
          current === specialFeeId ? null : current
        );
        return;
      }

      throw error;
    } finally {
      setLoadingSpecialFeeDetail(false);
    }
  }

  async function refreshFees(
    year = selectedYear,
    force = false
  ) {
    if (!force && feesCache[year]) {
      setFees(feesCache[year]);
      return;
    }

    setLoadingFees(true);

    try {
      const nextFees = await requestJson<Fee[]>(
        `/api/fees?year=${year}`
      );

      setFees(nextFees);
      setFeesCache((current) => ({
        ...current,
        [year]: nextFees,
      }));
    } finally {
      setLoadingFees(false);
    }
  }

  async function performLogout() {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.push("/admin/login");
    }
  }

  useEffect(() => {
    refreshClubInfo().catch((error: Error) => {
      alert(error.message);
      router.push("/admin/login");
    });
  }, [router]);

  useEffect(() => {
    if (!clubInfo || tutorialInitialized || isExpired) {
      return;
    }

    const storageKey = `kokmanager-dashboard-tutorial:${clubInfo.id}`;
    const hasSeenTutorial =
      window.localStorage.getItem(storageKey) === "done";

    if (!hasSeenTutorial) {
      setTutorialStepIndex(0);
      setTutorialOpen(true);
    }

    setTutorialInitialized(true);
  }, [clubInfo, isExpired, tutorialInitialized]);

  useEffect(() => {
    if (!tutorialOpen) {
      return;
    }

    const currentStep = tutorialSteps[tutorialStepIndex];

    if (
      currentStep?.id === "finish" &&
      tutorialFinishMode === "member-button"
    ) {
      if (activeTab !== "members") {
        setActiveTab("members");
      }
      return;
    }

    if (currentStep?.tab && activeTab !== currentStep.tab) {
      setActiveTab(currentStep.tab);
    }
  }, [
    activeTab,
    tutorialFinishMode,
    tutorialOpen,
    tutorialStepIndex,
    tutorialSteps,
  ]);

  useEffect(() => {
    if (activeTab !== "stats" || statsLoaded) {
      return;
    }

    refreshStats().catch(() => undefined);
  }, [activeTab, statsLoaded]);

  useEffect(() => {
    if (
      (activeTab === "members" ||
        activeTab === "deleted" ||
        activeTab === "fees") &&
      !membersLoaded
    ) {
      refreshMembers().catch((error: Error) => {
        alert(error.message);
      });
    }

    if (activeTab === "requests" && !requestsLoaded) {
      refreshRequests().catch((error: Error) => {
        alert(error.message);
      });
    }
  }, [activeTab, membersLoaded, requestsLoaded]);

  useEffect(() => {
    if (activeTab !== "fees") {
      return;
    }

    Promise.all([
      feeMembersLoaded ? Promise.resolve() : refreshFeeMembers(),
      refreshFees(selectedYear),
      specialFeesLoaded ? Promise.resolve() : refreshSpecialFees(),
    ]).catch((error: Error) => {
      if (isIgnorableDashboardNotFound(error)) {
        return;
      }

      alert(error.message);
    });
  }, [activeTab, selectedYear, feeMembersLoaded, specialFeesLoaded]);

  useEffect(() => {
    if (
      activeTab !== "sessions" &&
      activeTab !== "attendance"
    ) {
      return;
    }

    refreshSessions().catch((error: Error) => {
      if (isIgnorableDashboardNotFound(error)) {
        return;
      }

      alert(error.message);
    });
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "fees" || !selectedSpecialFeeId) {
      return;
    }

    const selectedSpecialFee = specialFees.find(
      (specialFee) => specialFee.id === selectedSpecialFeeId
    );

    if (!selectedSpecialFee) {
      if (!specialFees.length) {
        return;
      }

      setSelectedSpecialFeeId(specialFees[0].id);
      return;
    }

    if (selectedSpecialFee.payments) {
      return;
    }

    refreshSpecialFeeDetail(
      selectedSpecialFeeId,
      true
    ).catch(() => undefined);
  }, [activeTab, selectedSpecialFeeId, specialFees]);

  useEffect(() => {
    if (
      (activeTab !== "sessions" &&
        activeTab !== "attendance") ||
      !selectedSessionId
    ) {
      return;
    }

    const selectedSession = sessions.find(
      (session) => session.id === selectedSessionId
    );

    if (!selectedSession) {
      if (!sessions.length) {
        return;
      }

      setSelectedSessionId(sessions[0].id);
      return;
    }

    if (selectedSession?.participants) {
      return;
    }

    refreshSessionDetail(selectedSessionId).catch(() => undefined);
  }, [activeTab, selectedSessionId, sessions]);

  useEffect(() => {
    const refreshClubInfoOnly = () => {
      void refreshClubInfo().catch(() => undefined);
    };

    const refreshRequestData = () => {
      refreshClubInfoOnly();

      if (activeTab === "requests") {
        void refreshRequests().catch(() => undefined);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshRequestData();
      }
    };

    const clubInfoInterval = window.setInterval(
      refreshClubInfoOnly,
      4000
    );

    const requestsInterval =
      activeTab === "requests"
        ? window.setInterval(refreshRequestData, 4000)
        : null;

    window.addEventListener("focus", refreshRequestData);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.clearInterval(clubInfoInterval);
      if (requestsInterval) {
        window.clearInterval(requestsInterval);
      }
      window.removeEventListener("focus", refreshRequestData);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    activeTab,
    selectedSessionId,
    customFieldLabelDirty,
    adminEmailDirty,
  ]);

  useEffect(() => {
    if (
      (activeTab !== "sessions" &&
        activeTab !== "attendance") ||
      !selectedSessionId
    ) {
      return;
    }

    const refreshSelectedSessionDetail = () => {
      void refreshSessionDetail(selectedSessionId, {
        silent: true,
      }).catch(() => undefined);
    };

    const interval = window.setInterval(
      refreshSelectedSessionDetail,
      4000
    );

    window.addEventListener("focus", refreshSelectedSessionDetail);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(
        "focus",
        refreshSelectedSessionDetail
      );
    };
  }, [activeTab, selectedSessionId]);

  useEffect(() => {
    if (window.TossPayments) {
      setSdkReady(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[data-toss-sdk="true"]'
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () =>
        setSdkReady(true)
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v2/standard";
    script.dataset.tossSdk = "true";
    script.onload = () => setSdkReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    window.history.pushState(
      { fromDashboard: true },
      "",
      window.location.href
    );

    const handlePopState = () => {
      const shouldLogout = confirm("로그아웃하시겠습니까?");

      if (!shouldLogout) {
        window.history.pushState(
          { fromDashboard: true },
          "",
          window.location.href
        );
        return;
      }

      performLogout().catch((error: Error) => {
        alert(error.message);
      });
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  async function handlePayment() {
    if (!clubInfo) {
      alert("클럽 정보를 불러오는 중입니다.");
      return;
    }

    if (!sdkReady || !window.TossPayments) {
      alert("결제 모듈을 불러오는 중입니다.");
      return;
    }

    setPaymentLoading(true);

    try {
      const tossPayments = window.TossPayments(tossClientKey);
      const payment = tossPayments.payment({
        customerKey: nanoid(),
      });

      await payment.requestPayment({
        method: "CARD",
        amount: {
          currency: "KRW",
          value: subscriptionAmount,
        },
        orderId: nanoid(),
        orderName: `${clubInfo.name} 클럽 구독 결제`,
        successUrl: `${window.location.origin}/admin/dashboard/payment-success`,
        failUrl: `${window.location.origin}/admin/dashboard/payment-fail`,
        customerName: `${clubInfo.name} 관리자`,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "결제 요청 중 오류가 발생했습니다.";
      alert(message);
    } finally {
      setPaymentLoading(false);
    }
  }

  function openCreateMemberModal() {
    setEditingMember(null);
    setForm(initialForm);
    setShowMemberModal(true);
  }

  function openEditMemberModal(member: Member) {
    setEditingMember(member);
    setForm({
      name: member.name,
      gender: member.gender,
      birth: toDateInputValue(member.birth),
      phone: member.phone,
      level: member.level,
      customFieldValue: member.customFieldValue || "",
      note: member.note || "",
    });
    setShowMemberModal(true);
  }

  async function handleMemberSubmit() {
    if (!form.name || !form.gender || !form.level) {
      alert("이름, 성별, 급수는 필수입니다.");
      return;
    }

    await requestJson<Member>("/api/members", {
      method: editingMember ? "PUT" : "POST",
      body: JSON.stringify(
        editingMember
          ? { ...form, id: editingMember.id }
          : form
      ),
    });

    setShowMemberModal(false);
    setEditingMember(null);
    setForm(initialForm);
    await refreshMembers();
    if (feeMembersLoaded || activeTab === "fees") {
      await refreshFeeMembers();
    }

    if (!editingMember) {
      if (activeTab === "fees") {
        await refreshSpecialFees();
      }

      if (
        tutorialOpen &&
        tutorialSteps[tutorialStepIndex]?.id === "finish" &&
        tutorialMemberPracticePending
      ) {
        setTutorialMemberPracticePending(false);
        setTutorialOpen(true);
        setTutorialFinishMode("final");
      }
    }
  }

  async function handleMemberDelete(id: number) {
    if (!confirm("해당 회원을 탈퇴 회원으로 이동할까요?")) {
      return;
    }

    await requestJson("/api/members", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });

    await refreshMembers();
    if (feeMembersLoaded || activeTab === "fees") {
      await refreshFeeMembers();
    }
  }

  async function handleRestore(id: number) {
    if (!confirm("해당 회원을 복구할까요?")) {
      return;
    }

    await requestJson("/api/members", {
      method: "PATCH",
      body: JSON.stringify({ id }),
    });

    await refreshMembers();
    if (feeMembersLoaded || activeTab === "fees") {
      await refreshFeeMembers();
    }
  }

  async function handlePermanentDelete(id: number) {
    if (
      !confirm(
        "영구 삭제하면 회비와 일정 기록까지 함께 사라집니다. 계속할까요?"
      )
    ) {
      return;
    }

    await requestJson("/api/members/permanent", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });

    await refreshMembers();
    if (feeMembersLoaded || activeTab === "fees") {
      await refreshFeeMembers();
    }
  }

  async function toggleFee(
    memberId: number,
    year: number,
    month: number,
    currentPaid: boolean
  ) {
    const nextPaid = !currentPaid;

    const updatedFee = await requestJson<Fee>("/api/fees", {
      method: "POST",
      body: JSON.stringify({
        memberId,
        year,
        month,
        paid: nextPaid,
      }),
    });

    setFees((current) => {
      const key = `${memberId}-${year}-${month}`;
      const nextFees = current.filter(
        (fee) =>
          `${fee.memberId}-${fee.year}-${fee.month}` !== key
      );

      if (updatedFee.paid) {
        nextFees.push(updatedFee);
      }

      return nextFees;
    });
    setFeesCache((current) => {
      const yearFees = current[year] ?? [];
      const key = `${memberId}-${year}-${month}`;
      const nextYearFees = yearFees.filter(
        (fee) =>
          `${fee.memberId}-${fee.year}-${fee.month}` !== key
      );

      if (updatedFee.paid) {
        nextYearFees.push(updatedFee);
      }

      return {
        ...current,
        [year]: nextYearFees,
      };
    });
  }

  async function handleAllPaid(memberId: number) {
    if (!confirm(`${selectedYear}년 12개월 모두 납부 처리할까요?`)) {
      return;
    }

    const updatedFees = await requestJson<Fee[]>("/api/fees", {
      method: "PUT",
      body: JSON.stringify({
        memberId,
        year: selectedYear,
        paid: true,
      }),
    });

    setFees((current) => {
      const nextFees = current.filter(
        (fee) =>
          !(
            fee.memberId === memberId &&
            fee.year === selectedYear
          )
      );

      return [...nextFees, ...updatedFees];
    });
    setFeesCache((current) => {
      const yearFees = current[selectedYear] ?? [];
      const nextYearFees = yearFees.filter(
        (fee) =>
          !(
            fee.memberId === memberId &&
            fee.year === selectedYear
          )
      );

      return {
        ...current,
        [selectedYear]: [...nextYearFees, ...updatedFees],
      };
    });
  }

  async function handleAllUnpaid(memberId: number) {
    if (!confirm(`${selectedYear}년 12개월 모두 미납 처리할까요?`)) {
      return;
    }

    const updatedFees = await requestJson<Fee[]>("/api/fees", {
      method: "PUT",
      body: JSON.stringify({
        memberId,
        year: selectedYear,
        paid: false,
      }),
    });

    setFees((current) => {
      const nextFees = current.filter(
        (fee) =>
          !(
            fee.memberId === memberId &&
            fee.year === selectedYear
          )
      );

      return [...nextFees, ...updatedFees];
    });
    setFeesCache((current) => {
      const yearFees = current[selectedYear] ?? [];
      const nextYearFees = yearFees.filter(
        (fee) =>
          !(
            fee.memberId === memberId &&
            fee.year === selectedYear
          )
      );

      return {
        ...current,
        [selectedYear]: [...nextYearFees, ...updatedFees],
      };
    });
  }

  async function handleApprove(id: number) {
    if (!confirm("가입 신청을 승인할까요?")) {
      return;
    }

    if (approvingRequestIds.includes(id)) {
      return;
    }

    setApprovingRequestIds((current) => [...current, id]);

    try {
      const result = await requestJson<{
        success: boolean;
        requestId: number;
        member: Member;
      }>("/api/member-request/approve", {
        method: "POST",
        body: JSON.stringify({ id }),
      });

      setRequests((current) =>
        current.filter((request) => request.id !== result.requestId)
      );
      setClubInfo((current) =>
        current
          ? {
              ...current,
              pendingRequestCount: Math.max(
                0,
                current.pendingRequestCount - 1
              ),
            }
          : current
      );
      setMembers((current) => {
        const withoutDuplicate = current.filter(
          (member) => member.id !== result.member.id
        );

      return [...withoutDuplicate, { ...result.member, fees: [] }];
      });
      setFeeMembers((current) => {
        const withoutDuplicate = current.filter(
          (member) => member.id !== result.member.id
        );

        return [
          ...withoutDuplicate,
          {
            id: result.member.id,
            name: result.member.name,
            phone: result.member.phone,
          },
        ].sort((left, right) =>
          left.name.localeCompare(right.name, "ko")
        );
      });
      setFeeMembersLoaded(true);
      setMembersLoaded(true);
      setActiveTab("members");

      if (requestsLoaded) {
        void refreshRequests().catch(() => undefined);
      }
      void refreshMembers().catch(() => undefined);
      if (activeTab === "fees") {
        void refreshSpecialFees().catch(() => undefined);
      }

      if (
        activeTab === "sessions" ||
        activeTab === "attendance"
      ) {
        void refreshSessions().catch(() => undefined);
      }
    } finally {
      setApprovingRequestIds((current) =>
        current.filter((requestId) => requestId !== id)
      );
    }
  }

  async function handleReject(id: number) {
    if (!confirm("가입 신청을 거절할까요?")) {
      return;
    }

    await requestJson("/api/member-request/reject", {
      method: "POST",
      body: JSON.stringify({ id }),
    });

    setClubInfo((current) =>
      current
        ? {
            ...current,
            pendingRequestCount: Math.max(
              0,
              current.pendingRequestCount - 1
            ),
          }
        : current
    );

    await refreshRequests();
  }

  async function handleCreateSession(payload: {
    title: string;
    description: string;
    location: string;
    date: string;
    startTime: string;
    endTime: string;
    capacity: string;
  }) {
    const created = await requestJson<ClubSession>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setSessions((current) => [
      created,
      ...current.filter((session) => session.id !== created.id),
    ]);
    setSelectedSessionId(created.id);
  }

  async function handleSelectSession(sessionId: number) {
    setSelectedSessionId(sessionId);

    const selectedSession = sessions.find(
      (session) => session.id === sessionId
    );

    if (selectedSession?.participants) {
      return;
    }

    await refreshSessionDetail(sessionId).catch(() => {
      setSelectedSessionId((current) =>
        current === sessionId ? null : current
      );
    });
  }

  async function handleDeleteSession(sessionId: number) {
    await requestJson("/api/sessions", {
      method: "DELETE",
      body: JSON.stringify({ id: sessionId }),
    });

    await refreshSessions();
  }

  async function handleSaveCustomFieldLabel() {
    setSavingClubSettings(true);

    try {
      const response = await requestJson<{
        customFieldLabel: string;
        adminEmail: string;
      }>("/api/club-settings", {
        method: "PATCH",
        body: JSON.stringify({
          customFieldLabel: customFieldLabelDraft,
          adminEmail: adminEmailDraft,
        }),
      });

      setClubInfo((current) =>
        current
          ? {
              ...current,
              customFieldLabel: response.customFieldLabel,
              adminEmail: response.adminEmail,
            }
          : current
      );
      setCustomFieldLabelDraft(response.customFieldLabel);
      setAdminEmailDraft(response.adminEmail);
      setCustomFieldLabelDirty(false);
      setAdminEmailDirty(false);
    } finally {
      setSavingClubSettings(false);
    }
  }

  async function handleCreateSpecialFee(payload: {
    title: string;
    amount: string;
    dueDate: string;
    description: string;
  }) {
    const created = await requestJson<SpecialFee>("/api/special-fees", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setSpecialFees((current) => [
      created,
      ...current.filter((item) => item.id !== created.id),
    ]);
    setSelectedSpecialFeeId(created.id);
  }

  async function handleDeleteSpecialFee(specialFeeId: number) {
    await requestJson("/api/special-fees", {
      method: "DELETE",
      body: JSON.stringify({ id: specialFeeId }),
    });

    setSpecialFees((current) => {
      const nextSpecialFees = current.filter(
        (specialFee) => specialFee.id !== specialFeeId
      );

      setSelectedSpecialFeeId((currentSelectedFeeId) => {
        if (currentSelectedFeeId !== specialFeeId) {
          return currentSelectedFeeId;
        }

        return nextSpecialFees[0]?.id ?? null;
      });

      return nextSpecialFees;
    });
  }

  async function handleSelectSpecialFee(specialFeeId: number) {
    setSelectedSpecialFeeId(specialFeeId);

    const selectedSpecialFee = specialFees.find(
      (specialFee) => specialFee.id === specialFeeId
    );

    if (selectedSpecialFee?.payments) {
      return;
    }

    await refreshSpecialFeeDetail(
      specialFeeId,
      true
    ).catch(() => undefined);
  }

  async function handleToggleSpecialFeePayment(
    specialFeeId: number,
    memberId: number,
    paid: boolean
  ) {
    const nextPaid = !paid;
    const confirmMessage = nextPaid
      ? "납부 처리하시겠습니까?"
      : "미납 상태로 변경하시겠습니까?";

    if (!confirm(confirmMessage)) {
      return;
    }

    const updatedPayment = await requestJson<{
      id: number;
      paid: boolean;
      paidAt: string | Date | null;
      note: string;
      createdAt: string | Date;
      memberId: number;
      specialFeeId: number;
    }>("/api/special-fees/payment", {
      method: "POST",
      body: JSON.stringify({
        specialFeeId,
        memberId,
        paid: nextPaid,
      }),
    });

    setSpecialFees((current) =>
      current.map((specialFee) => {
        if (specialFee.id !== specialFeeId) {
          return specialFee;
        }

        const currentPayments = specialFee.payments ?? [];
        const paymentIndex = currentPayments.findIndex(
          (payment) => payment.memberId === memberId
        );

        let nextPayments = currentPayments;

        if (paymentIndex >= 0) {
          nextPayments = currentPayments.map((payment) =>
            payment.memberId === memberId
              ? {
                  ...payment,
                  ...updatedPayment,
                }
              : payment
          );
        }

        const paidCount =
          nextPayments.length > 0
            ? nextPayments.filter((payment) => payment.paid).length
            : specialFee.paidCount ?? 0;

        return {
          ...specialFee,
          payments: nextPayments,
          paidCount,
        };
      })
    );
  }

  async function handleUpdateSessionStatus(
    sessionId: number,
    status: ClubSession["status"]
  ) {
    await requestJson("/api/sessions", {
      method: "PUT",
      body: JSON.stringify({ id: sessionId, status }),
    });

    await refreshSessions();
    await refreshSessionDetail(sessionId);
  }

  async function handleUpdateAttendance(
    participantId: number,
    attendanceStatus:
      | "PENDING"
      | "PRESENT"
      | "ABSENT"
      | "LATE"
  ) {
    await requestJson("/api/sessions/attendance", {
      method: "POST",
      body: JSON.stringify({
        participantId,
        attendanceStatus,
      }),
    });

    if (selectedSessionId) {
      await refreshSessionDetail(selectedSessionId);
    }
  }

  function markTutorialAsCompleted() {
    if (clubInfo) {
      window.localStorage.setItem(
        `kokmanager-dashboard-tutorial:${clubInfo.id}`,
        "done"
      );
    }
  }

  function closeTutorial() {
    markTutorialAsCompleted();
    setTutorialOpen(false);
    setTutorialStepIndex(0);
    setTutorialFinishMode("prompt");
  }

  function openTutorial() {
    setTutorialStepIndex(0);
    setTutorialFinishMode("prompt");
    setTutorialOpen(true);
  }

  function moveTutorialStep(direction: -1 | 1) {
    setTutorialStepIndex((current) => {
      const next = Math.min(
        Math.max(current + direction, 0),
        tutorialSteps.length - 1
      );

      if (tutorialSteps[next]?.id === "finish") {
        setTutorialFinishMode("prompt");
      }

      return next;
    });
  }

  function handleTutorialMemberPracticeYes() {
    setActiveTab("members");
    setTutorialFinishMode("member-button");
  }

  function handleTutorialMemberPracticeNo() {
    setTutorialFinishMode("final");
  }

  function handleOpenTutorialMemberPractice() {
    setActiveTab("members");
    openCreateMemberModal();
    setTutorialMemberPracticePending(true);
    setTutorialOpen(false);
  }

  function handleTutorialMemberPracticeBack() {
    if (tutorialMemberPracticePending) {
      setShowMemberModal(false);
      setEditingMember(null);
      setForm(initialForm);
      setTutorialMemberPracticePending(false);
      setTutorialOpen(true);
      setTutorialFinishMode("member-button");
      return;
    }

    setTutorialFinishMode("prompt");
  }

  const tutorialTargetIdOverride =
    tutorialSteps[tutorialStepIndex]?.id === "finish"
      ? tutorialFinishMode === "member-button"
        ? "add-member-button"
        : undefined
      : undefined;

  function renderLoadingCard(message: string) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm">
        {message}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_45%,#ffffff_100%)] px-4 py-6 md:px-6">
      <SubscriptionOverlay
        visible={isExpired}
        paymentLoading={paymentLoading}
        paymentMode={paymentMode}
        amount={subscriptionAmount}
        onPay={() => {
          handlePayment().catch((error: Error) => {
            alert(error.message);
          });
        }}
      />
      <DashboardTutorial
        open={tutorialOpen}
        step={tutorialSteps[tutorialStepIndex]}
        stepIndex={tutorialStepIndex}
        totalSteps={tutorialSteps.length}
        finishMode={tutorialFinishMode}
        targetIdOverride={tutorialTargetIdOverride}
        onPrev={() => moveTutorialStep(-1)}
        onNext={() => moveTutorialStep(1)}
        onSkip={closeTutorial}
        onComplete={closeTutorial}
        onFinishYes={handleTutorialMemberPracticeYes}
        onFinishNo={handleTutorialMemberPracticeNo}
        onOpenMemberPractice={handleOpenTutorialMemberPractice}
        onMemberPracticeBack={handleTutorialMemberPracticeBack}
      />

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[2rem] border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <DashboardHeader
            clubName={clubInfo?.name ?? "클럽"}
            subscriptionEnd={clubInfo?.subscriptionEnd}
            onAddMember={openCreateMemberModal}
            onRestartTutorial={openTutorial}
            onLogout={() => {
              if (!confirm("로그아웃하시겠습니까?")) {
                return;
              }

              performLogout().catch((error: Error) => {
                alert(error.message);
              });
            }}
          />

          <div className="mt-6">
            <DashboardTabs
              activeTab={activeTab}
              requestsCount={
                clubInfo?.pendingRequestCount ?? requests.length
              }
              onChange={setActiveTab}
            />
          </div>
        </div>

        {activeTab === "stats" ? (
          <div data-tutorial-id="stats-panel">
            <StatsOverview stats={stats} loading={loadingStats} />
          </div>
        ) : null}

        {activeTab === "members" ? (
          <div
            className="space-y-6"
            data-tutorial-id="members-panel"
          >
            <MembersTable
              members={activeMembers}
              customFieldLabel={
                clubInfo?.customFieldLabel ?? "차량번호"
              }
              onEdit={openEditMemberModal}
              onDelete={(id) => {
                handleMemberDelete(id).catch((error: Error) => {
                  alert(error.message);
                });
              }}
            />
            <ClubSettingsPanel
              customFieldLabel={
                clubInfo?.customFieldLabel ?? "차량번호"
              }
              draftLabel={customFieldLabelDraft}
              adminEmail={clubInfo?.adminEmail ?? ""}
              adminEmailDraft={adminEmailDraft}
              saving={savingClubSettings}
              onChangeDraft={(value) => {
                setCustomFieldLabelDraft(value);
                setCustomFieldLabelDirty(true);
              }}
              onChangeAdminEmailDraft={(value) => {
                setAdminEmailDraft(value);
                setAdminEmailDirty(true);
              }}
              onSave={() => {
                handleSaveCustomFieldLabel()
                  .catch((error: Error) => {
                    alert(error.message);
                  });
              }}
            />
          </div>
        ) : null}

        {activeTab === "requests" ? (
          <div
            className="space-y-6"
            data-tutorial-id="requests-panel"
          >
            <JoinRequestLinkPanel joinLink={publicJoinLink} />
            <RequestsTable
            requests={requests}
            customFieldLabel={
              clubInfo?.customFieldLabel ?? "차량번호"
            }
            approvingIds={approvingRequestIds}
            onApprove={(id) => {
              handleApprove(id).catch((error: Error) => {
                alert(error.message);
              });
            }}
            onReject={(id) => {
              handleReject(id).catch((error: Error) => {
                alert(error.message);
              });
            }}
            />
          </div>
        ) : null}

        {activeTab === "fees" ? (
          <div
            className="space-y-6"
            data-tutorial-id="fees-panel"
          >
            {shouldShowInitialFeesLoading
              ? renderLoadingCard(
                  "월회비 표를 불러오는 중입니다."
                )
              : (
                <FeesTable
                  members={feeMembers}
                  fees={fees}
                  selectedYear={selectedYear}
                  onChangeYear={setSelectedYear}
                  onToggleFee={(
                    memberId,
                    year,
                    month,
                    currentPaid
                  ) => {
                    toggleFee(
                      memberId,
                      year,
                      month,
                      currentPaid
                    ).catch((error: Error) => {
                      alert(error.message);
                    });
                  }}
                  onMarkAllPaid={(memberId) => {
                    handleAllPaid(memberId).catch(
                      (error: Error) => {
                        alert(error.message);
                      }
                    );
                  }}
                  onMarkAllUnpaid={(memberId) => {
                    handleAllUnpaid(memberId).catch(
                      (error: Error) => {
                        alert(error.message);
                      }
                    );
                  }}
                />
              )}
            <SpecialFeesPanel
              members={feeMembers}
              specialFees={specialFees}
              selectedFeeId={selectedSpecialFeeId}
              loadingSelectedFee={loadingSpecialFeeDetail}
              onSelectFee={handleSelectSpecialFee}
              onDeleteFee={handleDeleteSpecialFee}
              onCreateFee={handleCreateSpecialFee}
              onTogglePayment={handleToggleSpecialFeePayment}
            />
          </div>
        ) : null}

        {activeTab === "sessions" ? (
          shouldShowInitialSessionsLoading ? (
            renderLoadingCard(
              "운동 일정을 불러오는 중입니다."
            )
          ) : (
            <SessionsPanel
              sessions={sessions}
              selectedSessionId={selectedSessionId}
              publicSessionBaseUrl={publicSessionBaseUrl}
              loadingSelectedSession={loadingSessionDetail}
              onSelectSession={handleSelectSession}
              onCreateSession={handleCreateSession}
              onDeleteSession={handleDeleteSession}
              onUpdateSessionStatus={handleUpdateSessionStatus}
            />
          )
        ) : null}

        {activeTab === "attendance" ? (
          shouldShowInitialSessionsLoading ? (
            renderLoadingCard(
              "출석 일정을 불러오는 중입니다."
            )
          ) : (
            <AttendancePanel
              sessions={sessions}
              selectedSessionId={selectedSessionId}
              loadingSelectedSession={loadingSessionDetail}
              onSelectSession={handleSelectSession}
              onUpdateAttendance={handleUpdateAttendance}
            />
          )
        ) : null}

        {activeTab === "deleted" ? (
          <DeletedMembersTable
            members={deletedMembers}
            customFieldLabel={
              clubInfo?.customFieldLabel ?? "차량번호"
            }
            onRestore={(id) => {
              handleRestore(id).catch((error: Error) => {
                alert(error.message);
              });
            }}
            onPermanentDelete={(id) => {
              handlePermanentDelete(id).catch(
                (error: Error) => {
                  alert(error.message);
                }
              );
            }}
          />
        ) : null}
      </div>

      <MemberFormModal
        open={showMemberModal}
        editingMember={editingMember}
        form={form}
        customFieldLabel={
          clubInfo?.customFieldLabel ?? "차량번호"
        }
        tutorialTargetId="member-form-modal"
        onChange={setForm}
        onClose={() => {
          setShowMemberModal(false);
          setEditingMember(null);
          setForm(initialForm);
          if (
            tutorialMemberPracticePending
          ) {
            setTutorialMemberPracticePending(false);
            setTutorialOpen(true);
            setTutorialFinishMode("member-button");
          }
        }}
        onSubmit={() => {
          handleMemberSubmit().catch((error: Error) => {
            alert(error.message);
          });
        }}
      />
    </main>
  );
}

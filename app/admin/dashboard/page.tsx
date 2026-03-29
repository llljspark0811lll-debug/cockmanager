"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { AttendancePanel } from "@/components/dashboard/AttendancePanel";
import { ClubSettingsPanel } from "@/components/dashboard/ClubSettingsPanel";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { DeletedMembersTable } from "@/components/dashboard/DeletedMembersTable";
import { FeesTable } from "@/components/dashboard/FeesTable";
import { MemberFormModal } from "@/components/dashboard/MemberFormModal";
import { MembersTable } from "@/components/dashboard/MembersTable";
import { RequestsTable } from "@/components/dashboard/RequestsTable";
import { SessionsPanel } from "@/components/dashboard/SessionsPanel";
import { SpecialFeesPanel } from "@/components/dashboard/SpecialFeesPanel";
import { SubscriptionOverlay } from "@/components/dashboard/SubscriptionOverlay";
import type {
  ClubInfo,
  ClubSession,
  DashboardTab,
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

export default function DashboardPage() {
  const router = useRouter();

  const [clubInfo, setClubInfo] = useState<ClubInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [sessions, setSessions] = useState<ClubSession[]>([]);
  const [specialFees, setSpecialFees] = useState<SpecialFee[]>([]);
  const [activeTab, setActiveTab] =
    useState<DashboardTab>("members");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );
  const [selectedSessionId, setSelectedSessionId] = useState<
    number | null
  >(null);
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
  const [savingClubSettings, setSavingClubSettings] =
    useState(false);
  const [approvingRequestIds, setApprovingRequestIds] =
    useState<number[]>([]);

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

  async function loadDashboardData() {
    const [
      nextClubInfo,
      nextMembers,
      nextRequests,
      nextSessions,
      nextSpecialFees,
    ] = await Promise.all([
      requestJson<ClubInfo>("/api/club-info"),
      requestJson<Member[]>("/api/members"),
      requestJson<MemberRequest[]>("/api/member-request"),
      requestJson<ClubSession[]>("/api/sessions"),
      requestJson<SpecialFee[]>("/api/special-fees"),
    ]);

    setClubInfo(nextClubInfo);
    setCustomFieldLabelDraft(nextClubInfo.customFieldLabel);
    setAdminEmailDraft(nextClubInfo.adminEmail);
    setMembers(nextMembers);
    setRequests(nextRequests);
    setSessions(nextSessions);
    setSpecialFees(nextSpecialFees);
  }

  async function refreshMembers() {
    setMembers(await requestJson<Member[]>("/api/members"));
  }

  async function refreshRequests() {
    setRequests(
      await requestJson<MemberRequest[]>("/api/member-request")
    );
  }

  async function refreshSessions() {
    setSessions(await requestJson<ClubSession[]>("/api/sessions"));
  }

  async function refreshSpecialFees() {
    setSpecialFees(
      await requestJson<SpecialFee[]>("/api/special-fees")
    );
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
    loadDashboardData().catch((error: Error) => {
      alert(error.message);
      router.push("/admin/login");
    });
  }, [router]);

  useEffect(() => {
    if (!sessions.length) {
      setSelectedSessionId(null);
      return;
    }

    const selectedExists = sessions.some(
      (session) => session.id === selectedSessionId
    );

    if (!selectedExists) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [selectedSessionId, sessions]);

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

    await requestJson("/api/members", {
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
  }

  async function toggleFee(
    memberId: number,
    year: number,
    month: number,
    currentPaid: boolean
  ) {
    await requestJson("/api/fees", {
      method: "POST",
      body: JSON.stringify({
        memberId,
        year,
        month,
        paid: !currentPaid,
      }),
    });

    await refreshMembers();
  }

  async function handleAllPaid(memberId: number) {
    if (!confirm(`${selectedYear}년 12개월 모두 납부 처리할까요?`)) {
      return;
    }

    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        requestJson("/api/fees", {
          method: "POST",
          body: JSON.stringify({
            memberId,
            year: selectedYear,
            month: index + 1,
            paid: true,
          }),
        })
      )
    );

    await refreshMembers();
  }

  async function handleAllUnpaid(memberId: number) {
    if (!confirm(`${selectedYear}년 12개월 모두 미납 처리할까요?`)) {
      return;
    }

    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        requestJson("/api/fees", {
          method: "POST",
          body: JSON.stringify({
            memberId,
            year: selectedYear,
            month: index + 1,
            paid: false,
          }),
        })
      )
    );

    await refreshMembers();
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
      setMembers((current) => {
        const withoutDuplicate = current.filter(
          (member) => member.id !== result.member.id
        );

        return [...withoutDuplicate, { ...result.member, fees: [] }];
      });
      setActiveTab("members");

      void refreshRequests().catch(() => undefined);
      void refreshMembers().catch(() => undefined);
      void refreshSpecialFees().catch(() => undefined);
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

    await refreshSessions();
    setSelectedSessionId(created.id);
  }

  async function handleDeleteSession(sessionId: number) {
    await requestJson("/api/sessions", {
      method: "DELETE",
      body: JSON.stringify({ id: sessionId }),
    });

    await refreshSessions();
  }

  async function handleSaveCustomFieldLabel() {
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
  }

  async function handleCreateSpecialFee(payload: {
    title: string;
    amount: string;
    dueDate: string;
    description: string;
  }) {
    await requestJson("/api/special-fees", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await refreshSpecialFees();
  }

  async function handleToggleSpecialFeePayment(
    specialFeeId: number,
    memberId: number,
    paid: boolean
  ) {
    await requestJson("/api/special-fees/payment", {
      method: "POST",
      body: JSON.stringify({
        specialFeeId,
        memberId,
        paid: !paid,
      }),
    });

    await refreshSpecialFees();
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

    await refreshSessions();
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

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[2rem] border border-white/70 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <DashboardHeader
            clubName={clubInfo?.name ?? "클럽"}
            subscriptionEnd={clubInfo?.subscriptionEnd}
            onAddMember={openCreateMemberModal}
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
              requestsCount={requests.length}
              onChange={setActiveTab}
            />
          </div>
        </div>

        {activeTab === "members" ? (
          <div className="space-y-6">
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
              joinLink={publicJoinLink}
              onChangeDraft={setCustomFieldLabelDraft}
              onChangeAdminEmailDraft={setAdminEmailDraft}
              onSave={() => {
                setSavingClubSettings(true);
                handleSaveCustomFieldLabel()
                  .catch((error: Error) => {
                    alert(error.message);
                  })
                  .finally(() => {
                    setSavingClubSettings(false);
                  });
              }}
            />
          </div>
        ) : null}

        {activeTab === "requests" ? (
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
        ) : null}

        {activeTab === "fees" ? (
          <div className="space-y-6">
            <FeesTable
              members={activeMembers}
              selectedYear={selectedYear}
              onChangeYear={setSelectedYear}
              onToggleFee={(memberId, year, month, currentPaid) => {
                toggleFee(memberId, year, month, currentPaid).catch(
                  (error: Error) => {
                    alert(error.message);
                  }
                );
              }}
              onMarkAllPaid={(memberId) => {
                handleAllPaid(memberId).catch((error: Error) => {
                  alert(error.message);
                });
              }}
              onMarkAllUnpaid={(memberId) => {
                handleAllUnpaid(memberId).catch((error: Error) => {
                  alert(error.message);
                });
              }}
            />
            <SpecialFeesPanel
              members={activeMembers}
              specialFees={specialFees}
              onCreateFee={handleCreateSpecialFee}
              onTogglePayment={handleToggleSpecialFeePayment}
            />
          </div>
        ) : null}

        {activeTab === "sessions" ? (
          <SessionsPanel
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            publicSessionBaseUrl={publicSessionBaseUrl}
            onSelectSession={setSelectedSessionId}
            onCreateSession={handleCreateSession}
            onDeleteSession={handleDeleteSession}
            onUpdateSessionStatus={handleUpdateSessionStatus}
          />
        ) : null}

        {activeTab === "attendance" ? (
          <AttendancePanel
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSelectSession={setSelectedSessionId}
            onUpdateAttendance={handleUpdateAttendance}
          />
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
        onChange={setForm}
        onClose={() => {
          setShowMemberModal(false);
          setEditingMember(null);
          setForm(initialForm);
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

export type DashboardTab =
  | "stats"
  | "members"
  | "requests"
  | "fees"
  | "sessions"
  | "attendance"
  | "deleted";

export interface Fee {
  id: number;
  memberId?: number;
  year: number;
  month: number;
  paid: boolean;
}

export interface Member {
  id: number;
  name: string;
  gender: string;
  birth: string | Date | null;
  phone: string;
  level: string;
  createdAt: string | Date;
  deletedAt?: string | Date | null;
  note: string;
  customFieldValue: string;
  deleted?: boolean;
  fees?: Fee[];
}

export interface FeeMember {
  id: number;
  name: string;
  phone: string;
}

export interface MemberRequest {
  id: number;
  name: string;
  gender: string;
  birth: string | Date | null;
  phone: string;
  level: string;
  customFieldValue: string;
  note: string;
  createdAt: string | Date;
}

export interface SpecialFeePayment {
  id: number;
  paid: boolean;
  paidAt: string | Date | null;
  note: string;
  createdAt: string | Date;
  memberId: number;
  specialFeeId: number;
  member: Pick<Member, "id" | "name" | "phone">;
}

export interface SpecialFee {
  id: number;
  title: string;
  amount: number;
  description: string;
  dueDate: string | Date | null;
  createdAt: string | Date;
  paidCount?: number;
  payments?: SpecialFeePayment[];
}

export interface SessionParticipant {
  id: number;
  sessionId: number;
  status: "REGISTERED" | "WAITLIST" | "CANCELED";
  attendanceStatus: "PENDING" | "PRESENT" | "ABSENT" | "LATE";
  checkedInAt: string | Date | null;
  createdAt: string | Date;
  memberId: number | null;
  guestName: string | null;
  guestAge: number | null;
  guestGender: string | null;
  guestLevel: string | null;
  hostMemberId: number | null;
  member: Member | null;
  hostMember: Member | null;
}

export interface ClubSession {
  id: number;
  title: string;
  description: string;
  location: string;
  publicToken: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  capacity: number | null;
  status: "OPEN" | "CLOSED" | "CANCELED";
  createdAt: string | Date;
  registeredCount?: number;
  waitlistedCount?: number;
  participants?: SessionParticipant[];
}

export interface ClubInfo {
  id: number;
  name: string;
  publicJoinToken: string;
  calculatedStatus: "TRIAL" | "ACTIVE" | "BLOCKED" | "EXPIRED";
  subscriptionEnd?: string | Date | null;
  customFieldLabel: string;
  adminEmail: string;
  pendingRequestCount: number;
}

export type DashboardStatsPeriodKey =
  | "WEEK"
  | "MONTH"
  | "CUSTOM";

export interface DashboardStatsPeriod {
  startDate: string | Date;
  endDate: string | Date;
  sessionCount: number;
  registeredCount: number;
  guestCount: number;
  waitlistCount: number;
  attendanceHandledCount: number;
  newMembersCount: number;
  unpaidMembersCount: number;
}

export interface DashboardTopMemberStat {
  memberId: number;
  name: string;
  attendanceCount: number;
  lateCount: number;
  guestHostedCount: number;
}

export interface DashboardStats {
  week: DashboardStatsPeriod;
  month: DashboardStatsPeriod;
  custom?: DashboardStatsPeriod | null;
  topMembers: {
    week: DashboardTopMemberStat[];
    month: DashboardTopMemberStat[];
    custom?: DashboardTopMemberStat[];
  };
}

export interface MemberFormState {
  name: string;
  gender: string;
  birth: string;
  phone: string;
  level: string;
  customFieldValue: string;
  note: string;
}

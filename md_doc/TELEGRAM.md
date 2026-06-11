# 텔레그램 알람 내역

모든 알람은 `lib/telegram.ts`의 `sendTelegramAlert()`를 통해 전송된다.
환경변수: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

---

## 클럽 / 계정

| 이벤트 | 트리거 | 소스 |
|---|---|---|
| 🎉 새 클럽 생성 | 관리자 회원가입 완료 | `api/admin/signup` |
| 🗑️ 클럽 계정 삭제 | 관리자 계정 삭제 | `api/admin/delete-account` |
| ⚙️ 클럽 정보 변경 | 클럽명 또는 복구 이메일 수정 (변경 필드 포함) | `api/personal-settings` |

## 회원 관리

| 이벤트 | 트리거 | 소스 |
|---|---|---|
| 🙋 새 가입 신청 | 공개 가입 신청서 제출 | `api/member-request/apply` |
| ✅ 가입 신청 승인 | 관리자 승인 | `api/member-request/approve` |
| 🚫 가입 신청 거절 | 관리자 거절 | `api/member-request/reject` |
| 👤 회원 직접 등록 | 관리자 직접 등록 | `api/members` |
| ✏️ 회원 정보 수정 | 관리자 수정 (변경 필드 포함) | `api/members` |
| 🗑️ 회원 삭제 | 관리자 삭제 | `api/members` |

## 운동 일정

| 이벤트 | 트리거 | 소스 |
|---|---|---|
| 📅 운동 일정 등록 | 관리자 일정 생성 | `api/sessions` |
| 🛠️ 운동 일정 수정 | 관리자 일정 수정 (변경 필드 포함) | `api/sessions` |
| 🗑️ 운동 일정 삭제 | 관리자 일정 삭제 | `api/sessions` |
| 🏸 참석 신청 | 회원 참석/대기 신청 | `api/public/sessions/respond` |
| ❌ 참석 취소 | 회원 참석 취소 | `api/public/sessions/respond` |
| 📝 관리자 직접 참석 등록 | 관리자가 직접 참석 등록 | `api/sessions/admin-register` |

## 자동 대진

| 이벤트 | 트리거 | 소스 |
|---|---|---|
| 🏸 자동 대진 생성 | 대진표 생성 버튼 클릭 (코트 수·최소 경기 수·성별 분리·고정 파트너 포함) | `api/sessions/bracket` |
| 🔁 자동대진 선수 수정 | 대진표 선수 위치 스왑 | `api/admin/activity` |
| 🖼️ 자동대진 이미지 저장 | 대진표 이미지 다운로드 | `api/admin/activity` |

## 실시간 코트 배정

| 이벤트 | 트리거 | 소스 |
|---|---|---|
| 🎯 실시간 대진 시작 | 코트 보드 시작 | `api/court-board/track` |
| 📋 코트 배정 완료 | 코트에 선수 배정 | `api/court-board` |
| 🏆 경기 완료 | 경기 결과 입력 | `api/court-board` |

## 회비

| 이벤트 | 트리거 | 소스 |
|---|---|---|
| 💸 월회비 체크 변경 | 월회비 납부/미납 토글 | `api/fees` |
| 📆 연회비 체크 변경 | 연회비 전체 납부/미납 토글 | `api/fees` |
| 🧾 수시회비 생성 | 수시회비 항목 생성 | `api/special-fees` |
| 🗑️ 수시회비 삭제 | 수시회비 항목 삭제 | `api/special-fees` |
| 🧾 수시회비 체크 변경 | 수시회비 납부/미납 토글 | `api/special-fees/payment` |

## 장부

| 이벤트 | 트리거 | 소스 |
|---|---|---|
| 💰 장부 수동 입금 등록 | 관리자 수동 입금 등록 | `api/ledger` |
| 💳 장부 수동 지출 등록 | 관리자 수동 지출 등록 | `api/ledger` |
| ♻️ 장부 초기화 | 관리자 장부 전체 초기화 | `api/ledger/reset` |

## 구독

| 이벤트 | 트리거 | 소스 |
|---|---|---|
| 💳 구독 입금 신청 | 구독 플랜 입금 신청 제출 | `api/subscription/request` |
| 🖱️ 무료체험 구독하기 클릭 | 무료체험 만료 배너에서 구독하기 버튼 클릭 | `api/subscription/trial-click` |

## 어드민 활동 추적 (참고용)

| 이벤트 | 트리거 |
|---|---|
| 🖱️ 회원 탭 클릭 | 관리자 대시보드 회원 탭 진입 |
| 🖱️ 회비 탭 클릭 | 관리자 대시보드 회비 탭 진입 |

> 위 두 이벤트는 `api/admin/activity` 공통 엔드포인트를 통해 전송된다.

## 고객 문의

| 이벤트 | 트리거 | 소스 |
|---|---|---|
| 📩 고객 문의 | 문의 폼 제출 | `api/support` |

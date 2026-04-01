"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef3f9] px-6 py-10 text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_30%)]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        <section className="grid w-full gap-6 lg:grid-cols-[1.25fr_420px]">
          <div className="overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/90 p-8 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur md:p-14">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Premium Club Operations
            </div>

            <div className="mt-10 space-y-5">
              <p className="text-5xl font-black tracking-[-0.05em] text-slate-950 md:text-7xl">
                콕매니저
              </p>

              <h1 className="text-lg font-semibold leading-relaxed text-slate-600 md:text-2xl">
                전국 배드민턴 클럽
                <br />
                운영 관리 시스템
              </h1>

              <p className="max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
                회원 관리부터 가입 승인, 운동 일정, 참석, 출석, 월회비, 수시회비까지.
                <br />
                총무가 카카오톡과 엑셀을 오가며 하던 운영을 한곳에서 정리하는
                <br />
                배드민턴 클럽 운영 프로그램입니다.
              </p>
            </div>

            <div className="mt-12 grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/90 px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Member
                </p>
                <p className="mt-3 text-base font-bold text-slate-900">
                  회원 · 승인 · 탈퇴
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  신규 가입부터 회원 상태 관리까지 한 흐름으로 정리합니다.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/90 px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Session
                </p>
                <p className="mt-3 text-base font-bold text-slate-900">
                  일정 · 참석 · 게스트
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  링크 하나로 참석 명단과 대기 인원까지 자연스럽게 관리합니다.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/90 px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Finance
                </p>
                <p className="mt-3 text-base font-bold text-slate-900">
                  월회비 · 수시회비
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  정기 회비와 일회성 회비를 나눠 더 정확하게 관리합니다.
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-[2.5rem] border border-slate-900 bg-slate-950 p-8 text-white shadow-[0_30px_100px_rgba(15,23,42,0.22)]">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 px-6 py-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                Start Now
              </p>
              <p className="mt-4 text-3xl font-black leading-tight">
                운영을
                <br />
                바로 시작하세요
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                클럽을 만들고 관리자 계정으로 로그인하면
                <br />
                회원, 일정, 회비를 바로 관리할 수 있습니다.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => router.push("/admin/login")}
                className="w-full rounded-2xl bg-sky-500 px-5 py-4 text-base font-bold text-white transition hover:bg-sky-400"
              >
                관리자 로그인
              </button>

              <button
                onClick={() => router.push("/admin/signup")}
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-base font-bold text-white transition hover:bg-white/10"
              >
                클럽 생성하기
              </button>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 px-6 py-6">
              <p className="text-sm font-semibold text-white">
                이런 클럽에 잘 맞습니다
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <li>참석 조사와 명단 정리가 번거로운 클럽</li>
                <li>월회비와 수시회비를 함께 관리하는 클럽</li>
                <li>총무가 카카오톡과 엑셀을 같이 쓰고 있는 클럽</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

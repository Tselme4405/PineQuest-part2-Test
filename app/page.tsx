"use client";

import { useRouter } from "next/navigation";

function RoleCard({
  icon,
  title,
  description,
  onClick,
  accent,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full max-w-sm text-left rounded-3xl border border-white/[0.08] bg-slate-900/70 backdrop-blur-xl p-8 shadow-2xl hover:border-white/20 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
    >
      <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${accent}18, transparent 70%)`,
        }}
      />
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg"
        style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}
      >
        {icon}
      </div>
      <h2 className="text-2xl font-bold text-slate-100 mb-2">{title}</h2>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
      <div
        className="mt-6 flex items-center gap-2 text-sm font-semibold"
        style={{ color: accent }}
      >
        Нэвтрэх
        <svg
          className="w-4 h-4 group-hover:translate-x-1 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

export default function LandingPage() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 20% 10%, #1e293b 0%, #0f172a 50%, #020617 100%)",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/8 text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" style={{ boxShadow: "0 0 6px #818cf8" }} />
          AI Proctoring System
        </div>
        <h1
          className="text-5xl font-extrabold mb-4 tracking-tight"
          style={{
            background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Шалгалтын Хяналтын
          <br />
          Систем
        </h1>
        <p className="text-slate-500 text-lg max-w-md mx-auto">
          Хиймэл оюун ухаанд суурилсан онлайн шалгалтын хяналтын тавцан
        </p>
      </div>

      {/* Role cards */}
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        <RoleCard
          icon="🎓"
          title="Оюутан"
          description="Шалгалтад орж, нэр болон хянан баталгаажуулах үйл явцыг эхлүүлнэ."
          onClick={() => router.push("/student")}
          accent="#818cf8"
        />
        <RoleCard
          icon="👨‍🏫"
          title="Багш"
          description="Шалгалт өгч буй оюутнуудын хяналтын самбарыг нэвтрэн харна."
          onClick={() => router.push("/teacher")}
          accent="#34d399"
        />
      </div>

      {/* Footer */}
      <p className="mt-16 text-slate-700 text-xs text-center">
        Царайны мэдрэмж · Утас илрүүлэгч · Бодит цагийн хяналт
      </p>
    </div>
  );
}

import { FiFilm, FiStar } from 'react-icons/fi';

export default function EmptyState() {
  return (
    <div className="relative flex min-h-[50vh] flex-col items-center justify-center text-center">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-72 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.02] blur-3xl" />

      {/* Icon */}
      <div className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06]">
        <FiFilm size={32} className="text-surface-600" />
        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
          <FiStar size={10} className="text-accent" />
        </div>
      </div>

      <h2 className="relative mb-2 text-xl font-semibold text-surface-200">
        Your studio is ready
      </h2>
      <p className="relative max-w-sm text-sm leading-relaxed text-surface-500">
        Enter a creative prompt above to start your first production. AI agents will
        collaborate — from script to final cut.
      </p>
    </div>
  );
}

'use client';

interface HeroProps {
  onGetStarted: () => void;
}

export default function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="bg-gradient-to-br from-soft-highlight to-surface py-12 px-6 text-center">
      <div className="max-w-[900px] mx-auto">
        <h1 className="text-5xl font-bold mb-6 text-text-primary max-md:text-3xl">
          Harmony at Home
        </h1>
        <p className="text-xl text-text-secondary mb-8 leading-relaxed max-md:text-base">
          Coordinate chores, share calendars, and bring peace to your household.
          TaskTogether makes living together easier for everyone.
        </p>
        <div className="mb-12">
          <button
            onClick={onGetStarted}
            className="px-8 py-4 text-lg h-14 rounded-sm bg-sage text-white font-medium transition-all hover:bg-sage-hover hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(90,124,94,0.3)]"
          >
            Get Started Free
          </button>
        </div>
        <div className="max-w-[600px] mx-auto p-8 bg-surface rounded-lg shadow-md border border-divider">
          <div className="w-full h-[300px] bg-gradient-to-br from-sage to-terracotta rounded-md flex items-center justify-center text-white text-lg font-semibold">
            Collaborative household dashboard preview
          </div>
        </div>
      </div>
    </section>
  );
}

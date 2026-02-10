'use client';

interface CTASectionProps {
  onGetStarted: () => void;
}

export default function CTASection({ onGetStarted }: CTASectionProps) {
  return (
    <section className="py-12 px-6 bg-gradient-to-br from-sage to-terracotta text-center text-white">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="text-2xl font-semibold mb-4 text-white">
          Ready to Bring Harmony to Your Home?
        </h2>
        <p className="text-lg mb-8 opacity-95">
          Join thousands of households already using TaskTogether
        </p>
        <button
          onClick={onGetStarted}
          className="px-8 py-4 text-lg h-14 rounded-sm bg-white text-sage font-medium transition-all hover:bg-soft-highlight"
        >
          Join TaskTogether Free
        </button>
      </div>
    </section>
  );
}

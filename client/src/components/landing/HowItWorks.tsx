const steps = [
  {
    number: 1,
    title: 'Create Your Account',
    description: 'Sign up free in seconds. No credit card required.',
  },
  {
    number: 2,
    title: 'Set Up Your Household',
    description: 'Invite your housemates or join an existing household.',
  },
  {
    number: 3,
    title: 'Start Coordinating',
    description: 'Add chores, share your calendar, and enjoy the peace.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-12 px-6 bg-base">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            Get Started in Minutes
          </h2>
          <p className="text-text-secondary text-lg">
            Three simple steps to a more organized home
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="w-12 h-12 bg-sage text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-text-secondary">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

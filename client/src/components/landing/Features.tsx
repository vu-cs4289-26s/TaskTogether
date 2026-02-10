const features = [
  {
    title: 'Smart Chore Management',
    description:
      'Assign tasks, set priorities, and track completion. Everyone knows what needs to be done and when.',
  },
  {
    title: 'Shared Household Calendar',
    description:
      'Coordinate schedules, book shared spaces, and plan group activities. Never double-book the laundry room again.',
  },
  {
    title: 'Built-in Messaging',
    description:
      'Keep all household communication in one place. Discuss plans, report issues, and stay connected.',
  },
  {
    title: 'Multiple Households',
    description:
      'Manage your main home, vacation house, or campus apartment. Switch between households seamlessly.',
  },
  {
    title: 'Issue Reporting',
    description:
      'Report maintenance problems or resolve conflicts. Prioritize issues and track them to resolution.',
  },
  {
    title: 'Personal Dashboard',
    description:
      'See your tasks at a glance, manage your calendar, and stay on top of your responsibilities.',
  },
];

export default function Features() {
  return (
    <section className="py-12 px-6 bg-surface">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold mb-4">
            Everything You Need to Run a Happy Home
          </h2>
          <p className="text-text-secondary text-lg">
            Simple tools that bring your household together
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-surface p-8 rounded-md shadow-sm border border-divider transition-all hover:-translate-y-1 hover:shadow-md hover:border-sage"
            >
              <h3 className="text-lg font-semibold mb-2 text-sage">
                {feature.title}
              </h3>
              <p className="text-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

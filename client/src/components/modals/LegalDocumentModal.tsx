'use client';

import type { ReactNode } from 'react';
import BaseModal from '@/components/modals/BaseModal';

type LegalDocumentType = 'terms' | 'privacy';

type LegalDocumentModalProps = {
  open: boolean;
  documentType: LegalDocumentType;
  onClose: () => void;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      <div className="space-y-2 text-sm leading-6 text-text-secondary">{children}</div>
    </section>
  );
}

function TermsContent() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        Effective date: April 16, 2026
      </p>

      <Section title="Overview">
        <p>
          TaskTogether is a household management platform that helps users organize shared tasks,
          calendars, issues, reminders, and account settings across one or more households.
        </p>
        <p>
          By creating an account or using TaskTogether, you agree to these Terms of Service. If you
          do not agree, please do not use the service.
        </p>
      </Section>

      <Section title="Eligibility and Accounts">
        <p>
          You must provide accurate account information and keep your login credentials secure. You
          are responsible for activity that occurs through your account.
        </p>
        <p>
          You agree to use TaskTogether only for lawful household, roommate, family, or shared-home
          coordination purposes.
        </p>
      </Section>

      <Section title="Using the Service">
        <p>
          You may create households, invite members, assign tasks, schedule events, store notes,
          and manage connected account and notification settings.
        </p>
        <p>
          You may not use TaskTogether to harass others, upload malicious content, interfere with
          the service, attempt unauthorized access, or post content that violates applicable law.
        </p>
      </Section>

      <Section title="Household Data and Shared Content">
        <p>
          Information you add to a household, including tasks, events, issues, rules, and comments,
          may be visible to other members of that household based on product functionality.
        </p>
        <p>
          You should only invite people you trust to view and manage shared household information.
        </p>
      </Section>

      <Section title="Account Security">
        <p>
          You are responsible for maintaining the confidentiality of your password and any two-factor
          authentication codes. Notify the service administrator or support contact promptly if you
          believe your account has been accessed without authorization.
        </p>
      </Section>

      <Section title="Service Availability">
        <p>
          TaskTogether may be updated, improved, suspended, or discontinued from time to time. We
          do not guarantee uninterrupted availability, error-free operation, or permanent retention
          of all data.
        </p>
      </Section>

      <Section title="Termination">
        <p>
          We may suspend or terminate access to the service if a user violates these terms,
          misuses the platform, or creates security or operational risk for other users or the
          service itself.
        </p>
      </Section>

      <Section title="Disclaimers and Limitation of Liability">
        <p>
          TaskTogether is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the extent permitted
          by law, we disclaim warranties of merchantability, fitness for a particular purpose, and
          non-infringement.
        </p>
        <p>
          To the extent permitted by law, we are not liable for indirect, incidental, special,
          consequential, or punitive damages arising from your use of the service.
        </p>
      </Section>

      <Section title="Changes to These Terms">
        <p>
          We may update these terms from time to time. Continued use of TaskTogether after updated
          terms are posted means you accept the revised terms.
        </p>
      </Section>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        Effective date: April 16, 2026
      </p>

      <Section title="Overview">
        <p>
          This Privacy Policy explains what information TaskTogether collects, how it is used, and
          how it may be shared when you use the service.
        </p>
      </Section>

      <Section title="Information We Collect">
        <p>
          We may collect account details such as your name, email address, password hash, profile
          image, authentication settings, and linked Google account details when provided.
        </p>
        <p>
          We also collect household content you choose to create, including tasks, event details,
          issues, comments, invites, notifications, and settings preferences.
        </p>
      </Section>

      <Section title="How We Use Information">
        <p>
          We use collected information to create and secure accounts, provide household management
          features, deliver notifications, support password reset and two-factor authentication, and
          improve service reliability and performance.
        </p>
      </Section>

      <Section title="How Information Is Shared">
        <p>
          Household information is shared with members of the same household as required to provide
          collaborative features.
        </p>
        <p>
          We may also share information with service providers that help operate the platform, such
          as hosting, authentication, email, analytics, and infrastructure providers, subject to
          appropriate confidentiality and security expectations.
        </p>
      </Section>

      <Section title="Authentication and Security">
        <p>
          Passwords should be stored in hashed form, and security features such as login tokens,
          linked-account verification, and two-factor authentication may be used to protect user
          accounts.
        </p>
      </Section>

      <Section title="Data Retention">
        <p>
          We retain account and household information for as long as needed to operate the service,
          comply with legal obligations, resolve disputes, and enforce platform terms, unless a
          shorter retention period is required by applicable law.
        </p>
      </Section>

      <Section title="Your Choices">
        <p>
          You may update certain profile details, password settings, and linked account preferences
          through the application. You may also stop using the service at any time.
        </p>
      </Section>

      <Section title="Children&apos;s Privacy">
        <p>
          TaskTogether is not intended for children under 13 without appropriate supervision and is
          not designed for use as a children&apos;s data service.
        </p>
      </Section>

      <Section title="Policy Updates">
        <p>
          We may update this Privacy Policy from time to time. Continued use of the service after an
          updated version is posted means the revised policy applies going forward.
        </p>
      </Section>
    </div>
  );
}

export default function LegalDocumentModal({
  open,
  documentType,
  onClose,
}: LegalDocumentModalProps) {
  return (
    <BaseModal
      open={open}
      ariaLabel={documentType === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
      title={documentType === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
      subtitle={
        documentType === 'terms'
          ? 'Please review these terms before creating an account'
          : 'Please review how TaskTogether collects and uses data'
      }
      onClose={onClose}
      maxWidthClassName="max-w-[760px]"
    >
      <div className="max-h-[65vh] overflow-y-auto pr-1">
        {documentType === 'terms' ? <TermsContent /> : <PrivacyContent />}
      </div>
    </BaseModal>
  );
}

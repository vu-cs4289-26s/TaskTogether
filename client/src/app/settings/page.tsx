'use client';

import { useState } from 'react';
import AppNavbar from '@/components/shared/AppNavbar';
import Toggle from '@/components/settings/toggle';

type SectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function SettingsSection({ title, description, children }: SectionProps) {
  return (
    <section className="bg-surface rounded-md p-6 shadow-sm border border-divider mb-6">
      <div className="mb-6 pb-4 border-b border-divider">
        <h2 className="text-lg font-heading font-semibold text-sage mb-1">{title}</h2>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

type ItemProps = {
  label: string;
  hint?: string;
  right: React.ReactNode;
  noDivider?: boolean;
};

function SettingItem({ label, hint, right, noDivider }: ItemProps) {
  return (
    <div className={['py-4 flex items-center justify-between gap-6', noDivider ? '' : 'border-b border-divider'].join(' ')}>
      <div className="flex-1">
        <div className="font-semibold text-text-primary">{label}</div>
        {hint && <div className="text-[13px] text-text-secondary mt-1">{hint}</div>}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

export default function SettingsPage() {
  // Static-ish state for now (you can wire to real prefs later)
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const [notifFreq, setNotifFreq] = useState<'realtime' | 'hourly' | 'daily' | 'weekly'>('daily');

  const [profileVisibility, setProfileVisibility] = useState<'all' | 'household' | 'private'>('household');
  const [showStats, setShowStats] = useState(true);
  const [activityStatus, setActivityStatus] = useState(true);

  const [defaultHousehold, setDefaultHousehold] = useState<'main' | 'beach' | 'campus' | 'last'>('main');
  const [language, setLanguage] = useState<'en' | 'es' | 'fr' | 'de'>('en');
  const [timezone, setTimezone] = useState<'est' | 'cst' | 'mst' | 'pst'>('est');
  const [startWeekOn, setStartWeekOn] = useState<'sunday' | 'monday'>('sunday');
  const [dateFormat, setDateFormat] = useState<'mdy' | 'dmy' | 'ymd'>('mdy');

  return (
    <div className="min-h-screen bg-base">
      <AppNavbar />

      <div className="bg-surface border-b border-divider px-6 py-8">
        <div className="max-w-[900px] mx-auto">
          <h1 className="text-[32px] font-heading font-bold">Settings</h1>
          <p className="mt-2 text-text-secondary">
            Manage your application preferences and account settings
          </p>
        </div>
      </div>

      <main className="max-w-[900px] mx-auto px-6 py-8">
        <SettingsSection
          title="Notifications"
          description="Choose how you want to be notified about household activities"
        >
          <SettingItem
            label="Email Notifications"
            hint="Receive email updates for tasks, events, and issues"
            right={<Toggle checked={emailNotifs} onChange={setEmailNotifs} label="Email notifications" />}
          />
          <SettingItem
            label="Push Notifications"
            hint="Get real-time notifications on your device"
            right={<Toggle checked={pushNotifs} onChange={setPushNotifs} label="Push notifications" />}
          />
          <SettingItem
            label="Task Reminders"
            hint="Remind me about upcoming task deadlines"
            right={<Toggle checked={taskReminders} onChange={setTaskReminders} label="Task reminders" />}
          />
          <SettingItem
            label="Weekly Digest"
            hint="Send a weekly summary of household activity"
            right={<Toggle checked={weeklyDigest} onChange={setWeeklyDigest} label="Weekly digest" />}
          />
          <SettingItem
            label="Notification Frequency"
            hint="How often to send email notifications"
            right={
              <select
                value={notifFreq}
                onChange={(e) => setNotifFreq(e.target.value as any)}
                className="min-w-[220px] px-4 py-2 rounded-sm border border-divider bg-surface text-sm text-text-primary focus:outline-none focus:border-sage"
              >
                <option value="realtime">Real-time</option>
                <option value="hourly">Hourly digest</option>
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
              </select>
            }
            noDivider
          />
        </SettingsSection>

        <SettingsSection
          title="Privacy"
          description="Control your privacy and visibility settings"
        >
          <SettingItem
            label="Profile Visibility"
            hint="Who can see your profile information"
            right={
              <select
                value={profileVisibility}
                onChange={(e) => setProfileVisibility(e.target.value as any)}
                className="min-w-[220px] px-4 py-2 rounded-sm border border-divider bg-surface text-sm text-text-primary focus:outline-none focus:border-sage"
              >
                <option value="all">All household members</option>
                <option value="household">Only my households</option>
                <option value="private">Private</option>
              </select>
            }
          />
          <SettingItem
            label="Show Completion Stats"
            hint="Display your task completion statistics to others"
            right={<Toggle checked={showStats} onChange={setShowStats} label="Show completion stats" />}
          />
          <SettingItem
            label="Activity Status"
            hint="Show when you're active on TaskTogether"
            right={<Toggle checked={activityStatus} onChange={setActivityStatus} label="Activity status" />}
            noDivider
          />
        </SettingsSection>

        <SettingsSection
          title="Account"
          description="Manage your account security and connected services"
        >
          <div className="py-4 border-b border-divider">
            <div className="font-semibold text-text-primary mb-3">Password</div>
            <div className="p-4 rounded-sm bg-soft-highlight flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-semibold">••••••••</div>
                <div className="text-xs text-text-secondary mt-1">Last changed on January 15, 2026</div>
              </div>
              <button
                type="button"
                className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary transition hover:bg-base hover:border-sage"
              >
                Change Password
              </button>
            </div>
          </div>

          <div className="py-4 border-b border-divider">
            <div className="font-semibold text-text-primary mb-1">Connected Accounts</div>
            <div className="text-[13px] text-text-secondary">Link external accounts for easy sign-in</div>

            <div className="mt-4 p-4 rounded-sm bg-soft-highlight flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm flex items-center justify-center bg-[#4285F4]">
                  {/* Simple “G” badge placeholder */}
                  <span className="text-white font-bold text-sm">G</span>
                </div>
                <div>
                  <div className="font-semibold text-sm">Google</div>
                  <div className="text-xs text-text-secondary">jordan.davis@gmail.com</div>
                </div>
              </div>

              <span className="px-2 py-1 rounded text-[11px] font-semibold uppercase bg-success/10 text-success border border-success">
                Connected
              </span>
            </div>
          </div>

          <SettingItem
            label="Two-Factor Authentication"
            hint="Add an extra layer of security to your account"
            right={
              <button
                type="button"
                className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary transition hover:bg-base hover:border-sage"
              >
                Enable 2FA
              </button>
            }
            noDivider
          />
        </SettingsSection>

        <SettingsSection
          title="Preferences"
          description="Customize your TaskTogether experience"
        >
          <SettingItem
            label="Default Household"
            hint="Which household to show when you log in"
            right={
              <select
                value={defaultHousehold}
                onChange={(e) => setDefaultHousehold(e.target.value as any)}
                className="min-w-[220px] px-4 py-2 rounded-sm border border-divider bg-surface text-sm text-text-primary focus:outline-none focus:border-sage"
              >
                <option value="main">Main Street Apartment</option>
                <option value="beach">Beach House</option>
                <option value="campus">Campus Dorm Suite</option>
                <option value="last">Last visited</option>
              </select>
            }
          />
          <SettingItem
            label="Language"
            hint="Choose your preferred language"
            right={
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="min-w-[220px] px-4 py-2 rounded-sm border border-divider bg-surface text-sm text-text-primary focus:outline-none focus:border-sage"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            }
          />
          <SettingItem
            label="Timezone"
            hint="Used for task deadlines and event times"
            right={
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value as any)}
                className="min-w-[220px] px-4 py-2 rounded-sm border border-divider bg-surface text-sm text-text-primary focus:outline-none focus:border-sage"
              >
                <option value="est">Eastern Time (ET)</option>
                <option value="cst">Central Time (CT)</option>
                <option value="mst">Mountain Time (MT)</option>
                <option value="pst">Pacific Time (PT)</option>
              </select>
            }
          />
          <SettingItem
            label="Start Week On"
            hint="First day of the week in calendars"
            right={
              <select
                value={startWeekOn}
                onChange={(e) => setStartWeekOn(e.target.value as any)}
                className="min-w-[220px] px-4 py-2 rounded-sm border border-divider bg-surface text-sm text-text-primary focus:outline-none focus:border-sage"
              >
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
              </select>
            }
          />
          <SettingItem
            label="Date Format"
            hint="How dates are displayed"
            right={
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as any)}
                className="min-w-[220px] px-4 py-2 rounded-sm border border-divider bg-surface text-sm text-text-primary focus:outline-none focus:border-sage"
              >
                <option value="mdy">MM/DD/YYYY</option>
                <option value="dmy">DD/MM/YYYY</option>
                <option value="ymd">YYYY-MM-DD</option>
              </select>
            }
            noDivider
          />
        </SettingsSection>

        <SettingsSection
          title="Data & Storage"
          description="Manage your data and account"
        >
          <SettingItem
            label="Download Your Data"
            hint="Get a copy of all your TaskTogether data"
            right={
              <button
                type="button"
                className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary transition hover:bg-base hover:border-sage"
              >
                Request Export
              </button>
            }
          />
          <SettingItem
            label="Clear Cache"
            hint="Remove temporary files and cached data"
            right={
              <button
                type="button"
                className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary transition hover:bg-base hover:border-sage"
              >
                Clear Cache
              </button>
            }
            noDivider
          />
        </SettingsSection>
      </main>
    </div>
  );
}
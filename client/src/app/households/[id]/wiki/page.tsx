"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import AppNavbar from "@/components/shared/AppNavbar";
import { getHouseholdApi } from "@/lib/households.api";
import { listWikiSectionsApi, updateWikiSectionApi } from "@/lib/wiki.api";
import type { WikiSection } from "@/types/wiki";
import { Pencil, X, Save, Loader2, ArrowLeft, Settings } from "lucide-react";
import WikiManageModal from "@/components/wiki/WikiManageModal";
import {
  createWikiSectionApi,
  renameWikiSectionApi,
  deleteWikiSectionApi,
  reorderWikiSectionsApi,
} from "@/lib/wiki.api";
import { useAuth } from "@/contexts/AuthContext";

// Lazy-load the editor so SSR doesn't choke on ProseMirror DOM APIs
const RichTextEditor = dynamic(
  () => import("@/components/wiki/RichTextEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[160px] rounded-sm border border-divider bg-base animate-pulse" />
    ),
  },
);

// Backend now auto-seeds default sections, no need for hardcoded defaults

export default function HouseholdWikiPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const householdId = params?.id;
  const { user } = useAuth();

  const [active, setActive] = useState<string>("garbage");
  const [householdName, setHouseholdName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Wiki data
  const [sections, setSections] = useState<WikiSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Manage sections modal state
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);

  const sectionSlugs = useMemo(
    () => (sections.length > 0 ? sections.map((s) => s.slug) : []),
    [sections],
  );

  // Fetch wiki sections and household info
  useEffect(() => {
    if (!householdId) return;
    let cancelled = false;
    (async () => {
      setSectionsLoading(true);
      try {
        const [data, household] = await Promise.all([
          listWikiSectionsApi(householdId),
          getHouseholdApi(householdId),
        ]);
        if (!cancelled) {
          setSections(data);
          setHouseholdName(household?.name ?? "");
          // Check if current user is admin
          const currentUserMembership = household?.members?.find(
            (m) => m.userId === user?.id,
          );
          setIsAdmin(currentUserMembership?.role === "ADMIN");
        }
      } catch {
        // gracefully handle
      } finally {
        if (!cancelled) setSectionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  // Scroll-spy
  useEffect(() => {
    if (!householdId) return;
    function onScroll() {
      const eyeY = window.innerHeight * 0.35;
      const bottomSlack = 8;
      const scrolledToBottom =
        window.innerHeight + window.scrollY >=
        document.body.scrollHeight - bottomSlack;

      if (scrolledToBottom) {
        setActive(sectionSlugs[sectionSlugs.length - 1]);
        return;
      }

      let best: { id: string; dist: number } | null = null;
      for (const id of sectionSlugs) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        const dist = eyeY - top;
        if (dist >= 0 && (best === null || dist < best.dist)) {
          best = { id, dist };
        }
      }
      setActive(best?.id ?? sectionSlugs[0]);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sectionSlugs, householdId]);

  // Enter edit mode — seed drafts from current content
  const enterEdit = useCallback(() => {
    const d: Record<string, string> = {};
    for (const s of sections) {
      d[s.slug] = s.content;
    }
    setDrafts(d);
    setEditing(true);
  }, [sections]);

  // Cancel edit mode
  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDrafts({});
  }, []);

  // Save a single section
  const saveSection = useCallback(
    async (slug: string) => {
      if (!householdId) return;
      const content = drafts[slug] ?? "";
      setSaving((prev) => ({ ...prev, [slug]: true }));
      try {
        const updated = await updateWikiSectionApi(householdId, slug, {
          content,
        });
        setSections((prev) => prev.map((s) => (s.slug === slug ? updated : s)));
      } catch {
        // silently handle — could add toast later
      } finally {
        setSaving((prev) => ({ ...prev, [slug]: false }));
      }
    },
    [householdId, drafts],
  );

  // Save all changed sections then exit edit mode
  const saveAll = useCallback(async () => {
    if (!householdId) return;
    const changed = sections.filter(
      (s) => drafts[s.slug] !== undefined && drafts[s.slug] !== s.content,
    );
    if (changed.length === 0) {
      setEditing(false);
      return;
    }
    for (const s of changed) {
      await saveSection(s.slug);
    }
    setEditing(false);
    setDrafts({});
  }, [householdId, sections, drafts, saveSection]);

  function scrollTo(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Resolve display sections — use API data only (backend auto-seeds)
  const displaySections = sections;

  if (!householdId) {
    return (
      <div className="min-h-screen bg-base">
        <AppNavbar />
        <div className="max-w-[600px] mx-auto px-6 py-16">
          <div className="bg-surface border border-divider rounded-md p-8 text-center">
            <h1 className="text-2xl font-heading font-bold text-text-primary mb-2">
              Household Wiki
            </h1>
            <p className="text-text-secondary">Invalid household ID.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base">
      <AppNavbar />

      {/* Header */}
      <div className="bg-surface border-b border-divider">
        <div className="max-w-[1400px] mx-auto px-6 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-[32px] font-heading font-bold text-text-primary mb-2">
              Household Wiki for {householdName}
            </h1>
            <p className="text-sm text-text-secondary">
              Shared knowledge base for your household
            </p>
          </div>

          <div className="flex items-center gap-3">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-5 py-2.5 rounded-sm border border-divider text-text-secondary font-medium flex items-center gap-2 transition-all hover:bg-soft-highlight"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveAll}
                  className="px-5 py-2.5 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px"
                >
                  <Save size={16} />
                  Save All
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => router.push(`/households/${householdId}`)}
                  className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage"
                >
                  <ArrowLeft size={16} />
                  Back to Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setIsManageModalOpen(true)}
                  disabled={sectionsLoading}
                  className="px-5 py-2.5 rounded-sm border border-divider bg-transparent text-text-primary font-medium flex items-center gap-2 transition-all hover:bg-base hover:border-sage disabled:opacity-50"
                >
                  <Settings size={16} />
                  Manage Sections
                </button>
                <button
                  type="button"
                  onClick={enterEdit}
                  disabled={sectionsLoading}
                  className="px-5 py-2.5 rounded-sm bg-sage text-white font-medium flex items-center gap-2 transition-all hover:bg-sage-hover hover:-translate-y-px disabled:opacity-50"
                >
                  <Pencil size={16} />
                  Edit Wiki
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-[120px] h-fit">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-4">
            Contents
          </div>
          <nav className="flex flex-col gap-1">
            {displaySections.map((item) => {
              const isActive = active === item.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => scrollTo(item.slug)}
                  className={[
                    "text-left px-4 py-2 rounded-sm text-sm font-medium transition border-l-4",
                    isActive
                      ? "bg-soft-highlight text-sage font-semibold border-sage"
                      : "text-text-secondary border-transparent hover:bg-soft-highlight hover:text-sage hover:border-terracotta",
                  ].join(" ")}
                >
                  {item.title}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 space-y-6">
          {sectionsLoading ? (
            <div className="flex items-center justify-center py-20 text-text-secondary">
              <Loader2 size={24} className="animate-spin mr-2" />
              Loading wiki...
            </div>
          ) : (
            displaySections.map((section) => (
              <section
                key={section.slug}
                id={section.slug}
                className="bg-surface rounded-md p-8 border border-divider shadow-sm scroll-mt-32"
              >
                <div className="mb-6 pb-4 border-b border-divider flex items-center justify-between">
                  <h3 className="text-xl font-heading font-semibold text-sage">
                    {section.title}
                  </h3>
                  {editing && (
                    <button
                      type="button"
                      onClick={() => saveSection(section.slug)}
                      disabled={saving[section.slug]}
                      className="px-3 py-1.5 rounded-sm bg-sage text-white text-sm font-medium flex items-center gap-1.5 transition-all hover:bg-sage-hover disabled:opacity-50"
                    >
                      {saving[section.slug] ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      Save
                    </button>
                  )}
                </div>

                {editing ? (
                  <RichTextEditor
                    content={drafts[section.slug] ?? section.content}
                    onChange={(html) =>
                      setDrafts((prev) => ({ ...prev, [section.slug]: html }))
                    }
                    placeholder={`Add content for ${section.title}...`}
                  />
                ) : section.content ? (
                  <div
                    className="prose prose-sm max-w-none text-text-secondary [&_h2]:text-text-primary [&_h3]:text-text-primary [&_strong]:text-text-primary [&_a]:text-sage"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                ) : (
                  <p className="text-text-secondary/60 italic text-sm">
                    No content yet. Click &quot;Edit Wiki&quot; to add
                    information.
                  </p>
                )}

                {section.updatedBy && section.updatedAt && (
                  <div className="mt-4 text-xs text-text-secondary italic">
                    Last updated by {section.updatedBy.name} on{" "}
                    {new Date(section.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                )}
              </section>
            ))
          )}
        </main>
      </div>

      {/* Manage Sections Modal */}
      <WikiManageModal
        open={isManageModalOpen}
        sections={sections}
        isAdmin={isAdmin}
        isSubmitting={isManaging}
        error={manageError}
        onClose={() => {
          if (!isManaging) {
            setIsManageModalOpen(false);
            setManageError(null);
          }
        }}
        onReorder={async (order) => {
          if (!householdId) return;
          try {
            setIsManaging(true);
            setManageError(null);
            const updated = await reorderWikiSectionsApi(householdId, order);
            setSections(updated);
          } catch {
            setManageError("Failed to reorder sections. Please try again.");
          } finally {
            setIsManaging(false);
          }
        }}
        onRename={async (slug, data) => {
          if (!householdId) return;
          try {
            setIsManaging(true);
            setManageError(null);
            const updated = await renameWikiSectionApi(householdId, slug, data);
            setSections((prev) =>
              prev.map((s) => (s.slug === slug ? updated : s)),
            );
          } catch {
            setManageError("Failed to rename section. Please try again.");
          } finally {
            setIsManaging(false);
          }
        }}
        onDelete={async (slug) => {
          if (!householdId) return;
          try {
            setIsManaging(true);
            setManageError(null);
            await deleteWikiSectionApi(householdId, slug);
            setSections((prev) => prev.filter((s) => s.slug !== slug));
          } catch {
            setManageError("Failed to delete section. Please try again.");
          } finally {
            setIsManaging(false);
          }
        }}
        onCreate={async (data) => {
          if (!householdId) return;
          try {
            setIsManaging(true);
            setManageError(null);
            const created = await createWikiSectionApi(householdId, data);
            setSections((prev) => [...prev, created]);
          } catch {
            setManageError("Failed to create section. Please try again.");
          } finally {
            setIsManaging(false);
          }
        }}
      />
    </div>
  );
}

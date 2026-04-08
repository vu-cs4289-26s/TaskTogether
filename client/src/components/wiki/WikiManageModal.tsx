'use client';

import { useState, useCallback, useEffect } from 'react';
import BaseModal from '@/components/modals/BaseModal';
import Button from '@/components/ui/Button';
import { ArrowUp, ArrowDown, Trash2, Pencil, Check, X } from 'lucide-react';
import type { WikiSection } from '@/types/wiki';

// Generate a slug from a title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type Props = {
  open: boolean;
  sections: WikiSection[];
  isAdmin: boolean;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onReorder: (order: string[]) => void | Promise<void>;
  onRename: (slug: string, data: { title?: string; slug?: string }) => void | Promise<void>;
  onDelete: (slug: string) => void | Promise<void>;
  onCreate: (data: { title: string; slug?: string }) => void | Promise<void>;
};

export default function WikiManageModal({
  open,
  sections,
  isAdmin,
  isSubmitting,
  error,
  onClose,
  onReorder,
  onRename,
  onDelete,
  onCreate,
}: Props) {
  const [localSections, setLocalSections] = useState<WikiSection[]>([]);
  const [hasReordered, setHasReordered] = useState(false);
  const [editingSection, setEditingSection] = useState<WikiSection | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionSlug, setNewSectionSlug] = useState('');
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState<string | null>(null);

  // Sync local sections when modal opens
  useEffect(() => {
    if (open) {
      setLocalSections([...sections]);
      setHasReordered(false);
      setEditingSection(null);
      setEditTitle('');
      setEditSlug('');
      setNewSectionTitle('');
      setNewSectionSlug('');
      setDeleteConfirmSlug(null);
    }
  }, [open, sections]);

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localSections.length) return;

    const newSections = [...localSections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(newIndex, 0, moved);

    setLocalSections(newSections);
    setHasReordered(true);
  };

  const handleSaveReorder = async () => {
    const order = localSections.map((s) => s.id);
    await onReorder(order);
    setHasReordered(false);
  };

  const startEdit = (section: WikiSection) => {
    setEditingSection(section);
    setEditTitle(section.title);
    setEditSlug(section.slug);
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setEditTitle('');
    setEditSlug('');
  };

  const saveEdit = async () => {
    if (!editingSection) return;
    const data: { title?: string; slug?: string } = {};
    if (editTitle.trim() && editTitle.trim() !== editingSection.title) {
      data.title = editTitle.trim();
    }
    if (editSlug.trim() && editSlug.trim() !== editingSection.slug) {
      data.slug = editSlug.trim();
    }
    if (Object.keys(data).length > 0) {
      await onRename(editingSection.slug, data);
    }
    cancelEdit();
  };

  const handleCreate = async () => {
    if (!newSectionTitle.trim()) return;
    const data: { title: string; slug?: string } = { title: newSectionTitle.trim() };
    if (newSectionSlug.trim()) {
      data.slug = newSectionSlug.trim();
    }
    await onCreate(data);
    setNewSectionTitle('');
    setNewSectionSlug('');
  };

  const confirmDelete = async () => {
    if (!deleteConfirmSlug) return;
    await onDelete(deleteConfirmSlug);
    setDeleteConfirmSlug(null);
  };

  // Auto-generate slug from title
  const handleNewTitleChange = (title: string) => {
    setNewSectionTitle(title);
    if (!newSectionSlug || newSectionSlug === generateSlug(newSectionTitle)) {
      setNewSectionSlug(generateSlug(title));
    }
  };

  // Show sections from local state if reordered, otherwise from props
  const displaySections = hasReordered ? localSections : sections;

  return (
    <BaseModal
      open={open}
      ariaLabel="Manage wiki sections"
      title="Manage Sections"
      subtitle="Reorder, rename, or delete wiki sections"
      isBlocking={isSubmitting}
      onClose={onClose}
      maxWidthClassName="max-w-[600px]"
    >
      <div className="flex flex-col gap-5">
        {/* Section list */}
        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
          {displaySections.map((section, index) => (
            <div
              key={section.id}
              className="flex items-center gap-3 p-3 rounded-sm border border-divider bg-surface"
            >
              {/* Reorder buttons */}
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => moveSection(index, 'up')}
                  disabled={index === 0 || isSubmitting}
                  className="p-1 rounded text-text-secondary hover:text-sage hover:bg-soft-highlight disabled:opacity-30 transition"
                  title="Move up"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveSection(index, 'down')}
                  disabled={index === displaySections.length - 1 || isSubmitting}
                  className="p-1 rounded text-text-secondary hover:text-sage hover:bg-soft-highlight disabled:opacity-30 transition"
                  title="Move down"
                >
                  <ArrowDown size={16} />
                </button>
              </div>

              {/* Section info / edit form */}
              <div className="flex-1 min-w-0">
                {editingSection?.id === section.id ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Section title"
                      disabled={isSubmitting}
                      className="px-3 py-2 rounded-sm border border-divider bg-surface text-text-primary text-sm focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
                    />
                    <input
                      type="text"
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value)}
                      placeholder="URL slug (optional)"
                      disabled={isSubmitting}
                      className="px-3 py-2 rounded-sm border border-divider bg-surface text-text-secondary text-sm focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-text-primary truncate">
                      {section.title}
                    </span>
                    <span className="text-xs text-text-secondary">
                      /{section.slug}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {editingSection?.id === section.id ? (
                  <>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={isSubmitting || !editTitle.trim()}
                      className="p-2 rounded text-success hover:bg-success/10 disabled:opacity-30 transition"
                      title="Save"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={isSubmitting}
                      className="p-2 rounded text-text-secondary hover:bg-soft-highlight transition"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => startEdit(section)}
                        disabled={isSubmitting}
                        className="p-2 rounded text-text-secondary hover:text-sage hover:bg-sage/10 transition"
                        title="Rename"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmSlug(section.slug)}
                        disabled={isSubmitting}
                        className="p-2 rounded text-text-secondary hover:text-urgent hover:bg-urgent/10 transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Save reorder button */}
        {hasReordered && (
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleSaveReorder}
              disabled={isSubmitting}
            >
              Save Order
            </Button>
          </div>
        )}

        {/* Add new section */}
        {isAdmin && (
          <div className="border-t border-divider pt-5">
            <div className="text-sm font-medium text-sage mb-3">Add New Section</div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newSectionTitle}
                onChange={(e) => handleNewTitleChange(e.target.value)}
                placeholder="Section title (e.g., Kitchen Rules)"
                disabled={isSubmitting}
                className="px-4 py-3 rounded-sm border border-divider bg-surface text-text-primary transition focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/10"
              />
              <input
                type="text"
                value={newSectionSlug}
                onChange={(e) => setNewSectionSlug(e.target.value)}
                placeholder="URL slug (auto-generated if empty)"
                disabled={isSubmitting}
                className="px-4 py-3 rounded-sm border border-divider bg-surface text-text-secondary text-sm transition focus:outline-none focus:border-sage focus:ring-4 focus:ring-sage/10"
              />
              <div className="flex justify-end mt-2">
                <Button
                  variant="secondary"
                  onClick={handleCreate}
                  disabled={isSubmitting || !newSectionTitle.trim()}
                >
                  Add Section
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="text-sm text-urgent">{error}</div>
        )}

        {/* Footer buttons */}
        <div className="flex justify-end gap-4 mt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmSlug && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-4">
          <div className="w-full max-w-[400px] bg-surface rounded-md shadow-lg border border-divider p-6">
            <div className="text-lg font-semibold text-text-primary mb-2">
              Delete Section?
            </div>
            <p className="text-sm text-text-secondary mb-6">
              This will permanently delete the section and all its content. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirmSlug(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                disabled={isSubmitting}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </BaseModal>
  );
}

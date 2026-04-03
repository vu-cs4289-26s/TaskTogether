'use client';

import { useState } from 'react';

/**
 * useDeleteFlow<T>
 *
 * Generic state manager for delete-confirmation flows.
 *
 * HOW TO USE THIS HOOK
 * --------------------
 * 1. Pass the type of item being deleted:
 *      const deleteFlow = useDeleteFlow<Issue>();
 *      const deleteFlow = useDeleteFlow<Task>();
 *      const deleteFlow = useDeleteFlow<Event>();
 *
 * 2. Open the delete modal with the selected item:
 *      openDelete(selectedItem);
 *
 * 3. Use deleteTarget as the item shown in your section-specific delete modal:
 *      <IssueDeleteModal issue={deleteTarget} ... />
 *
 * 4. Use closeDelete for user-triggered close actions:
 *      - cancel button
 *      - backdrop click
 *      - escape key
 *
 *    closeDelete intentionally does nothing while isDeleting === true,
 *    so users cannot dismiss the modal mid-request.
 *
 * 5. Use forceCloseDelete only after a successful delete request:
 *      - after the API succeeds
 *      - after local state has been updated
 *
 *    This bypasses the "do not close while deleting" guard because the
 *    deletion is already complete and the UI should now clean up.
 *
 * TEMPLATE FOR OTHER DEVS
 * -----------------------
 * Example:
 *
 * const {
 *   isDeleteOpen,
 *   deleteTarget,
 *   isDeleting,
 *   setIsDeleting,
 *   openDelete,
 *   closeDelete,
 *   forceCloseDelete,
 * } = useDeleteFlow<Task>();
 *
 * async function handleDelete(taskId: string) {
 *   try {
 *     setIsDeleting(true);
 *     await deleteTaskApi(taskId);
 *     setTasks((prev) => prev.filter((task) => task.id !== taskId));
 *     forceCloseDelete();
 *   } finally {
 *     setIsDeleting(false);
 *   }
 * }
 *
 * <TaskDeleteModal
 *   open={isDeleteOpen}
 *   task={deleteTarget}
 *   isDeleting={isDeleting}
 *   onClose={closeDelete}
 *   onConfirm={handleDelete}
 * />
 *
 * DESIGN INTENT
 * -------------
 * This hook only manages generic delete modal state.
 * It should NOT contain:
 *   - API calls
 *   - section-specific item formatting
 *   - local list updates
 *   - page-specific cleanup outside delete modal state
 *
 * Those belong in the parent section/page.
 */
export default function useDeleteFlow<T>() {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    function openDelete(item: T) {
        setDeleteTarget(item);
        setIsDeleteOpen(true);
    }

    function closeDelete() {
        if (isDeleting) return;
        setIsDeleteOpen(false);
        setDeleteTarget(null);
    }

    function forceCloseDelete() {
        setIsDeleteOpen(false);
        setDeleteTarget(null);
    }

    return {
        isDeleteOpen,
        deleteTarget,
        isDeleting,
        setIsDeleting,
        openDelete,
        closeDelete,
        forceCloseDelete,
    };
}
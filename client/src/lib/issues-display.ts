import type { Issue, IssueType } from '@/types/issues';

export function humanizeEnum(value: string) {
    return value.replace(/_/g, ' ');
}

export function statusBadgeClasses(status: Issue['status']) {
    switch (status) {
        case 'OPEN':
            return 'bg-urgent/10 text-urgent border-urgent';
        case 'IN_PROGRESS':
            return 'bg-pending/10 text-pending border-pending';
        case 'RESOLVED':
            return 'bg-sage/10 text-sage border-sage';
        case 'ARCHIVED':
            return 'bg-base text-text-secondary border-divider';
        default:
            return 'bg-base text-text-secondary border-divider';
    }
}

export function priorityPillClasses(priority: Issue['priority']) {
    switch (priority) {
        case 'URGENT':
            return 'border-urgent bg-urgent/10 text-urgent';
        case 'MEDIUM':
            return 'border-pending bg-pending/10 text-pending';
        case 'LOW':
            return 'border-success bg-success/10 text-success';
        default:
            return 'border-divider bg-base text-text-secondary';
    }
}

export function priorityBorderClasses(priority: Issue['priority']) {
    switch (priority) {
        case 'URGENT':
            return 'border-l-urgent';
        case 'MEDIUM':
            return 'border-l-pending';
        case 'LOW':
            return 'border-l-success';
        default:
            return 'border-l-sage';
    }
}

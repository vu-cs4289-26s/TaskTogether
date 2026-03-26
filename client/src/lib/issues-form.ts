import type { ReportIssueFormValues } from '@/components/modals/ReportIssueModal';
import type { Issue, IssuePriority, IssueType, UpdateIssueInput } from '@/types/issues';

export const typeMap: Record<ReportIssueFormValues['type'], IssueType> = {
    maintenance: 'MAINTENANCE',
    conflict: 'HOUSEMATE_CONFLICT',
    noise: 'NOISE_COMPLAINT',
    cleanliness: 'CLEANLINESS',
    other: 'OTHER',
};

export const priorityMap: Record<ReportIssueFormValues['priority'], IssuePriority> = {
    urgent: 'URGENT',
    medium: 'MEDIUM',
    low: 'LOW',
};

export function dbTypeToUi(t: IssueType): ReportIssueFormValues['type'] {
    switch (t) {
        case 'MAINTENANCE':
            return 'maintenance';
        case 'HOUSEMATE_CONFLICT':
            return 'conflict';
        case 'NOISE_COMPLAINT':
            return 'noise';
        case 'CLEANLINESS':
            return 'cleanliness';
        case 'OTHER':
        default:
            return 'other';
    }
}

export function dbPriorityToUi(p: IssuePriority): ReportIssueFormValues['priority'] {
    switch (p) {
        case 'URGENT':
            return 'urgent';
        case 'LOW':
            return 'low';
        case 'MEDIUM':
        default:
            return 'medium';
    }
}

export function issueToForm(issue: Issue): ReportIssueFormValues {
    return {
        title: issue.title ?? '',
        type: dbTypeToUi(issue.type),
        priority: dbPriorityToUi(issue.priority),
        description: issue.description ?? '',
        anonymous: Boolean(issue.isAnonymous),
    };
}

export function toUpdateIssueInput(values: ReportIssueFormValues): UpdateIssueInput {
    return {
        title: values.title.trim(),
        description: values.description?.trim() ? values.description.trim() : null,
        type: typeMap[values.type],
        priority: priorityMap[values.priority],
        isAnonymous: Boolean(values.anonymous),
    } as UpdateIssueInput;
}
// @ts-nocheck
// Mock data file kept for future reference. Types no longer match backend shapes.
import type { Household } from '@/types/households';

const STORAGE_KEY = 'tt_households_v1';

const seed: Household[] = [
    {
        id: '1',
        name: 'Main Street Apartment',
        memberCount: 4,
        isAdmin: true,
        members: [
            { initials: 'JD', color: '#5A7C5E' },
            { initials: 'SC', color: '#B85C4A' },
            { initials: 'MK', color: '#4A7C5A' },
            { initials: 'AL', color: '#C49347' },
        ],
        stats: { activeChores: 8, openIssues: 3, thisMonth: 12 },
    },
    {
        id: '2',
        name: 'Beach House',
        memberCount: 6,
        isAdmin: false,
        members: [
            { initials: 'JD', color: '#5A7C5E' },
            { initials: 'SC', color: '#B85C4A' },
            { initials: 'MK', color: '#4A7C5A' },
            { initials: 'AL', color: '#C49347' },
        ],
        stats: { activeChores: 3, openIssues: 0, thisMonth: 5 },
    },
];

type MockScenario =
    | 'seed'
    | 'empty'
    | 'one'
    | 'many20'
    | 'many100'
    | 'longNames'
    | 'badData'
    | 'throw';

const MOCK_SCENARIO: MockScenario = 'seed'; // <-- change this while testing


function delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

function load(): Household[] {
    if (typeof window === 'undefined') return seed;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
    }
    try {
        return JSON.parse(raw) as Household[];
    } catch {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
    }
}

function save(data: Household[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function listHouseholdsMock(): Promise<Household[]> {
    await delay(200);
    if (MOCK_SCENARIO === 'throw') throw new Error('Mock listHouseholds failure');
    return scenarioData();
}

export async function getHouseholdMock(id: string): Promise<Household | null> {
    await delay(150);
    if (MOCK_SCENARIO === 'throw') throw new Error('Mock getHousehold failure');

    // If you're running a scenario, search in that scenario dataset (not localStorage)
    const data = MOCK_SCENARIO === 'seed' ? load() : scenarioData();
    return data.find((h) => h.id === id) ?? null;
}


export async function createHouseholdMock(input: { name: string; description?: string }): Promise<Household> {
    await delay(250);

    const current = load();
    const newHousehold: Household = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        memberCount: 1,
        isAdmin: true,
        members: [{ initials: 'JD', color: '#5A7C5E' }],
        stats: { activeChores: 0, openIssues: 0, thisMonth: 0 },
    };

    const next = [newHousehold, ...current];
    save(next);
    return newHousehold;
}


function makeHousehold(i: number, overrides: Partial<Household> = {}): Household {
    const id = String(i + 1);
    return {
        id,
        name: `Household ${id}`,
        description: `Description for household ${id}`,
        memberCount: 3,
        isAdmin: i % 2 === 0,
        members: [
            { initials: 'JD', color: '#5A7C5E' },
            { initials: 'SC', color: '#B85C4A' },
            { initials: 'MK', color: '#4A7C5A' },
        ],
        stats: { activeChores: i % 10, openIssues: i % 3, thisMonth: i % 20 },
        ...overrides,
    };
}

function scenarioData(): Household[] {
    switch (MOCK_SCENARIO) {
        case 'empty':
            return [];

        case 'one':
            return [makeHousehold(0, { name: 'Solo Household' })];

        case 'many20':
            return Array.from({ length: 20 }, (_, i) => makeHousehold(i));

        case 'many100':
            return Array.from({ length: 100 }, (_, i) => makeHousehold(i));

        case 'longNames':
            return Array.from({ length: 20 }, (_, i) =>
                makeHousehold(i, {
                    name:
                        i % 3 === 0
                            ? 'This is a very very very very very very long household name to test wrapping and overflow behavior'
                            : `Household ${i + 1}`,
                })
            );

        case 'badData':
            return [
                makeHousehold(0, { name: '' }),
                // @ts-expect-error testing invalid data shape
                { id: 'bad-1' },
                makeHousehold(2, { memberCount: 0 }),
            ];

        case 'throw':
            return load();

        case 'seed':
        default:
            return load();
    }
}

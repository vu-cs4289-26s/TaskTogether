// switch b/w mock and real API

import type { Household } from '@/types/households';
import { listHouseholdsApi, getHouseholdApi, createHouseholdApi } from './households.api';
import { listHouseholdsMock, getHouseholdMock, createHouseholdMock } from './mockHouseholds';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

export function listHouseholds(): Promise<Household[]> {
  return USE_MOCK ? listHouseholdsMock() : listHouseholdsApi();
}

export function getHousehold(id: string): Promise<Household | null> {
  return USE_MOCK ? getHouseholdMock(id) : getHouseholdApi(id);
}

export function createHousehold(input: { name: string; description?: string }): Promise<Household> {
  return USE_MOCK ? createHouseholdMock(input) : createHouseholdApi({ name: input.name });
}
 
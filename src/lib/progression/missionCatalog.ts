import { MISSION_CATALOG } from '@/lib/progression/config/missions';
import { loadMissionCatalogFromRemote } from '@/lib/progression/repositories/syncRemote';
import type { MissionDef } from '@/lib/progression/models/types';

let cachedCatalog: MissionDef[] | null = null;
let inflight: Promise<MissionDef[]> | null = null;

/** Active mission catalog — DB when available, config fallback. */
export async function getActiveMissionCatalog(): Promise<MissionDef[]> {
  if (cachedCatalog) return cachedCatalog;
  if (inflight) return inflight;

  inflight = (async () => {
    const remote = await loadMissionCatalogFromRemote();
    cachedCatalog = remote && remote.length > 0 ? remote : [...MISSION_CATALOG];
    inflight = null;
    return cachedCatalog;
  })();

  return inflight;
}

export function getMissionCatalogSync(): MissionDef[] {
  return cachedCatalog ?? [...MISSION_CATALOG];
}

export function primeMissionCatalog(catalog: MissionDef[]): void {
  cachedCatalog = catalog.length > 0 ? catalog : [...MISSION_CATALOG];
}

export function resetMissionCatalogCache(): void {
  cachedCatalog = null;
  inflight = null;
}

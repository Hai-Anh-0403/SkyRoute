import dataSource from '../data-source';

interface ExplainNode {
  'Node Type'?: string;
  'Index Name'?: string;
  Plans?: ExplainNode[];
}

interface ExplainJsonRow {
  'QUERY PLAN': Array<{
    'Planning Time': number;
    'Execution Time': number;
    Plan: ExplainNode;
  }>;
}

const RADAR_SQL = `
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT p.id, p.name,
  ROUND(CAST(ST_DistanceSphere(p.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)) / 1000.0 AS numeric), 2) AS distance_km
FROM places p
WHERE p.is_active = TRUE
  AND ST_DWithin(CAST(p.location AS geography), CAST(ST_SetSRID(ST_MakePoint($1, $2), 4326) AS geography), $3)
ORDER BY distance_km ASC
LIMIT 12;
`;

const KNN_SQL = `
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT s.id, s.name,
  ROUND((ST_DistanceSphere(s.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)) / 1000.0)::numeric, 2) AS distance_km
FROM stays s
WHERE s.is_active = TRUE
ORDER BY s.location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326) ASC
LIMIT 10;
`;

function collectIndexes(node: ExplainNode | undefined, acc: string[] = []): string[] {
  if (!node) return acc;
  if (node['Index Name']) {
    acc.push(node['Index Name']);
  }
  for (const child of node.Plans ?? []) {
    collectIndexes(child, acc);
  }
  return acc;
}

async function runExplain(sql: string, params: unknown[]) {
  const rows = (await dataSource.query(sql, params)) as ExplainJsonRow[];
  const plan = rows[0]['QUERY PLAN'][0];
  return {
    executionMs: plan['Execution Time'],
    planningMs: plan['Planning Time'],
    indexes: collectIndexes(plan.Plan),
  };
}

async function runBenchmark() {
  const thresholdMs = Number(process.env.SPATIAL_BENCHMARK_MAX_MS ?? 10);
  await dataSource.initialize();

  try {
    const counts = (await dataSource.query(`
      SELECT
        (SELECT COUNT(*)::int FROM places WHERE is_active = TRUE) AS places_count,
        (SELECT COUNT(*)::int FROM stays WHERE is_active = TRUE) AS stays_count;
    `)) as Array<{ places_count: number; stays_count: number }>;

    console.log(
      `[SpatialBenchmark] Active records: places=${counts[0]?.places_count ?? 0}, stays=${counts[0]?.stays_count ?? 0}`,
    );

    // First call per DB backend process loads PostGIS library & spatial_ref_sys metadata.
    const coldRadar = await runExplain(RADAR_SQL, [108.4583, 11.9404, 3000]);
    const coldKnn = await runExplain(KNN_SQL, [108.4583, 11.9404]);

    console.log(
      `[SpatialBenchmark] Cold init ST_DWithin Radar (3km): execution=${coldRadar.executionMs.toFixed(3)}ms, planning=${coldRadar.planningMs.toFixed(3)}ms, indexes=[${coldRadar.indexes.join(', ')}]`,
    );
    console.log(
      `[SpatialBenchmark] Cold init KNN <-> Centroid Stays: execution=${coldKnn.executionMs.toFixed(3)}ms, planning=${coldKnn.planningMs.toFixed(3)}ms, indexes=[${coldKnn.indexes.join(', ')}]`,
    );

    // Steady-state pooled queries reflect API latency under connection pooling.
    const warmRadar = await runExplain(RADAR_SQL, [108.4583, 11.9404, 3000]);
    const warmKnn = await runExplain(KNN_SQL, [108.4583, 11.9404]);

    console.log(
      `[SpatialBenchmark] Warm pooled ST_DWithin Radar (3km): execution=${warmRadar.executionMs.toFixed(3)}ms, planning=${warmRadar.planningMs.toFixed(3)}ms, indexes=[${warmRadar.indexes.join(', ')}]`,
    );
    console.log(
      `[SpatialBenchmark] Warm pooled KNN <-> Centroid Stays: execution=${warmKnn.executionMs.toFixed(3)}ms, planning=${warmKnn.planningMs.toFixed(3)}ms, indexes=[${warmKnn.indexes.join(', ')}]`,
    );

    if (
      !warmRadar.indexes.includes('idx_places_location_geography') ||
      !warmKnn.indexes.includes('idx_stays_location')
    ) {
      throw new Error(
        `Expected GIST indexes not used (radar=[${warmRadar.indexes.join(', ')}], knn=[${warmKnn.indexes.join(', ')}])`,
      );
    }

    if (warmRadar.executionMs >= thresholdMs || warmKnn.executionMs >= thresholdMs) {
      throw new Error(
        `Spatial query exceeded ${thresholdMs}ms budget (radar=${warmRadar.executionMs}ms, knn=${warmKnn.executionMs}ms)`,
      );
    }
  } finally {
    await dataSource.destroy();
  }
}

runBenchmark().catch((err) => {
  console.error('[SpatialBenchmark] FAILED:', err);
  process.exit(1);
});

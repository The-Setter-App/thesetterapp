export interface FunnelSegmentGeometry {
  start: number;
  end: number;
  upperStart: number;
  upperEnd: number;
  lowerStart: number;
  lowerEnd: number;
  opacity: number;
}

export interface FunnelGeometry {
  clipPath: string;
  segments: FunnelSegmentGeometry[];
  centerLineY: number;
}

const STAGE_COUNT = 5;
const STAGE_WIDTH = 20;
const CENTER_LINE_Y = 60.9;
const MIN_HALF_THICKNESS = 2.2;
const MAX_HALF_THICKNESS = 27.5;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function normalizeStages(values: number[]): number[] {
  const safe = values
    .slice(0, STAGE_COUNT)
    .map((value) => (Number.isFinite(value) && value > 0 ? value : 0));
  while (safe.length < STAGE_COUNT) {
    safe.push(0);
  }

  const maxValue = safe.reduce((max, value) => Math.max(max, value), 0);
  if (maxValue <= 0) {
    return safe.map(() => 0);
  }

  return safe.map((value) => value / maxValue);
}

function getBoundaryRatios(stageRatios: number[]): number[] {
  const boundaries: number[] = [];
  boundaries.push(stageRatios[0]);
  for (let i = 1; i < STAGE_COUNT; i += 1) {
    boundaries.push((stageRatios[i - 1] + stageRatios[i]) / 2);
  }
  boundaries.push(stageRatios[STAGE_COUNT - 1]);
  return boundaries;
}

function getBoundaryHalfThicknesses(boundaryRatios: number[]): number[] {
  return boundaryRatios.map((ratio) => {
    const easedRatio = Math.sqrt(clamp(ratio, 0, 1));
    return (
      MIN_HALF_THICKNESS +
      (MAX_HALF_THICKNESS - MIN_HALF_THICKNESS) * easedRatio
    );
  });
}

function buildClipPathFromBoundaries(halfThicknesses: number[]): string {
  const upperPoints = halfThicknesses.map((halfThickness, index) => {
    const x = index * STAGE_WIDTH;
    const y = CENTER_LINE_Y - halfThickness;
    return `${x}% ${y.toFixed(2)}%`;
  });

  const lowerPoints = [...halfThicknesses]
    .reverse()
    .map((halfThickness, reverseIndex) => {
      const x = (STAGE_COUNT - reverseIndex) * STAGE_WIDTH;
      const y = CENTER_LINE_Y + halfThickness;
      return `${x}% ${y.toFixed(2)}%`;
    });

  return `polygon(${[...upperPoints, ...lowerPoints].join(', ')})`;
}

function buildSegmentsFromBoundaries(
  halfThicknesses: number[],
): FunnelSegmentGeometry[] {
  const segments: FunnelSegmentGeometry[] = [];

  for (let i = 0; i < STAGE_COUNT; i += 1) {
    const start = i * STAGE_WIDTH;
    const end = (i + 1) * STAGE_WIDTH;
    const startThickness = halfThicknesses[i];
    const endThickness = halfThicknesses[i + 1];

    segments.push({
      start,
      end,
      upperStart: CENTER_LINE_Y - startThickness,
      upperEnd: CENTER_LINE_Y - endThickness,
      lowerStart: CENTER_LINE_Y + startThickness,
      lowerEnd: CENTER_LINE_Y + endThickness,
      opacity: 1 - i * 0.2,
    });
  }

  return segments;
}

export function buildFunnelGeometry(stageValues: number[]): FunnelGeometry {
  const ratios = normalizeStages(stageValues);
  const boundaryRatios = getBoundaryRatios(ratios);
  const halfThicknesses = getBoundaryHalfThicknesses(boundaryRatios);

  return {
    clipPath: buildClipPathFromBoundaries(halfThicknesses),
    segments: buildSegmentsFromBoundaries(halfThicknesses),
    centerLineY: CENTER_LINE_Y,
  };
}

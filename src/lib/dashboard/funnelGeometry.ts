export interface FunnelSegmentGeometry {
  pathD: string;
  opacity: number;
}

export interface FunnelGeometry {
  pathD: string;
  segments: FunnelSegmentGeometry[];
  centerLineY: number;
}

const STAGE_COUNT = 5;
const STAGE_WIDTH = 20;
const CENTER_LINE_Y = 60.9;
const ZERO_HALF_THICKNESS = 1.25;
const NON_ZERO_MIN_HALF_THICKNESS = 2.2;
const MAX_HALF_THICKNESS = 27.5;
const CURVE_CONTROL_FACTOR = 0.42;

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
    const previous = stageRatios[i - 1];
    const current = stageRatios[i];
    if (previous <= 0 || current <= 0) {
      boundaries.push(0);
      continue;
    }

    boundaries.push((previous + current) / 2);
  }
  boundaries.push(stageRatios[STAGE_COUNT - 1]);
  return boundaries;
}

function getBoundaryHalfThicknesses(boundaryRatios: number[]): number[] {
  return boundaryRatios.map((ratio) => {
    const clampedRatio = clamp(ratio, 0, 1);
    if (clampedRatio <= 0) {
      return ZERO_HALF_THICKNESS;
    }

    const easedRatio = Math.sqrt(clampedRatio);
    return (
      NON_ZERO_MIN_HALF_THICKNESS +
      (MAX_HALF_THICKNESS - NON_ZERO_MIN_HALF_THICKNESS) * easedRatio
    );
  });
}

function format(value: number): string {
  return value.toFixed(2);
}

function buildCurvedSegmentPath(
  start: number,
  end: number,
  startThickness: number,
  endThickness: number,
): string {
  const upperStart = CENTER_LINE_Y - startThickness;
  const upperEnd = CENTER_LINE_Y - endThickness;
  const lowerStart = CENTER_LINE_Y + startThickness;
  const lowerEnd = CENTER_LINE_Y + endThickness;
  const controlOffset = (end - start) * CURVE_CONTROL_FACTOR;

  return [
    `M ${format(start)} ${format(upperStart)}`,
    `C ${format(start + controlOffset)} ${format(upperStart)} ${format(end - controlOffset)} ${format(upperEnd)} ${format(end)} ${format(upperEnd)}`,
    `L ${format(end)} ${format(lowerEnd)}`,
    `C ${format(end - controlOffset)} ${format(lowerEnd)} ${format(start + controlOffset)} ${format(lowerStart)} ${format(start)} ${format(lowerStart)}`,
    "Z",
  ].join(" ");
}

function buildCombinedPathFromBoundaries(halfThicknesses: number[]): string {
  const upperYs = halfThicknesses.map(
    (halfThickness) => CENTER_LINE_Y - halfThickness,
  );
  const lowerYs = halfThicknesses.map(
    (halfThickness) => CENTER_LINE_Y + halfThickness,
  );

  const commands: string[] = [`M 0 ${format(upperYs[0])}`];

  for (let i = 0; i < STAGE_COUNT; i += 1) {
    const start = i * STAGE_WIDTH;
    const end = (i + 1) * STAGE_WIDTH;
    const controlOffset = (end - start) * CURVE_CONTROL_FACTOR;
    commands.push(
      `C ${format(start + controlOffset)} ${format(upperYs[i])} ${format(end - controlOffset)} ${format(upperYs[i + 1])} ${format(end)} ${format(upperYs[i + 1])}`,
    );
  }

  commands.push(`L 100 ${format(lowerYs[STAGE_COUNT])}`);

  for (let i = STAGE_COUNT - 1; i >= 0; i -= 1) {
    const start = i * STAGE_WIDTH;
    const end = (i + 1) * STAGE_WIDTH;
    const controlOffset = (end - start) * CURVE_CONTROL_FACTOR;
    commands.push(
      `C ${format(end - controlOffset)} ${format(lowerYs[i + 1])} ${format(start + controlOffset)} ${format(lowerYs[i])} ${format(start)} ${format(lowerYs[i])}`,
    );
  }

  commands.push("Z");
  return commands.join(" ");
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
      pathD: buildCurvedSegmentPath(start, end, startThickness, endThickness),
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
    pathD: buildCombinedPathFromBoundaries(halfThicknesses),
    segments: buildSegmentsFromBoundaries(halfThicknesses),
    centerLineY: CENTER_LINE_Y,
  };
}

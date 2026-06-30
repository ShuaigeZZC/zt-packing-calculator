const SUPPORTED_LAYOUTS = [
  { a: 2, b: 3, businessPriority: 1 },
  { a: 2, b: 2, businessPriority: 2 },
  { a: 2, b: 4, businessPriority: 3 },
  { a: 3, b: 3, businessPriority: 4 },
  { a: 1, b: 1, businessPriority: 5 }
];

export function chooseLayout(rollCount) {
  if (!Number.isInteger(rollCount) || rollCount <= 0) {
    throw new RangeError('rollCount must be a positive integer');
  }

  return toPublicLayout(selectLayout(rollCount).selected.layout);
}

export function calculatePacking({ rollCount, diameterMm, heightMm, includeDebug = false }) {
  const optimizationResult = selectLayout(rollCount);
  const layout = optimizationResult.selected.layout;
  const optimization = {
    strategy: 'supported-industrial-layout-scoring',
    selected_reason: `selected ${layout.layout} for ${rollCount} rolls using business-priority scoring`
  };

  if (includeDebug) {
    optimization.candidates = optimizationResult.candidates.map((candidate) => ({
      layout: candidate.layout.layout,
      factors: {
        a: candidate.layout.a,
        b: candidate.layout.b
      },
      score: candidate.score
    }));
  }

  return {
    layout: layout.layout,
    factors: {
      a: layout.a,
      b: layout.b
    },
    box_dimensions_mm: {
      length: layout.a * diameterMm,
      width: layout.b * diameterMm,
      height: heightMm
    },
    optimization
  };
}

function selectLayout(rollCount) {
  const candidates = generateCandidates(rollCount).map((layout) => ({
    layout,
    score: scoreLayout(layout)
  }));

  if (candidates.length === 0) {
    throw new RangeError(`unsupported rollCount: ${rollCount}`);
  }

  candidates.sort((left, right) => left.score.total - right.score.total);

  return {
    selected: candidates[0],
    candidates
  };
}

function generateCandidates(rollCount) {
  return SUPPORTED_LAYOUTS.filter((layout) => layout.a * layout.b === rollCount).map((layout) =>
    formatLayout(layout.a, layout.b, layout.businessPriority)
  );
}

function formatLayout(a, b, businessPriority) {
  return {
    a,
    b,
    layout: `${a}x${b}`,
    businessPriority
  };
}

function toPublicLayout({ a, b, layout }) {
  return { a, b, layout };
}

function scoreLayout({ a, b, businessPriority }) {
  const businessPriorityPenalty = businessPriority - 1;
  const squarenessPenalty = Math.abs(a - b);
  const longSidePenalty = Math.max(a, b);
  const manufacturingSimplicityPenalty = Number((squarenessPenalty * 0.5).toFixed(3));
  const industrialPreferenceBonus = -100;

  return {
    total:
      businessPriorityPenalty +
      squarenessPenalty +
      longSidePenalty +
      manufacturingSimplicityPenalty +
      industrialPreferenceBonus,
    businessPriorityPenalty,
    squarenessPenalty,
    longSidePenalty,
    manufacturingSimplicityPenalty,
    industrialPreferenceBonus
  };
}

# ZT Packing Physics Engine

Pure Node.js algorithm kernel for stretch film roll physics and carton packing.
The engine is independent from UI code and returns deterministic JSON for ERP
or API integration.

This is an algorithm kernel. UI, ERP adapters, API handlers, and 3D renderers
must consume this JSON output and must not duplicate calculation logic.

## Modules

- `src/physics.js`: roll outer diameter and roll length formulas.
- `src/rules.js`: process rules for carton height and safe diameter rounding.
- `src/packing.js`: supported industrial packing layout optimization and carton dimensions.
- `src/index.js`: public API and structured output composition.

Boundary rules:

- `physics.js` owns only physical formulas.
- `rules.js` owns only process rules and unit conversion.
- `packing.js` owns only packing layout selection, scoring, and box dimensions.
- `index.js` owns only input normalization, validation, module orchestration, and JSON composition.

## Public API

```js
import { calculatePackaging } from './src/index.js';

const result = calculatePackaging({
  rollCount: 6,
  netWeightG: 1648.8,
  filmWidthMm: 500,
  coreDiameterMm: 86.2,
  thicknessMm: 0.012,
  densityGPerCm3: 0.00916
});
```

Debug output is opt-in:

```js
const result = calculatePackaging(input, { includeDebug: true });
```

## Input

| Field | Unit | Required | Description |
| --- | --- | --- | --- |
| `rollCount` | count | yes | Number of rolls in one carton. |
| `netWeightG` | g | yes | Net film weight per roll. |
| `filmWidthMm` | mm | yes | Film width. |
| `coreDiameterMm` | mm | yes | Paper core outer diameter used by the physics formula. |
| `thicknessMm` | mm | yes | Film thickness. |
| `densityGPerCm3` | coefficient | no | Business density factor, defaults to `0.00916`. |

## UI Paper Core Rule

The UI shows paper-core sizes in the industry convention: inner diameter. The
algorithm kernel still receives the outer diameter required by the roll-diameter
formula.

```text
coreOuterDiameterMm = coreInnerDiameterMm + 10
```

Example:

```text
UI option: 3 inch (76.2 mm inner diameter)
Adapter model: coreInnerDiameterMm = 76.2
Adapter allowance: coreWallAllowanceMm = 10
Kernel input: coreDiameterMm = 86.2
```

`ui/packagingAdapter.js` owns this conversion. UI components must not pass the
inner diameter directly to `calculatePackaging()`, and the algorithm formulas do
not change to compensate for UI units.

## Wizard Flow

The browser UI is a five-step wizard:

1. Product parameters: film length, film width, thickness, and density. The UI
   derives net weight from those fields.
2. Paper core and packing: paper-core inner diameter, calculated outer diameter,
   and roll count.
3. Algorithm recommendation: physics, process rules, layout, and carton size.
4. Historical reference: A/B records only, displayed as reference evidence.
5. Confirmation and export: decision draft, developer JSON, dimensions, and
   calculation explanation.

Historical records remain reference-only evidence and never override the
algorithm recommendation.

## Formulas

```text
weight_g = length_m * thickness_micron * width_cm * density_factor
effective_density_g_cm3 = density_factor * 100
D_raw = sqrt(d^2 + (4000W) / (pi * Width_mm * effective_density_g_cm3))
length_m = W / (density_factor * width_cm * thickness_micron)
height_cm = Width / 10 + 3
D_final = ceil(D_raw)
```

## Packing Optimizer

The V1 kernel supports only the industrial layouts confirmed for the domain:

| Roll count | Layout |
| --- | --- |
| 1 | `1x1` |
| 4 | `2x2` |
| 6 | `2x3` |
| 8 | `2x4` |
| 9 | `3x3` |

Unsupported roll counts throw an explicit `unsupported rollCount` error instead
of falling back to generic mathematical factors. For example, `5 -> 1x5` is
mathematically possible but is not an industrial layout for this kernel.

Layout selection uses candidate generation and scoring:

1. Generate candidates from the supported industrial layout set.
2. Keep candidates whose `a * b` equals the requested roll count.
3. Score each candidate with business priority, squareness, long side, manufacturing simplicity, and industrial preference.
4. Select the lowest score.

Business priority outranks pure squareness:

```text
2x3 > 2x2 > 2x4 > 3x3 > 1x1
```

## Output Shape

```js
{
  input: {
    roll_count: 6,
    net_weight_g: 1648.8,
    film_width_mm: 500,
    core_diameter_mm: 86.2,
    thickness_mm: 0.012,
    density_g_cm3: 0.00916
  },
  physics: {
    D_raw: 109.61,
    D_final: 110,
    rounding_delta: 0.39,
    length_m: 300
  },
  rules: {
    height_cm: 53,
    height_mm: 530
  },
  packing: {
    layout: '2x3',
    factors: { a: 2, b: 3 },
    box_dimensions_mm: {
      length: 220,
      width: 330,
      height: 530
    },
    optimization: {
      strategy: 'supported-industrial-layout-scoring',
      selected_reason: 'selected 2x3 for 6 rolls using business-priority scoring'
    }
  }
}
```

## Output Fields

| Field | Unit | Description |
| --- | --- | --- |
| `input.roll_count` | count | Normalized roll count requested by the caller. |
| `input.net_weight_g` | g | Net film weight per roll. |
| `input.film_width_mm` | mm | Film width. |
| `input.core_diameter_mm` | mm | Paper core outer diameter. |
| `input.thickness_mm` | mm | Film thickness. |
| `input.density_g_cm3` | coefficient | Business density factor used by the physics module. |
| `physics.D_raw` | mm | Raw calculated outer diameter before process rounding. |
| `physics.D_final` | mm | Safe process diameter after `ceil(D_raw)`. |
| `physics.rounding_delta` | mm | Difference between final and raw diameter. |
| `physics.length_m` | m | Calculated film length. |
| `rules.height_cm` | cm | Carton height from the width-to-height process rule. |
| `rules.height_mm` | mm | Carton height converted for carton dimensions. |
| `packing.layout` | text | Selected industrial layout label, such as `2x3`. |
| `packing.factors.a` | count | Roll count factor used for carton length. |
| `packing.factors.b` | count | Roll count factor used for carton width. |
| `packing.box_dimensions_mm.length` | mm | `a * D_final`; never calculated from `D_raw`. |
| `packing.box_dimensions_mm.width` | mm | `b * D_final`; never calculated from `D_raw`. |
| `packing.box_dimensions_mm.height` | mm | `rules.height_mm`. |
| `packing.optimization.strategy` | text | Optimizer strategy name. |
| `packing.optimization.selected_reason` | text | Human-readable explanation for the selected layout. |

When `includeDebug: true` is passed, `packing.optimization.candidates` includes
candidate score details. The default output omits candidates to keep ERP/API
payloads compact.

Debug candidates include `layout`, `factors`, and `score` fields. Scores are
for explanation and future optimization hooks; callers should consume the
selected `packing.layout` and `packing.box_dimensions_mm` as the stable result.

3D renderers must consume `packing.box_dimensions_mm` and related JSON fields.
They must not calculate diameter, height, or layout independently.

## Historical Reference Layer

Historical carton data is an evidence layer only. The algorithm kernel does not
read Excel files, does not import historical JSON, and does not let historical
records override `calculatePackaging` output.

Source and generated files:

- `data/历史纸箱数据_清洗报告_可信度分级表.xlsx`: source workbook for import.
- `scripts/importHistoricalCartons.js`: import script for the workbook.
- `src/data/historicalCartonReference.json`: generated browser-readable
  evidence data.
- `src/historical/*`: normalization, classification, matching, and scoring.
- `src/adapters/historicalReferenceAdapter.js`: UI-facing adapter.

Import the workbook after replacing or updating the Excel file:

```powershell
npm.cmd run import:historical
```

Only confidence levels `A` and `B` are eligible for the business reference
panel. `C` and `D` records stay in the anomaly/debug data and are not used as
recommendations. The UI shows up to three similar historical records and labels
them as reference-only. Decision buttons generate a JSON draft for manual
confirmation; they do not persist data.

## Verification

```powershell
npm.cmd run import:historical
npm.cmd test
npm.cmd audit --omit=dev
```

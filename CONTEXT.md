# Stretch Film Packing Physics Engine Context

## Glossary

### Industrial Preference

An industrially familiar packing layout that should receive a scoring advantage
when the packing optimizer chooses among valid roll-count factor layouts.

## Assumptions

### Industrial Preference Layouts

The following layouts are the supported industrial packing layouts for the V1
algorithm kernel:

- `1 -> 1x1`
- `4 -> 2x2`
- `6 -> 2x3`
- `8 -> 2x4`
- `9 -> 3x3`

Mathematically valid prime layouts such as `5 -> 1x5` are not industrially used
for this kernel and should not be selected. A single roll may use `1x1`.

Unsupported roll counts must raise an explicit error instead of falling back to
generic factor layouts. Examples of unsupported counts include `2`, `3`, `5`,
`7`, `10`, and `12`.

These layouts should participate in optimizer scoring. They must not bypass
candidate generation through hardcoded early returns.

### Packing Optimizer Scope

The packing optimizer should generate candidates from the supported industrial
layout set, then keep candidates whose `a * b` equals the requested roll count.
Scoring exists to make the choice explainable and ready for future expansion,
not to fall back to arbitrary mathematical factor layouts.

Business preference must outrank pure squareness. Layout business priority is:

1. `2x3`
2. `2x2`
3. `2x4`
4. `3x3`
5. `1x1`

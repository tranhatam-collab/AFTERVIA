---
layer: SPEC
id: spec-water
locale: en
version: 1
module: water
updated: 2026-11-06
purpose: Show how to secure drinking and household water for a household, from three days up to thirty.
audience:
  - staying-in-city
  - decided-to-move
  - vulnerable
required_sections:
  - id: how-much
    heading: How much water
    must_cover:
      - The per-person daily need, using the figure from the cited source and never an invented one.
      - Extra needs for children, heat and pets.
  - id: store
    heading: Store it
    must_cover:
      - Containers, cleaning, location, labelling and rotation.
  - id: collect
    heading: Collect it
    must_cover:
      - "Rainwater: roof, gutters, first flush and tank."
      - Wells, with the warning that quality must be tested.
  - id: treat
    heading: Treat it
    must_cover:
      - "Filtering, boiling and disinfecting: say exactly what each removes and what it does not."
      - The scope of a filter's certification.
  - id: sanitation
    heading: Sanitation
    must_cover:
      - Waste water, toilets and hygiene when water is short.
safety_points:
  - A filter removes only what its certification says; read the scope.
  - Boiling or disinfecting does not remove fuel, chemicals or radioactive material; say so.
  - Test well and rainwater quality before drinking.
  - Store water in covered, food-safe containers away from heat.
red_lines:
  - Do not call water safe to drink without stating the method and its limits.
  - Do not describe a product as certified unless the certificate scope is shown.
  - Do not give disinfectant dosing beyond what a cited official source states.
  - Do not say that a place, route or building is safe or open.
  - Do not promise or guarantee any outcome.
  - Do not include weapons or instructions to evade the law.
minimum_sources:
  count: 2
local_must_have:
  - units
  - authorities
  - climate_variant
  - local_examples
tools:
  - water-storage-calculator
  - rainwater-calculator
packs:
  - pack-water-start
  - pack-72h-personal
  - pack-home-stock-2w
disclaimer: none
---
Writer notes for water: draft each locale from this spec, not from another locale. Cite only sources in sources.json that allow reuse. Give figures only when a cited source states them, and keep local details (units, numbers, authorities, laws, seasons) specific to the reader's country.

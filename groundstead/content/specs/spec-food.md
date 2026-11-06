---
layer: SPEC
id: spec-food
locale: en
version: 1
module: food
updated: 2026-11-06
purpose: Help a reader build a food stock now and a growing plan for their climate over time.
audience:
  - staying-in-city
  - decided-to-move
  - vulnerable
required_sections:
  - id: calories-and-stock
    heading: Calories and stock
    must_cover:
      - Daily need and the stock needed to reach two weeks, using the cited figures.
  - id: growing
    heading: Growing
    must_cover:
      - Beds by climate zone, seed saving, local seed and seasons.
  - id: animals
    heading: Small livestock
    must_cover:
      - Basics, local rules and permits, and animal welfare.
  - id: preserving
    heading: Keeping food
    must_cover:
      - Drying, cooling and storage, with the risks the source names.
      - Never invent safe times.
  - id: calendar
    heading: Seasonal calendar
    must_cover:
      - A planting calendar by climate zone.
safety_points:
  - "Home preserving can cause serious illness if done wrongly: follow only official, tested methods."
  - Check expiry dates and rotate the stock.
  - Wash produce and keep raw and cooked food apart.
red_lines:
  - Do not give canning or preserving times unless a cited official source states them.
  - Do not encourage foraging wild plants or mushrooms.
  - Do not give veterinary dosing.
  - Do not say that a place, route or building is safe or open.
  - Do not promise or guarantee any outcome.
  - Do not include weapons or instructions to evade the law.
minimum_sources:
  count: 2
local_must_have:
  - units
  - season
  - climate_variant
  - local_examples
  - laws
tools:
  - calorie-planner
packs:
  - pack-food-seed-region
  - pack-home-stock-2w
disclaimer: none
---
Writer notes for food: draft each locale from this spec, not from another locale. Cite only sources in sources.json that allow reuse. Give figures only when a cited source states them, and keep local details (units, numbers, authorities, laws, seasons) specific to the reader's country.

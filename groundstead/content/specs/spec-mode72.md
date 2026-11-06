---
layer: SPEC
id: spec-mode72
locale: en
version: 1
module: mode72
updated: 2026-11-06
purpose: "Give a city resident a plan they can finish in one evening: a three-day go-bag, a two-week home stock and a family plan tied to their city's hazards."
audience:
  - staying-in-city
  - vulnerable
  - urban-hesitant
required_sections:
  - id: family-plan
    heading: Family plan
    must_cover:
      - An out-of-area contact and two meeting places.
      - Who collects the children.
      - Needs of older people, disabled people and pets.
  - id: go-bag
    heading: Go-bag for three days
    must_cover:
      - What to carry, within the weight the person can carry.
      - Documents in a waterproof bag.
      - A list of the medicines the person already takes; no advice on doses.
  - id: home-stock
    heading: Home stock for two weeks
    must_cover:
      - Water and food, with the figures taken from the cited source.
      - Storage, rotation and expiry checks, sanitation, light and power.
  - id: hazards
    heading: Your city's hazards
    must_cover:
      - "One short block per local hazard (flood, storm, heat, smoke, power cut, earthquake where relevant): first action, what to avoid and when to leave."
  - id: stay-or-go
    heading: Stay or go
    must_cover:
      - How to decide between sheltering in place and leaving.
      - Follow official orders; routes come only from official sources.
  - id: check-routine
    heading: Check routine
    must_cover:
      - Review dates, battery and expiry checks and a 20-minute drill.
safety_points:
  - "Carbon monoxide: generators, grills and camp stoves are used outdoors only, away from windows and doors."
  - "Heat: signs of heat illness and when to seek help, taken from the cited source; check on older neighbours."
  - "Floodwater: never walk or drive through moving water."
  - "Water: use only treatment methods whose limits the source states; boiling does not remove chemical contamination."
  - Official alerts take priority over this guidance.
red_lines:
  - Do not give medicine doses or treatment for serious conditions.
  - Do not predict earthquakes or other events.
  - Do not call a kit "complete" or "certified" unless every required item is covered.
  - Do not say that a place, route or building is safe or open.
  - Do not promise or guarantee any outcome.
  - Do not include weapons or instructions to evade the law.
minimum_sources:
  count: 2
  note: Prefer a US government source plus a second independent one; each hazard block needs its own source.
local_must_have:
  - units
  - emergency_numbers
  - authorities
  - season
  - climate_variant
  - local_examples
tools:
  - readiness-quiz
  - family-plan
  - supply-cabinet
  - three-planners
packs:
  - pack-72h-personal
  - pack-home-stock-2w
  - pack-power-outage
  - pack-flood-storm
  - pack-heat-smoke
disclaimer: none
---
Writer notes for mode72: draft each locale from this spec, not from another locale. Cite only sources in sources.json that allow reuse. Give figures only when a cited source states them, and keep local details (units, numbers, authorities, laws, seasons) specific to the reader's country.

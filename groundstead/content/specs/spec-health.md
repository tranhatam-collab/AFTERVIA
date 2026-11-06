---
layer: SPEC
id: spec-health
locale: en
version: 1
module: health
updated: 2026-11-06
purpose: Give first-aid basics from recognised bodies and help a reader plan access to care, without replacing a clinician.
audience:
  - staying-in-city
  - decided-to-move
  - vulnerable
required_sections:
  - id: first-aid-basics
    heading: First-aid basics
    must_cover:
      - Only steps taken from a recognised first-aid body.
      - When to call for help first.
  - id: home-medicines
    heading: Medicines at home
    must_cover:
      - Keeping a supply of the medicines the reader already takes, by talking to a doctor or pharmacist.
      - Storage and expiry; no dosing.
  - id: care-access
    heading: Reaching care
    must_cover:
      - Know the nearest clinic and hospital and how to reach them when roads fail.
      - Remote consultation options.
  - id: heat-cold-smoke
    heading: Heat, cold and smoke
    must_cover:
      - Warning signs and when to seek help, taken from the cited source.
  - id: records
    heading: Health records
    must_cover:
      - A current list of conditions, allergies and medicines, kept offline too.
safety_points:
  - Call the local emergency number first for any serious injury or illness.
  - Chronic conditions need a plan made with the reader's own doctor.
  - First aid does not replace professional care.
red_lines:
  - Do not give medicine doses.
  - Do not diagnose or treat serious conditions.
  - Do not recommend prescription or unregistered medicines.
  - Do not copy content from a source that is not cleared for reuse.
  - Do not say that a place, route or building is safe or open.
  - Do not promise or guarantee any outcome.
  - Do not include weapons or instructions to evade the law.
legal_notes:
  - Medicine rules, pharmacist roles and first-aid training standards differ by country.
minimum_sources:
  count: 2
local_must_have:
  - emergency_numbers
  - authorities
  - laws
  - units
  - local_examples
tools: []
packs:
  - pack-first-aid-family
disclaimer: medical-first-aid
---
Writer notes for health: draft each locale from this spec, not from another locale. Cite only sources in sources.json that allow reuse. Give figures only when a cited source states them, and keep local details (units, numbers, authorities, laws, seasons) specific to the reader's country.

---
layer: SPEC
id: spec-power
locale: en
version: 1
module: power
updated: 2026-11-06
purpose: Help a reader size a small backup or off-grid power system and use it safely.
audience:
  - staying-in-city
  - decided-to-move
required_sections:
  - id: load
    heading: Your load
    must_cover:
      - List appliances and their watts, then daily energy use.
      - What must stay on during an outage.
  - id: backup
    heading: Backup power
    must_cover:
      - Power banks, portable stations and solar panels, sized by hours of use.
      - Charge and discharge limits.
  - id: fixed-solar
    heading: Fixed solar
    must_cover:
      - What a fixed system involves and when a licensed electrician is required.
  - id: safety
    heading: Safety
    must_cover:
      - Carbon monoxide, fire, battery handling and wet conditions.
  - id: light-and-cooking
    heading: Light and cooking
    must_cover:
      - Safe light and cooking without mains power.
safety_points:
  - "Generators, grills and camp stoves produce carbon monoxide: use them outdoors only, away from doors and windows, and fit CO alarms."
  - Do not charge or store lithium batteries in heat or after damage.
  - Fixed installations and grid connections are for licensed electricians.
  - Never connect a generator to household wiring without a transfer switch fitted by a professional.
red_lines:
  - Do not give instructions for mains wiring or grid connection.
  - Do not call a product "safe" without the certification shown.
  - Do not give runtimes without stating the assumptions.
  - Do not say that a place, route or building is safe or open.
  - Do not promise or guarantee any outcome.
  - Do not include weapons or instructions to evade the law.
legal_notes:
  - Grid connection, net metering and installer licensing differ by country.
minimum_sources:
  count: 2
local_must_have:
  - units
  - laws
  - authorities
  - local_examples
tools:
  - load-calculator
  - solar-battery-sizer
packs:
  - pack-power-outage
  - pack-power-start
disclaimer: electrical
---
Writer notes for power: draft each locale from this spec, not from another locale. Cite only sources in sources.json that allow reuse. Give figures only when a cited source states them, and keep local details (units, numbers, authorities, laws, seasons) specific to the reader's country.

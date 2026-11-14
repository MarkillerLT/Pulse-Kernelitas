# Scientific sources, assumptions and limitations

**This prototype has not processed or integrated any NASA datasets. Its numeric rules are illustrative game coefficients, not NASA findings, clinical thresholds or recommendations. PULSE is not a medical device and must not guide real mission or medical decisions.**

## Primary portals for future integration

- NASA Open Science Data Repository: https://osdr.nasa.gov/ — starting point for discovering space biology datasets, study metadata and reuse terms.
- NASA Human Research Program: https://www.nasa.gov/hrp/ — starting point for human spaceflight risk and research information.

These are research entry points, not evidence validating the equations below. No specific study has been selected, reviewed, normalized, calibrated or used in this build. There are no runtime NASA API calls and no NASA affiliation/endorsement implied.

## Variables

Every crew member has abstract sleep recovery, fatigue load, cognition and stress scores, clamped to 0–100 after activity effects. They are not hours slept, clinical test scores, biomarker concentrations, diagnoses, probabilities or measured physiological quantities. Health status is a game label derived from fatigue/stress. Initial scores, character biographies and mission budget are fictional.

Cognitive performance is recomputed after each activity as:

```
round(clamp(100 − 0.4 × fatigue − 0.2 × stress + 0.08 × sleep, 0, 100))
```

Initial scores are scenario-authored, not generated from that formula. The first turn recomputes them. Scores are not validated measurements; uncertainty and individual variability are omitted.

## Complete rule inventory

Canonical tunable parameters: `src/simulation/parameters/defaults.ts`. Additional activity coefficients currently live in the short switch statement in `src/simulation/engine/simulateTurn.ts`; externalize the full rules only when scenarios need multiple models.

- Base operations consumption: 3 units/turn. Initial operations 180, medical 12.
- Work: fatigue +11 plus an integer perturbation in [−2,+2], sleep −8, stress +5. Readiness output: 4.5 × pre-shift cognition / 100 percentage points per worker. Due strain changes fatigue/stress before activities, but output uses the previous reported cognition rather than recomputing intermediate cognition.
- Rest: fatigue −24, sleep +25, stress −12; 1 extra operation.
- Exercise: fatigue +6, sleep +7, stress −6; 2 extra operations. Schedule stress −8 at exercise-report day +2.
- Assessment: fatigue +3, stress +2; 2 extra operations. Schedule a report at assessment-report day +1. Report contains existing simulated scores; no hidden lab value or diagnosis.
- Medical treatment: fatigue −16, sleep +10, stress −16; 1 extra operation and 2 medical units. Treatment is abstract; no drug, dose or procedure is represented.
- Social activity: fatigue −6, sleep +3, stress −18; 1 extra operation.
- Fatigue ≥78 at end of a work shift schedules +14 stress/+7 fatigue at next report. This can stack on consecutive overloaded shifts.
- Strained label: fatigue or stress ≥65; critical: either ≥90. Neither threshold has clinical meaning.
- Mission readiness sums work output and rounds to one decimal each turn, capped at 100. Duration: 30 shifts. Completion is evaluated before failure.
- Initial crew values: Vasquez sleep 64/fatigue 46/cognition 83/stress 32; Okafor 38/72/68/56; Park 78/28/92/24.
- PRNG: LCG `next = (1664525 × state + 1013904223) mod 2^32`. Initial seed 2049; one draw per crew per valid turn. Perturbation is `floor(draw × 5) − 2`. No other random events are generated in this slice.

## Temporal interpretation

One game turn is one stylized mission day. Assignments represent a dominant daily routine, not a literal claim that a person sleeps or exercises for 24 hours. There is no circadian phase model, task schedule, sleep architecture or medical causality model. Delayed effects are narrative game mechanics. Travel speed is a visual mapping only and has no physiological meaning.

## Limitations

No human-subject data, prediction validation, sex/age-specific calibration, nutrition, hydration, radiation, microgravity adaptation, bone/muscle loss, cardiovascular health, medication effects, equipment reliability, injury, communication delays or differential diagnosis. There is no quantified uncertainty, missing sensor data or measurement noise. Roles currently carry narrative meaning but no treatment permissions or productivity modifiers. Correlations are intentionally compressed into one toy model. It should not be described as scientifically accurate.

## Integration plan

1. Identify a specific relevant study and record accession, authors, version, DOI, measurement units, population and study conditions.
2. Review consent, human-subject privacy, licensing and reuse restrictions before any download or redistribution.
3. Store raw data outside shipped assets only after approval; write reproducible preprocessing and dataset provenance documentation. No personal data should ship in browser bundles.
4. Map study variables to model terms without equating arbitrary scores to clinical outcomes. Document translations, units, missingness and confounders.
5. Replace or revise coefficients only with justified estimates and uncertainty intervals; separate reviewed scientific parameter sets from game balancing.
6. Seek domain-expert review, sensitivity analysis, calibration/holdout validation and clear in-game explanations of limitations before any stronger claim.

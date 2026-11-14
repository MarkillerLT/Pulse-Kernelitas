# PULSE — Mission Control

> Not a quiz. Not a slideshow. A living simulation where every choice costs something.

## First playable: A quiet warning

ARES–01 is preparing a Mars transfer. Elena Vasquez commands, Idris Okafor maintains flight systems, Mina Park oversees crew health. Okafor starts fatigued after overnight repairs. The player is flight director, not an astronaut answering questions.

Win by reaching 100% transfer readiness over at most 30 shifts. Work is the only source of readiness. Lose if the window expires, operational reserves drop below daily upkeep, or all crew become critical. A final shift completing readiness takes priority over abort checks; this prototype is intentionally forgiving about terminal resource/crew margins.

Day 1 is the initial planning state. Executing day 1 produces the day 2 report; executing the final day 30 produces day 31's terminal report. No turns pass while you inspect or wait for animations.

## Player loop

1. Inspect crew, fatigue/stress and previous reports.
2. Select crew from a sprite or card. The selected portrait and metrics update immediately.
3. Queue one activity per astronaut using buttons or station areas. A later assignment replaces the earlier queue entry.
4. Review next-shift costs and remaining transfer time.
5. Execute next day; observe immediate changes, movement to assigned stations, delayed effects and saved telemetry.
6. Routines persist! Explicitly return rested crew to duty. The Clear orders control cancels overrides, not committed routines.

## Trade-offs

| Activity  | Extra operations | Medical | Benefit and cost                                                                     |
| --------- | ---------------: | ------: | ------------------------------------------------------------------------------------ |
| Duty      |                0 |       0 | Readiness, but fatigue +11±2, sleep −8, stress +5; overload can cause delayed strain |
| Rest      |                1 |       0 | Fatigue −24, sleep +25, stress −12; no readiness                                     |
| Exercise  |                2 |       0 | Sleep +7, stress −6; fatigue +6 now, stress −8 two subsequent turns later            |
| Assess    |                2 |       0 | A delayed cognitive report; fatigue +3, stress +2; no healing                        |
| Treat     |                1 |       2 | Fatigue −16, stress −16, sleep +10; limited medical stock                            |
| Socialize |                1 |       0 | Fatigue −6, stress −18, sleep +3; no readiness                                       |

Base habitat upkeep is 3 operations/shift regardless of assignments. Medical supplies and operational reserves do not regenerate. Costs and health rules are fictional game balance.

## Consequences

A work shift ending at fatigue ≥78 queues strain for the next report: +14 stress and +7 fatigue. Resting afterward does not erase already incurred strain. Exercise adaptation occurs two turns after the exercise report. Assessment results arrive one turn after the assessment report. Repeating either routine schedules repeated effects and repeatedly consumes resources.

At ≥65 fatigue or stress a crew member is strained; ≥90 makes them critical. Critical is recoverable until mission abort. Slow movement and colored overhead markers communicate these states. All scores are abstract 0–100 variables.

## Strategy and scope

A simple rotation—rest when fatigue reaches 60, otherwise work—can complete the slice; an automated test verifies that the mission is actually winnable within reserves. This is not a tuned final strategy game. Assessment information is already visible in the interface, so assessments have limited strategic value until uncertainty/hidden telemetry is introduced.

There is one scenario, three crew, five areas and six assignments. Future work: stronger station-use animations, visible queued routes, scenario variety, station capacity constraints, richer event choices, uncertainty and sensor quality, limited attention/medical officer availability, difficulty settings, and sensitivity-tested balancing. Do not turn events into isolated multiple-choice quizzes; they must alter the same shared state.

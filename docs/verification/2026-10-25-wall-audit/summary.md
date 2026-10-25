# Wall generation audit (2026-10-25)

The full per-stage distribution.json is a local generated artifact. Run sample-wall-distribution.mjs to recreate it; this summary retains the aggregate evidence in the repository.

32 deterministic run seeds × 100 stages × 2 levels = 6,400 actual generated stages. Each run preserves the current variation history. No actor movement is simulated.

Fixed-wall percentages are counts of wall rectangle segments, not wall length, contact probability, or HP loss. Moving walls are counted separately in distribution.json.

| Level | Stage range | Group | Stages | Entire stage zero-damage walls | Stage with standard | Stage with stone/spike | Fixed wall segment mix |
|---|---|---|---:|---:|---:|---:|---|
| easy | 01-16 | ice-non-open | 135 | 22.2% | 0.0% | 0.0% | cork 81.5%, rubber 18.5% |
| easy | 17-23 | ice-non-open | 16 | 6.3% | 0.0% | 0.0% | cork 95.6%, rubber 4.4% |
| easy | 24-32 | ice-non-open | 26 | 23.1% | 0.0% | 0.0% | cork 79.5%, rubber 20.5% |
| easy | 33-64 | ice-non-open | 87 | 20.7% | 0.0% | 0.0% | cork 76.0%, rubber 24.0% |
| easy | 65-100 | ice-non-open | 97 | 19.6% | 0.0% | 0.0% | cork 80.6%, rubber 19.4% |
| easy | all | ice-non-open | 361 | 20.5% | 0.0% | 0.0% | cork 80.4%, rubber 19.6% |
| easy | 01-16 | ice-open | 71 | 39.4% | 0.0% | 9.9% | rubber 91.9%, moss 7.6%, stone 0.5% |
| easy | 17-23 | ice-open | 13 | 84.6% | 0.0% | 7.7% | rubber 98.1%, moss 1.5%, spike 0.5% |
| easy | 24-32 | ice-open | 44 | 84.1% | 0.0% | 13.6% | rubber 99.2%, stone 0.4%, moss 0.2%, spike 0.2% |
| easy | 33-64 | ice-open | 154 | 78.6% | 0.0% | 14.3% | rubber 98.0%, moss 1.2%, stone 0.5%, spike 0.2% |
| easy | 65-100 | ice-open | 160 | 76.9% | 0.0% | 15.6% | rubber 98.5%, moss 0.7%, stone 0.4%, spike 0.3% |
| easy | all | ice-open | 442 | 72.4% | 0.0% | 13.8% | rubber 97.4%, moss 2.0%, stone 0.5%, spike 0.2% |
| easy | 01-16 | open | 121 | 64.5% | 0.0% | 5.8% | rubber 94.7%, moss 5.0%, stone 0.3% |
| easy | 17-23 | open | 17 | 88.2% | 0.0% | 5.9% | rubber 98.5%, moss 1.2%, spike 0.4% |
| easy | 24-32 | open | 64 | 89.1% | 0.0% | 9.4% | rubber 99.4%, stone 0.3%, moss 0.2%, spike 0.1% |
| easy | 33-64 | open | 210 | 84.3% | 0.0% | 10.5% | rubber 98.5%, moss 0.9%, stone 0.4%, spike 0.2% |
| easy | 65-100 | open | 225 | 83.6% | 0.0% | 11.1% | rubber 99.0%, moss 0.5%, stone 0.3%, spike 0.2% |
| easy | all | open | 637 | 80.8% | 0.0% | 9.6% | rubber 98.1%, moss 1.4%, stone 0.3%, spike 0.2% |
| easy | 17-23 | puzzle | 128 | 100.0% | 0.0% | 0.0% | rubber 71.4%, cotton 28.6% |
| easy | 24-32 | puzzle | 63 | 98.4% | 0.0% | 0.0% | rubber 75.0%, cotton 24.1%, cork 0.9% |
| easy | 33-64 | puzzle | 247 | 58.3% | 9.3% | 0.0% | rubber 50.8%, cork 24.5%, cotton 24.2%, default 0.5% |
| easy | 65-100 | puzzle | 307 | 66.8% | 6.5% | 0.0% | rubber 55.9%, cotton 24.2%, cork 19.5%, default 0.4% |
| easy | all | puzzle | 745 | 72.3% | 5.8% | 0.0% | rubber 58.1%, cotton 24.8%, cork 16.7%, default 0.3% |
| normal | 01-16 | ice-non-open | 135 | 22.2% | 0.0% | 0.0% | cork 81.2%, rubber 18.8% |
| normal | 17-23 | ice-non-open | 41 | 0.0% | 0.0% | 0.0% | cork 100.0% |
| normal | 24-32 | ice-non-open | 52 | 7.7% | 0.0% | 0.0% | cork 93.8%, rubber 6.2% |
| normal | 33-64 | ice-non-open | 163 | 11.0% | 0.0% | 0.0% | cork 87.9%, rubber 12.1% |
| normal | 65-100 | ice-non-open | 205 | 5.9% | 0.0% | 0.0% | cork 94.5%, rubber 5.5% |
| normal | all | ice-non-open | 596 | 10.7% | 0.0% | 0.0% | cork 90.7%, rubber 9.3% |
| normal | 01-16 | ice-open | 71 | 39.4% | 0.0% | 9.9% | rubber 91.9%, moss 7.6%, stone 0.5% |
| normal | 17-23 | ice-open | 13 | 84.6% | 0.0% | 7.7% | rubber 98.1%, moss 1.5%, spike 0.5% |
| normal | 24-32 | ice-open | 43 | 83.7% | 0.0% | 14.0% | rubber 99.1%, stone 0.5%, moss 0.2%, spike 0.2% |
| normal | 33-64 | ice-open | 157 | 79.6% | 0.0% | 15.3% | rubber 98.4%, moss 0.8%, stone 0.5%, spike 0.2% |
| normal | 65-100 | ice-open | 167 | 78.4% | 0.0% | 15.0% | rubber 98.5%, moss 0.7%, stone 0.6%, spike 0.2% |
| normal | all | ice-open | 451 | 73.4% | 0.0% | 14.0% | rubber 97.5%, moss 1.8%, stone 0.5%, spike 0.2% |
| normal | 01-16 | open | 121 | 64.5% | 0.0% | 5.8% | rubber 94.7%, moss 5.0%, stone 0.3% |
| normal | 17-23 | open | 17 | 88.2% | 0.0% | 5.9% | rubber 98.5%, moss 1.2%, spike 0.4% |
| normal | 24-32 | open | 64 | 89.1% | 0.0% | 9.4% | rubber 99.4%, stone 0.3%, moss 0.2%, spike 0.1% |
| normal | 33-64 | open | 208 | 84.6% | 0.0% | 11.5% | rubber 98.8%, moss 0.6%, stone 0.4%, spike 0.2% |
| normal | 65-100 | open | 224 | 83.9% | 0.0% | 11.2% | rubber 98.9%, moss 0.5%, stone 0.4%, spike 0.2% |
| normal | all | open | 634 | 81.1% | 0.0% | 9.9% | rubber 98.2%, moss 1.3%, stone 0.4%, spike 0.1% |
| normal | 17-23 | puzzle | 128 | 100.0% | 0.0% | 0.0% | rubber 71.4%, cotton 28.6% |
| normal | 24-32 | puzzle | 49 | 98.0% | 0.0% | 0.0% | rubber 74.7%, cotton 24.1%, cork 1.2% |
| normal | 33-64 | puzzle | 221 | 59.3% | 7.2% | 0.0% | rubber 51.5%, cotton 24.3%, cork 23.8%, default 0.4% |
| normal | 65-100 | puzzle | 272 | 66.2% | 5.9% | 0.0% | rubber 55.7%, cotton 24.4%, cork 19.7%, default 0.3% |
| normal | all | puzzle | 670 | 72.7% | 4.8% | 0.0% | rubber 58.3%, cotton 25.0%, cork 16.4%, default 0.3% |

## Puzzle material pattern frequencies

| Level | Range | Puzzle stages | Patterns (share of generated puzzle stages) |
|---|---|---:|---|
| easy | 17-23 | 128 | iceRubber 100.0% |
| easy | 24-32 | 63 | iceSandRubber 28.6%, normalRubber 31.7%, iceRubber 38.1%, iceSandCork 1.6% |
| easy | 33-64 | 247 | normalRubber 18.6%, iceSandCork 17.4%, normalCork 13.0%, iceSandRubber 20.6%, mixedStandard 11.3%, iceRubber 19.0% |
| easy | 65-100 | 307 | iceSandCork 12.4%, normalRubber 21.2%, iceRubber 21.8%, normalCork 14.0%, iceSandRubber 23.8%, mixedStandard 6.8% |
| easy | all | 745 | iceRubber 35.7%, iceSandRubber 19.1%, normalRubber 17.6%, iceSandCork 11.0%, normalCork 10.1%, mixedStandard 6.6% |
| normal | 17-23 | 128 | iceRubber 100.0% |
| normal | 24-32 | 49 | iceSandRubber 30.6%, iceRubber 44.9%, normalRubber 22.4%, iceSandCork 2.0% |
| normal | 33-64 | 221 | normalRubber 18.1%, iceSandCork 17.6%, normalCork 13.1%, iceSandRubber 22.6%, mixedStandard 10.0%, iceRubber 18.6% |
| normal | 65-100 | 272 | iceSandCork 14.0%, normalRubber 22.4%, iceRubber 21.0%, normalCork 13.6%, iceSandRubber 22.8%, mixedStandard 6.3% |
| normal | all | 670 | iceRubber 37.0%, iceSandRubber 19.0%, normalRubber 16.7%, iceSandCork 11.6%, normalCork 9.9%, mixedStandard 5.8% |

## Theme and shape fixed-wall mix

| Level | Theme / shape | Stages | Fixed wall segment mix |
|---|---|---:|---|
| easy | basic/maze | 205 | default 100.0% |
| easy | basic/open | 25 | rubber 100.0% |
| easy | bounce/maze | 97 | default 83.0%, rubber 17.0% |
| easy | bounce/open | 32 | rubber 100.0% |
| easy | careful/maze | 124 | default 87.6%, stone 12.4% |
| easy | careful/open | 31 | rubber 93.4%, stone 6.6% |
| easy | gravityAssist/maze | 118 | cork 100.0% |
| easy | gravityAssist/open | 55 | rubber 100.0% |
| easy | gravityHinder/maze | 136 | cork 100.0% |
| easy | gravityHinder/open | 30 | rubber 100.0% |
| easy | iceAssist/maze | 136 | cork 100.0% |
| easy | iceAssist/open | 97 | rubber 100.0% |
| easy | iceRubber/maze | 74 | rubber 100.0% |
| easy | iceRubber/open | 57 | rubber 100.0% |
| easy | iceSand/maze | 151 | cork 100.0% |
| easy | iceSand/open | 69 | rubber 100.0% |
| easy | puzzle/puzzle | 745 | rubber 58.1%, cotton 24.8%, cork 16.7%, default 0.3% |
| easy | repulsionAssist/maze | 107 | cork 100.0% |
| easy | repulsionAssist/open | 48 | rubber 100.0% |
| easy | repulsionHinder/maze | 134 | cork 100.0% |
| easy | repulsionHinder/open | 30 | rubber 100.0% |
| easy | rest/maze | 153 | default 74.2%, moss 25.8% |
| easy | rest/open | 61 | rubber 86.1%, moss 13.9% |
| easy | sand/maze | 157 | cork 100.0% |
| easy | sand/open | 32 | rubber 100.0% |
| easy | sticky/maze | 138 | default 100.0% |
| easy | sticky/open | 40 | rubber 100.0% |
| easy | trial/maze | 88 | default 93.1%, spike 6.9% |
| easy | trial/open | 30 | rubber 96.7%, spike 3.3% |
| normal | basic/maze | 187 | default 100.0% |
| normal | basic/open | 25 | rubber 100.0% |
| normal | bounce/maze | 72 | default 83.2%, rubber 16.8% |
| normal | bounce/open | 36 | rubber 100.0% |
| normal | careful/maze | 110 | default 87.6%, stone 12.4% |
| normal | careful/open | 35 | rubber 93.4%, stone 6.6% |
| normal | gravityAssist/maze | 103 | cork 100.0% |
| normal | gravityAssist/open | 51 | rubber 100.0% |
| normal | gravityHinder/maze | 120 | cork 100.0% |
| normal | gravityHinder/open | 25 | rubber 100.0% |
| normal | iceAssist/maze | 127 | cork 100.0% |
| normal | iceAssist/open | 98 | rubber 100.0% |
| normal | iceRubber/maze | 64 | rubber 100.0% |
| normal | iceRubber/open | 52 | rubber 100.0% |
| normal | iceSand/maze | 113 | cork 100.0% |
| normal | iceSand/open | 62 | rubber 100.0% |
| normal | puzzle/puzzle | 670 | rubber 58.3%, cotton 25.0%, cork 16.4%, default 0.3% |
| normal | repulsionAssist/maze | 91 | cork 100.0% |
| normal | repulsionAssist/open | 43 | rubber 100.0% |
| normal | repulsionHinder/maze | 129 | cork 100.0% |
| normal | repulsionHinder/open | 27 | rubber 100.0% |
| normal | rest/maze | 139 | default 74.2%, moss 25.8% |
| normal | rest/open | 57 | rubber 86.2%, moss 13.8% |
| normal | sand/maze | 141 | cork 100.0% |
| normal | sand/open | 37 | rubber 100.0% |
| normal | specialFlow/maze | 292 | cork 100.0% |
| normal | specialFlow/open | 28 | rubber 100.0% |
| normal | sticky/maze | 131 | default 100.0% |
| normal | sticky/open | 30 | rubber 100.0% |
| normal | trial/maze | 77 | default 93.1%, spike 6.9% |
| normal | trial/open | 28 | rubber 96.7%, spike 3.3% |

# Progressive wall generation audit

32 seeds × 100 stages × 2 levels, preserving run history. Only stage >=33 with ice/sand/radial or puzzle participates. No game physics was simulated.

| Level | Range | Group | Eligible stages | Original / mixed / accent | No eligible segments | Non-original unchanged | Wall-zero-damage before → after | Stone stages before → after | Spike stages before → after | Minimum-one fallback |
|---|---|---|---:|---|---:|---:|---|---|---|---:|
| easy | 33-64 | all | 758 | 47.6% / 40.0% / 12.4% | 5 | 1 | 44.7% → 22.6% | 1.5% → 39.8% | 1.5% → 7.3% | 31 |
| easy | 33-64 | open | 210 | 50.0% / 39.0% / 11.0% | 0 | 0 | 84.3% → 43.3% | 5.2% → 40.5% | 5.2% → 10.0% | 2 |
| easy | 33-64 | ice-non-open | 87 | 48.3% / 34.5% / 17.2% | 0 | 0 | 20.7% → 12.6% | 0.0% → 49.4% | 0.0% → 10.3% | 0 |
| easy | 33-64 | puzzle | 247 | 46.6% / 39.7% / 13.8% | 5 | 1 | 58.3% → 27.9% | 0.0% → 26.3% | 0.0% → 3.2% | 29 |
| easy | 65-100 | all | 859 | 49.6% / 40.4% / 10.0% | 8 | 2 | 48.0% → 23.5% | 1.0% → 35.4% | 1.9% → 6.1% | 43 |
| easy | 65-100 | open | 225 | 48.4% / 38.7% / 12.9% | 0 | 0 | 83.6% → 40.4% | 4.0% → 37.3% | 7.1% → 11.1% | 5 |
| easy | 65-100 | puzzle | 307 | 48.5% / 44.0% / 7.5% | 8 | 2 | 66.8% → 33.2% | 0.0% → 22.5% | 0.0% → 0.7% | 38 |
| easy | 65-100 | ice-non-open | 97 | 46.4% / 42.3% / 11.3% | 0 | 0 | 19.6% → 9.3% | 0.0% → 50.5% | 0.0% → 8.2% | 0 |
| normal | 33-64 | all | 785 | 42.8% / 40.9% / 16.3% | 5 | 2 | 41.4% → 18.3% | 1.5% → 45.2% | 1.5% → 9.6% | 33 |
| normal | 33-64 | open | 208 | 44.2% / 40.9% / 14.9% | 0 | 0 | 84.6% → 38.0% | 5.8% → 47.6% | 5.8% → 12.5% | 2 |
| normal | 33-64 | ice-non-open | 163 | 46.6% / 37.4% / 16.0% | 0 | 0 | 11.0% → 4.3% | 0.0% → 50.3% | 0.0% → 11.0% | 0 |
| normal | 33-64 | puzzle | 221 | 40.7% / 42.5% / 16.7% | 5 | 2 | 59.3% → 26.2% | 0.0% → 28.1% | 0.0% → 1.8% | 31 |
| normal | 65-100 | all | 904 | 44.7% / 40.7% / 14.6% | 7 | 2 | 42.0% → 18.3% | 1.3% → 40.7% | 1.4% → 7.3% | 44 |
| normal | 65-100 | open | 224 | 43.8% / 37.9% / 18.3% | 0 | 0 | 83.9% → 36.6% | 5.4% → 43.3% | 5.8% → 10.3% | 6 |
| normal | 65-100 | puzzle | 272 | 42.3% / 44.5% / 13.2% | 7 | 2 | 66.2% → 27.9% | 0.0% → 23.2% | 0.0% → 1.5% | 38 |
| normal | 65-100 | ice-non-open | 205 | 44.9% / 42.4% / 12.7% | 0 | 0 | 5.9% → 3.4% | 0.0% → 53.2% | 0.0% → 8.8% | 0 |

The minimum applies to total changed segments, not one of every material. Missing materials are recorded as shortfall. Fixed rectangles may split, so before/after segment counts are not directly comparable as wall lengths.

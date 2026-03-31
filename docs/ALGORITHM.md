# Trending Algorithm

## Bayesian Average Formula

The trending system uses **Bayesian Average** to calculate mod popularity trends. This mathematical approach prevents noise from small sample sizes while genuinely highlighting trending mods.

### Formula

```
score = ((v / (v + m)) × R) + ((m / (v + m)) × C)
```

**Where:**
| Variable | Description | Value |
|----------|-------------|-------|
| `v` | Actual server count (sample size) | Current mod server count |
| `m` | Minimum server threshold (prior weight) | `5` |
| `R` | Actual growth rate | `currentServers - previousServers` |
| `C` | Mean growth rate (prior) | Average growth across all mods |

### Why Bayesian Average?

- **Prevents noise**: Small sample sizes (1-2 servers) are pulled toward the mean
- **Industry standard**: Used by IMDb Top 250, BoardGameGeek
- **Mathematically sound**: Based on Bayesian probability theory
- **Self-correcting**: Automatically adjusts as data volume increases

### Example Calculation

For a mod that grew from **5 → 15 servers** (Δ = +10):

```
meanServerGrowth = 2.5 (average across all mods)
v = 15
m = 5
R = 10
C = 2.5

score = ((15 / (15 + 5)) × 10) + ((5 / (15 + 5)) × 2.5)
score = (0.75 × 10) + (0.25 × 2.5)
score = 7.5 + 0.625
score = 8.125
```

For a mod that grew from **1 → 2 servers** (Δ = +1):

```
v = 2
m = 5
R = 1
C = 2.5

score = ((2 / (2 + 5)) × 1) + ((5 / (2 + 5)) × 2.5)
score = (0.286 × 1) + (0.714 × 2.5)
score = 0.286 + 1.785
score = 2.071
```

**Result**: The mod with genuine community adoption (15 servers) scores **8.1**, while the noisy mod (2 servers) scores only **2.1**.

### Combined Score

The final trending score combines:

```
combinedScore = (bayesianScore × 3) + (playerVelocity × 1)
```

- **70% Bayesian score** (server adoption)
- **30% Player velocity** (activity signal)

### Quality Thresholds

Only mods meeting **both** criteria appear in trending:

| Metric | Minimum |
|--------|---------|
| Servers | `5` |
| Players | `10` |

### Categories

- **Rising**: `combinedScore > 0` (positive growth)
- **Falling**: `combinedScore < 0` (negative growth)
- **New**: Mods not in previous snapshot (meeting quality thresholds)

---

## References

- [Bayesian Statistics](https://en.wikipedia.org/wiki/Bayesian_statistics)
- [Wilson Score Interval](https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Wilson_score_interval)
- [IMDb Top 250 Formula](https://stackoverflow.com/questions/1411199/what-is-a-better-way-to-sort-by-two-values)

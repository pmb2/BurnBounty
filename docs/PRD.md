# BurnBounty PRD (v0.6)

## Product Summary

BurnBounty is a BCH-native collectible card economy where users open packs, collect cards, and optionally burn cards for BCH redemption.

Core player loop:

1. Commit pack purchase
2. Reveal 5 cards
3. Hold, trade, or burn for BCH

## Economy Model (Locked)

### Drift Bands (weekly, x1000 precision)

- Bronze: -3 to +1
- Silver: -2 to +4
- Gold: -1 to +6
- Diamond: +1 to +8

### Per-Card Cap Windows

- Bronze: 0-52 weeks
- Silver: 26-104 weeks
- Gold: 78-182 weeks
- Diamond: 130-260 weeks

### Floor

- Minimum multiplier: 0.40
- Cards never decay below 40% of original face value

### Redemption Formula

```text
weeks = (currentBlockHeight - mintBlockHeight) / 1008
effectiveWeeks = min(weeks, randomCapWeeks)
multiplier = max(0.40, 1 + (weeklyDrift / 1000) * effectiveWeeks)
payout = faceValue * 0.80 * multiplier
```

### Long-Run Bias

- Portfolio-level target drift remains negative on average (house edge stability)
- Target profile: approximately -0.14% weekly average drift across all minted cards

## Series Rules

- Genesis Beta (Series 1): 0.05 BCH, min drift +5
- Founder Edition (Series 2): 0.02 BCH, min drift +1
- Normal: 0.008 BCH

## Pool Risk Controls

- PrizePool contract supports pro-rata payout when reserve is below requested redemption total.
- This prevents insolvency-style hard failures and keeps payouts deterministic.

## UX Requirements

### Game Guide Modal

A thematic modal called **Bounty Hunter Handbook** explains:

1. Decay/growth mechanics
2. 40% floor guarantee
3. Cap windows by rarity
4. Series differences and perks
5. House edge in plain language
6. Practical payout examples

Modal entry points:

- floating question-mark trigger on homepage
- handbook button in bottom navigation

### Card Surface Data

Each card view must display:

- growth/decay rate (% per week)
- cap horizon in years
- redemption utility reminder

## Contract Surface

Required contracts and responsibilities:

- `PackCommit.cash`: commitment + series pricing gate
- `PackReveal.cash`: reveal validation + drift/cap commitment payload checks
- `PrizePool.cash`: reserve control + pro-rata payout support
- `CardRedeemer.cash`: floor-aware fixed-point redemption payout formula

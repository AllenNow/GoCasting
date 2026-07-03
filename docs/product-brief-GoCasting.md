---
title: "GoCasting Product Brief"
status: complete
created: 2026-07-03
updated: 2026-07-03
---

# Product Brief: GoCasting

## Executive Summary

GoCasting is a utility-first mobile app for surf casting anglers that solves the two biggest pain points in the sport: choosing the right gear and knowing when to fish. Unlike social fishing platforms that try to be everything to everyone, GoCasting is a focused, intelligent tool — the "personal surf casting assistant" that helps anglers configure optimal equipment setups, maintain their saltwater gear, and plan outings based on real-time environmental data.

The surf casting equipment market is a niche but passionate segment within a $18.2B global fishing gear industry growing at 6.3% CAGR. There are 219+ fishing apps on iOS alone, yet none specialize in surf casting. Existing apps are social-first (Fishbrain, FishAngler) or navigation-first (Navionics) — nobody is building a purpose-built toolkit for the angler standing on the beach wondering which rod to bring and whether the tide is right.

GoCasting fills this gap as a lean, profitable personal project built in Flutter, targeting English-speaking surf casters globally on both iOS and Android.

## The Problem

Surf casting is uniquely demanding. Unlike freshwater fishing, it requires:

- **Equipment precision**: Rod length (9-14ft), reel size (4000-8000), line type, leader weight, sinker shape, and hook style must all be matched to the target species, beach conditions, and casting distance. Most beginners get this wrong on day one and give up.

- **Hostile environment management**: Saltwater destroys gear. A $300 reel without maintenance becomes a paperweight in one season. Reels lose 40% of their lifespan without regular care. Yet most anglers don't know what maintenance their gear needs or when.

- **Timing complexity**: Success depends on the intersection of tide phase, swell period, wind direction, water temperature, and moon phase. Anglers currently juggle 3-5 separate apps (Surfline, Windy, tide charts, moon calendars) to plan a single outing.

Today's anglers cope by spending hours on YouTube, reading forum threads, and learning through expensive trial-and-error. The 23% annual lapse rate in fishing participation suggests many simply give up.

## The Solution

GoCasting is a tool-first surf casting assistant with three core modules:

**1. Gear Intelligence Engine**
- Input your target species, beach type, and budget → receive a complete equipment configuration (rod + reel + line + leader + rig + bait)
- Smart compatibility checking: prevents mismatched setups before you buy
- Gear comparison with saltwater-specific criteria (corrosion resistance, drag seal quality, casting distance ratings)

**2. Maintenance Tracker**
- Log your gear inventory with purchase dates
- Automatic maintenance schedules based on usage frequency and saltwater exposure
- Push notifications: "Your Penn Battle III has 12 saltwater sessions since last service — rinse and re-grease this week"
- Lifespan estimates and replacement forecasting

**3. Session Planner**
- Single-screen dashboard showing tide predictions, moon phase, and solunar periods for any saved beach
- All data computed offline from pre-loaded harmonic tide tables and astronomical algorithms
- Pre-loaded database of popular surf casting beaches worldwide (user can also pin custom locations via map)
- No internet connection required — works fully offline at remote beaches

## What Makes This Different

**No social features. No feed. No community.** GoCasting is an instrument, not a platform. Open it, get what you need, close it. This is deliberately anti-engagement — the value is in precision, not screen time.

**Fully offline. Zero network dependency.** Every byte of data lives on-device. Tide predictions computed from harmonic constants, moon phases from astronomical algorithms, gear data bundled in the app. Works at the most remote beach with no cell signal. Database updates ship with App Store version releases.

**Surf casting only.** Every feature is purpose-built for shore-based saltwater distance casting. We don't dilute focus across boat fishing, freshwater, fly fishing, or ice fishing.

**Equipment intelligence is the core.** No other fishing app treats gear selection and maintenance as first-class problems. Fishbrain sells gear through a shop; GoCasting helps you choose, maintain, and optimize gear you already own or plan to buy.

## Who This Serves

**Primary: The Progressing Surf Caster**
- 1-5 years of experience, has basic gear but wants to level up
- Age 28-50, male-skewed (though female participation is growing fast)
- Fishes 2-8 times per month during season
- Spends $300-$1500/year on gear
- Pain: "I know I'm doing something wrong with my setup but I don't know what"
- Success: Casts farther, catches more, gear lasts longer

**Secondary: The Gear-Obsessed Optimizer**
- 5+ years of experience, already owns premium equipment
- Wants to maximize performance and gear lifespan
- Pain: "I forgot when I last serviced this reel and now it's grinding"
- Success: Perfect maintenance cadence, data-driven upgrade decisions

## Success Criteria

**User signals:**
- 7-day retention > 35% (above fishing app average of ~20%)
- Gear inventory adoption: >60% of users add at least one item within first week
- Maintenance reminder completion rate > 60%
- App Store rating ≥ 4.6

**Project signals (personal project, no monetization in V1):**
- 5,000 downloads within 6 months of launch
- Positive user feedback validating the tool-first approach
- Foundation laid for future monetization (proven value = willingness to pay later)

## Scope

**V1 — In:**
- Gear configuration wizard (species + conditions → setup recommendation)
- Gear inventory with manual entry
- Maintenance scheduling with push notifications
- Session planner: tide (pre-computed harmonic tables) + moon phase + solunar (all offline algorithms)
- Pre-loaded popular surf casting beach database + custom pin via map
- 100% offline — all data bundled in app, zero network dependency
- Free — no subscription, no ads, no in-app purchases

**V1 — Out:**
- Social features, feeds, community, or catch sharing
- Catch logging / fish diary / personal analytics
- Historical pattern matching or AI performance insights
- Real-time weather, wind, or swell data (requires network)
- Go/no-go scoring (deferred — depends on weather data)
- Affiliate links or any purchase redirection
- Subscription / paywall / monetization of any kind
- GPS tracking or boat navigation
- Species identification (AI photo)
- Real-time chat or messaging
- Hardware integrations (Bluetooth reels, smart rods)
- Chinese/Asian language localization (Phase 2)

## Vision

If GoCasting succeeds, in 2-3 years it becomes the **"essential toolkit that every serious surf caster installs before their first session and opens before every outing."**

Growth path:
1. **Year 1**: Nail the gear intelligence and session planning for surf casting. Build a reputation as "the surf casting app" in English-speaking markets.
2. **Year 2**: Expand gear database depth, add AI-powered personal performance insights (connecting session conditions to outcomes), introduce brand partnerships for early access to new gear reviews.
3. **Year 3**: Localize for Asia-Pacific markets (Chinese, Japanese, Korean) where surf casting participation is booming. Explore hardware partnerships (smart rod sensors for casting distance tracking).

The endgame is a tool so indispensable that gear manufacturers want to be listed in it, and surf casters consider it as essential as their rod holder.

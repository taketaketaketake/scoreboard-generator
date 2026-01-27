# Vision

## What This System Is

An automated sports media pipeline that monitors Detroit-area sports teams, generates scoreboard images after games, and delivers them via MMS.

## Why It Exists

To automate the tedious process of creating and sharing game result graphics for Detroit sports fans. What previously required manual screenshot creation, editing, and posting now happens automatically within minutes of a game ending.

## Core Principles

1. **Automation over manual intervention**
   - The pipeline should run unattended for weeks at a time
   - Human involvement only for configuration changes or error recovery

2. **Reliability over features**
   - A missed game is worse than a missing feature
   - Graceful degradation: if odds fail, still generate the image

3. **Simplicity over cleverness**
   - Straightforward polling over complex event systems
   - JSON files over databases
   - Single process over microservices

4. **Detroit teams first**
   - Lions, Pistons, Tigers, Red Wings
   - Michigan and Michigan State athletics
   - Not a general-purpose sports platform

## Non-Goals

- **Not a live score tracker** - We only care about final scores
- **Not a betting platform** - Odds are informational context only
- **Not a social media manager** - MMS delivery is the output; posting is out of scope
- **Not multi-tenant** - Single recipient, single configuration
- **Not real-time** - Minutes of delay is acceptable

## Design Bias

When in doubt:
- Prefer polling over webhooks
- Prefer files over databases
- Prefer single-process over distributed
- Prefer explicit over magical
- Prefer working over perfect

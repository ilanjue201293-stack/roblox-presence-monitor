# Roblox Presence Monitor

Dashboard for Roblox user **4020848968**. It checks whether the account is in one of these target place/root-place IDs:

- 99567941238278
- 76172769094087
- 90407707718652

When the player enters a target experience, the server sends a Discord notification mentioning user **1056529485861761034**. A Redis key prevents repeated alerts while the player remains in the same server; leaving all target experiences clears the key.

## Deploy to Vercel

Import this repository into Vercel. Add these environment variables in Project Settings:

- `DISCORD_WEBHOOK_URL`: a newly regenerated Discord webhook URL (do not commit it).
- `UPSTASH_REDIS_REST_URL`: Upstash Redis REST URL.
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST token.
- `CRON_SECRET`: a long random secret. Vercel sends it as the bearer token to protect cron invocations.

The included `vercel.json` schedules a check every minute. Vercel Hobby plan cron frequency is limited; a one-minute schedule may require a Pro plan. Confirm the current limits in Vercel's Cron Jobs documentation.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the variables.

## Notes

- The dashboard refreshes every 30 seconds while open.
- Continuous Discord alerts require the Vercel Cron job and Upstash Redis variables.
- Roblox presence responses can identify the current place and root place. The monitor compares both against the supplied IDs.
- Roblox may rate-limit or change the availability of its presence endpoint. The dashboard displays API errors rather than guessing.
- Never expose the Discord webhook URL in client-side code or commit it to Git.
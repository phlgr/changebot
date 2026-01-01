# ChangeBot

Monitor websites for changes and get notified via ntfy.sh. Powered by GitHub Actions and Bun.

## Features

- ✅ Multiple website monitoring
- ✅ Full page or CSS/XPath selector support
- ✅ ntfy.sh notifications with priority and click actions
- ✅ Git-based history tracking
- ✅ Configurable retry logic and timeouts
- ✅ Large content warnings
- ✅ Fork-based template for easy setup

## Quick Start

### 1. Fork this repository
Click "Use this template" to create your own fork.

### 2. Configure ntfy.sh secret
1. Go to your fork → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add:
   - **Name**: `NTFY_TOPIC`
   - **Value**: Your unique topic name (e.g., `my-monitors-abc123`)
   - **Tip**: Generate a random name with: `openssl rand -hex 8`

4. (Optional) For self-hosted ntfy:
   - **Name**: `NTFY_SERVER`
   - **Value**: Your server URL (e.g., `https://ntfy.example.com`)

### 3. Configure websites
Edit `src/config.ts` to add your websites.

### 4. Enable GitHub Actions
- Go to Actions tab
- Click "I understand my workflows, go ahead and enable them"

### 5. (Optional) Customize schedule
Edit cron expression in `.github/workflows/monitor.yml`

### 6. Test manually
Go to Actions tab → "Website Change Detection" → "Run workflow"

## Configuration

Edit `src/config.ts`:

```typescript
import type { Config } from './types.js';

export const config: Config = {
  ntfy: {
    topic: process.env.NTFY_TOPIC ?? '',
    server: process.env.NTFY_SERVER ?? 'https://ntfy.sh',
  },
  settings: {
    timeout: 30000, // Request timeout in ms
    retries: 3, // Retry failed fetches
    large_content_threshold: 1048576, // 1MB warning threshold
    error_notification_threshold: 3, // Only notify after this many consecutive errors
    error_notification_cooldown_ms: 3600000, // 1 hour cooldown between error notifications
  },
  websites: [
    {
      name: 'My Website',
      url: 'https://example.com',
      selector: null, // CSS/XPath selector or null
      enabled: true,
      priority: 'high',
      notifyOnFirstRun: true, // Optional: send notification on initial snapshot
    }
  ]
};
```

### Selectors

- **Full page**: `selector: null`
- **CSS selector**: `selector: "#content"` or `selector: ".price"`
- **XPath selector**: `selector: "xpath=//div[@class='content']"`

### ntfy Priorities

- `urgent` - Critical changes
- `high` - Important changes
- `default` - Normal changes
- `low` - Low priority
- `min` - Minimal priority

## Viewing History

Snapshots are stored in `snapshots/` directory and committed to git.

```bash
# View all commits for a snapshot
git log --follow snapshots/example-com.json

# See diff between two commits
git diff <commit-1> <commit-2> snapshots/example-com.json

# View changes over time
git log --stat snapshots/

# See what changed in last check
git diff HEAD~1 HEAD snapshots/
```

Or use GitHub UI:
- Click on snapshot file
- View history tab
- See inline diffs

## Troubleshooting

### "NTFY_TOPIC environment variable is required"
- Add `NTFY_TOPIC` as a GitHub Secret
- See Quick Start section above

### "Invalid URL"
- Ensure URL includes protocol (http:// or https://)

### Notifications not received
- Check Actions tab for workflow logs
- Verify ntfy.sh topic is correct
- Ensure phone/desktop has ntfy app and is subscribed to topic

### Large content warning
- Consider using a CSS selector to monitor specific section
- Increase `large_content_threshold` in src/config.ts

## Development

```bash
# Install dependencies
bun install

# Run monitoring
bun run src/monitor.ts

# Run monitoring with git commit/push
bun run monitor

# Type checking
bun run lint:types

# Lint code
bun run lint

# Auto-fix linting issues
bun run lint:fix
```

## License

MIT

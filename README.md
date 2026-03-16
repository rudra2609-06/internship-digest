# Internship Digest — Daily Email Automation

Sends you a daily email with web dev internship listings found by Claude's web search.

## Setup (one time, ~10 minutes)

### Step 1 — Upload this project to GitHub
1. Go to github.com → New repository → name it `internship-digest`
2. Upload all these files (drag & drop or use Git)

### Step 2 — Get your Anthropic API key
1. Go to console.anthropic.com
2. API Keys → Create Key → copy it

### Step 3 — Set up Gmail App Password
1. Go to myaccount.google.com → Security
2. Enable 2-Step Verification (if not already)
3. Search "App passwords" → Create one → name it "internship-digest"
4. Copy the 16-character password shown

### Step 4 — Add Secrets to GitHub
1. In your GitHub repo → Settings → Secrets and variables → Actions
2. Add these 4 secrets (click "New repository secret" for each):

| Secret Name          | Value                              |
|----------------------|------------------------------------|
| ANTHROPIC_API_KEY    | Your Anthropic API key             |
| GMAIL_USER           | your.email@gmail.com               |
| GMAIL_APP_PASSWORD   | 16-char app password from Step 3   |
| RECIPIENT_EMAIL      | Email where you want to receive    |

### Step 5 — Test it manually
1. Go to your repo → Actions tab
2. Click "Daily Internship Digest" → "Run workflow" → Run
3. Check your email in ~2 minutes!

## Schedule
Runs automatically every day at **8:00 AM IST**.
To change time, edit the cron in `.github/workflows/daily-digest.yml`.

## Customize searches
Edit the `SEARCH_QUERIES` array in `src/index.js` to change what it searches for.

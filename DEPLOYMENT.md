# Production Deployment Checklist

## Pre-Deployment Steps

### 1. Update Spotify App Settings
- [x] Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- [x] Select your Spotify app
- [x] Click **Settings**
- [x] Under **Redirect URIs**, add:
  ```
  https://unwrapped.oldskilabs.com/spotify-auth
  ```
- [x] Click **Save**

### 2. Generate Production Secrets
- [x] Generate a secure random string for `CRON_SECRET`
  - Use: `openssl rand -base64 32` or an online generator
  - This protects your cron endpoints from unauthorized access

### 3. Prepare Environment Variables
Create a list of the following environment variables to add in Vercel:

```bash
# Public
NEXT_PUBLIC_HOST=https://unwrapped.oldskilabs.com

# Database (Supabase)
DATABASE_URL=postgresql://postgres.kqpjyiwvfaaujdxpcdcf:8x16T2cvUjL10xuE@aws-1-us-east-1.pooler.supabase.com:6543/postgres

# Spotify API Credentials
SPOTIFY_CLIENT_ID=your-client-id-here
SPOTIFY_CLIENT_SECRET=your-client-secret-here
SPOTIFY_REFRESH_TOKEN=will-generate-after-first-deploy

# Cron Security
CRON_SECRET=your-generated-secure-random-string
```

---

## Deployment to Vercel

### 4. Deploy Application
- [x] Push your code to GitHub
  ```bash
  git add .
  git commit -m "Complete Phase 5 - Ready for production"
  git push origin main
  ```
- [x] Connect repository to Vercel (if not already connected)
- [x] Configure Vercel project settings

### 5. Add Environment Variables in Vercel
- [x] Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- [x] Add each environment variable listed in Step 3
- [x] **Important:** Leave `SPOTIFY_REFRESH_TOKEN` empty for now (you'll generate it in the next step)
- [x] Select **Production** environment for all variables
- [x] Click **Save**

### 6. Trigger Initial Deployment
- [x] Go to Vercel Dashboard → Deployments
- [x] Click **Redeploy** (or push a new commit)
- [x] Wait for deployment to complete
- [x] Note your production URL: `https://unwrapped.oldskilabs.com`

---

## Post-Deployment Steps

### 7. Generate Production Spotify Refresh Token
- [x] Visit: `https://unwrapped.oldskilabs.com/spotify-auth`
- [x] Click **Authorize with Spotify**
- [x] Complete Spotify authentication flow
- [x] Copy the `SPOTIFY_REFRESH_TOKEN` displayed on the success page

### 8. Update Spotify Refresh Token in Vercel
- [ ] Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- [ ] Find `SPOTIFY_REFRESH_TOKEN`
- [ ] Click **Edit** and paste the token from Step 7
- [ ] Click **Save**

### 9. Redeploy with Complete Environment
- [ ] Go to Vercel Dashboard → Deployments
- [ ] Click **Redeploy** to apply the new refresh token
- [ ] Wait for deployment to complete

---

## Verification Steps

### 10. Test Core Functionality
- [ ] Visit `https://unwrapped.oldskilabs.com`
- [ ] Verify home page loads correctly
- [ ] Check "Now Playing" widget appears (if Spotify is playing)
- [ ] Test navigation to `/insights`
- [ ] Verify **ExportData component is hidden** in production
- [ ] Check that data loads from database (Calendar Heatmap, Taste Evolution, etc.)

### 11. Test API Endpoints
- [ ] Test `/api/now-playing` - should return current Spotify playback
- [ ] Test `/api/stats/history` - should return listening history from database
- [ ] Test `/api/stats/top-tracks` - should return top tracks
- [ ] Test cron endpoint is protected (should require `CRON_SECRET`)

### 12. Monitor Sync Functionality
- [ ] Verify cron job is set up in Vercel (if using Vercel Cron)
  - Go to **Settings → Cron Jobs**
  - Ensure `/api/cron/sync-history` is scheduled
- [ ] Check that listening history syncs automatically
- [ ] Monitor database in Drizzle Studio or Supabase dashboard

---

## Security Checklist

### 13. Verify Security Measures
- [ ] ✅ ExportData component hidden in production
- [ ] ✅ CRON_SECRET configured for endpoint protection
- [ ] ✅ Database credentials secured in environment variables (not in code)
- [ ] ✅ Spotify credentials secured in environment variables
- [ ] ✅ `.env.local` and `.env.production` listed in `.gitignore`
- [ ] ✅ No sensitive data in git history

### 14. Review Public vs Private Data
- [ ] Confirm all displayed data is YOUR personal Spotify data only
- [ ] No user authentication = single-user application (you)
- [ ] Database contains only your listening history

---

## Troubleshooting

### Common Issues

**Spotify API not working:**
- Verify redirect URI is correctly set in Spotify Dashboard
- Check that refresh token was generated using production URL
- Ensure `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `SPOTIFY_REFRESH_TOKEN` are set

**Database connection issues:**
- Verify `DATABASE_URL` is correct in Vercel environment variables
- Check Supabase dashboard for connection issues
- Ensure IP allowlist in Supabase allows Vercel IPs (or is disabled)

**Cron job not running:**
- Verify `vercel.json` has correct cron schedule
- Check Vercel Cron Jobs dashboard for execution logs
- Ensure `CRON_SECRET` matches between Vercel env vars and cron config

**Data not loading:**
- Check browser console for API errors
- Verify API routes are accessible (check Network tab)
- Ensure database has been seeded with initial data

---

## Rollback Plan

If something goes wrong:
1. [ ] Check Vercel deployment logs for errors
2. [ ] Revert to previous deployment in Vercel Dashboard
3. [ ] Review environment variables for typos
4. [ ] Test locally with production environment variables
5. [ ] Check Supabase dashboard for database issues

---

## Post-Launch Monitoring

### Week 1
- [ ] Monitor daily sync functionality
- [ ] Check database storage usage in Supabase
- [ ] Review Vercel analytics for errors
- [ ] Verify all visualizations render correctly with production data

### Ongoing
- [ ] Set up alerts in Vercel for deployment failures
- [ ] Monitor Supabase for rate limits or quota issues
- [ ] Periodically check Spotify API rate limits
- [ ] Back up database periodically (Supabase has automatic backups)

---

## Future Enhancements (Post-Phase 5)

Ideas for later implementation:
- [ ] Add authentication (NextAuth.js or Clerk) for multi-user support
- [ ] Re-enable ExportData component with authentication
- [ ] Implement user dashboard with personalized data
- [ ] Add social features (share insights, compare with friends)
- [ ] Set up automated database backups
- [ ] Add error tracking (Sentry)
- [ ] Implement analytics (PostHog, Mixpanel)

---

## Notes

- **Single-user app:** This deployment is designed for your personal use only
- **No authentication:** Anyone with the URL can see your listening data
- **Data export disabled:** Prevents unauthorized data extraction in production
- **Database:** Hosted on Supabase (free tier has generous limits)
- **Cron jobs:** Sync runs automatically via Vercel Cron

**Questions?** Review the PROJECT_PLAN.md for feature details or consult Next.js/Vercel documentation.

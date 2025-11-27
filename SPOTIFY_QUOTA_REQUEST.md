# Spotify Extended Quota Mode Request

## Steps to Request

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Select your app (the one you created for Oldski Unwrapped)
4. Look for "Request Extension" or "Request Extended Quota Mode" button
5. Fill out the form with the information below

---

## Request Form - Suggested Responses

### **App Name**
Oldski Unwrapped

### **Description of Your App**
A personal year-round Spotify analytics dashboard that provides immersive visualizations of listening habits with real-time audio feature analysis.

### **Why do you need Extended Quota Mode?**

I'm building a personal Spotify analytics experience called "Oldski Unwrapped" that creates immersive, BPM-synced visualizations of my listening habits throughout the year.

**Current Implementation:**
- Personal dashboard tracking listening history, top tracks, and artists
- 6 full-screen audio visualizers (RetroPixelated, WaveformOscilloscope, RadarCircular, MatrixRain, GridTunnel, SpectrumOrbs)
- GSAP animations synchronized to track BPM
- Dynamic color theming extracted from album artwork
- Historical data tracking with Supabase database

**Why I Need Audio Features Access:**
- To sync visualizer animations to actual track tempo, energy, and danceability
- To create beat-accurate pulse animations in the Now Playing component
- To provide meaningful audio characteristic displays (acousticness, instrumentalness, speechiness)
- To enable dynamic visualizer behavior based on song mood and energy

**Current Limitation:**
Without Extended Quota Mode, I'm using mock audio features (default BPM 120, energy 0.5) which makes visualizations less engaging and not truly responsive to the music.

**Use Case:**
- Strictly personal use (single user - myself)
- Educational project to learn Next.js 14, React Three Fiber, and GSAP
- No commercial purposes
- No data redistribution or sharing
- Respects all Spotify Developer Terms of Service

**Technical Stack:**
Next.js 14, TypeScript, React Three Fiber, GSAP, Supabase, Drizzle ORM

### **Number of Expected Users**
1-5 (Personal use, potentially sharing with close friends/family)

### **Will you be distributing or selling this app?**
No - This is a personal project for my own listening analytics

### **Have you read and agreed to Spotify's Developer Terms of Service?**
Yes

---

## What Happens Next

- **Timeline:** Typically approved within 1-3 business days
- **Notification:** You'll receive an email when your request is reviewed
- **Access:** Once approved, audio features endpoint will work immediately
- **No Cost:** Extended Quota Mode is still free tier

## After Approval

Once approved, update these files:

### 1. Remove Error Suppression
File: `/app/api/now-playing/route.ts`
- Remove try-catch suppression around audio features fetch
- Let real audio features populate

### 2. Test Endpoints
Test that these work without 403 errors:
- `GET https://api.spotify.com/v1/audio-features/{id}`
- `GET https://api.spotify.com/v1/audio-analysis/{id}`

### 3. Verify Visualizers
Check that visualizers respond dynamically to:
- Track BPM (tempo)
- Energy levels
- Danceability
- Valence (mood)

---

## Tips for Success

✅ **DO:**
- Be honest and specific about your use case
- Emphasize it's for personal/educational use
- Mention you respect Spotify's ToS
- Keep user count realistic (1-25 is fine)
- Explain technical implementation

❌ **DON'T:**
- Claim commercial purposes
- Mention selling or distributing data
- Request more quota than needed
- Be vague about your use case
- Suggest violating ToS

---

## Contact Info

If your request is denied, you can:
1. Revise your request with more details
2. Contact Spotify Developer Support at developer@spotify.com
3. Continue using mock audio features as fallback

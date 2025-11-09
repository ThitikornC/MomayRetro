# Momay02
MomayMVP

## Recent fixes (automated)

- Fixed broken preconnect URL in `index.html`.
- Improved service worker behavior: navigation preload, stale-while-revalidate for static assets, and API response caching for calendar/daily-energy/daily-bill.
- Added client-side caching (localStorage) and lazy-initialization for FullCalendar to speed up initial load.
- Added global error handlers (window.error and unhandledrejection) and an in-page error overlay to capture runtime crashes for debugging.

How to test locally:

1. Start local static server in the `Momay02` folder (example using `http-server`):

```powershell
http-server -p 8000
```

2. Open http://localhost:8000 and use DevTools (Application → Service Workers) to confirm the service worker is active.
3. Open the calendar (click Calendar icon) — popup should appear immediately; calendar will initialize lazily.
4. If you see a red error overlay at bottom-right, copy the errors or run `getMomayErrorLogs()` in the Console to retrieve stored logs.

Next steps (recommended):

- Add server-side Cache-Control headers for static assets and API responses.
- Optimize and compress images (WebP) and critical assets.
- Configure a backend logging endpoint to receive captured errors instead of localStorage.


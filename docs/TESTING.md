# 🧪 Testing & QA Documentation

## Manual QA Checklist

### 🟢 Prerequisites

- [ ] npm packages installed: `npm install`
- [ ] Service worker support enabled in browser
- [ ] JavaScript enabled
- [ ] LocalStorage enabled
- [ ] Open http://localhost:8000 (or deployed URL)

---

## 1️⃣ **Location Search Flow**

### Test: German City Search

- [ ] Type "Berlin" in search field
- [ ] Press Enter or click Search button
- [ ] Verify: Current weather displays for Berlin
- [ ] Verify: Coordinates shown (52.52°N, 13.40°E)
- [ ] Verify: Hourly forecast updates
- [ ] Verify: 7-day forecast displays

### Test: English City Search

- [ ] Clear search, type "Munich"
- [ ] Verify: Weather updates correctly
- [ ] Verify: UI language stays same as selected

### Test: Invalid City Input

- [ ] Try searching for "XYZNotACity"
- [ ] Verify: Error message appears
- [ ] Verify: "Try again" button is offered
- [ ] Verify: No crash or blank screen

### Test: Empty Search

- [ ] Click search with empty field
- [ ] Verify: Validation message appears
- [ ] Verify: Previous city data remains

---

## 2️⃣ **Temperature Unit Toggle**

### Test: Celsius to Fahrenheit

- [ ] Current temp shows "20°C"
- [ ] Click temperature unit selector
- [ ] Select "°F"
- [ ] Verify: Current temp changes to "~68°F" (±1)
- [ ] Verify: Hourly forecast temps converted
- [ ] Verify: 7-day forecast temps converted
- [ ] Verify: "feels like" temp converted
- [ ] Verify: Preference saved (reload page, still °F)

### Test: Fahrenheit to Celsius

- [ ] Select "°C"
- [ ] Verify: All temps convert back
- [ ] Verify: Values match original

### Test: Temperature Displayed Everywhere

- [ ] Check current weather card: ✅
- [ ] Check hourly section: ✅
- [ ] Check 7-day forecast: ✅
- [ ] Check alerts/warnings (if applicable): ✅
- [ ] Check historical chart: ✅

---

## 3️⃣ **Wind Unit Toggle**

### Test: m/s to km/h

- [ ] Find wind speed in current conditions (e.g., "5 m/s")
- [ ] Click wind unit selector
- [ ] Select "km/h"
- [ ] Verify: 5 m/s → ~18 km/h (5 \* 3.6)
- [ ] Verify: All hourly forecasts updated
- [ ] Verify: Preference saved

### Test: m/s to mph

- [ ] Select "mph"
- [ ] Verify: 5 m/s → ~11.2 mph (5 \* 2.237)
- [ ] Verify: All components updated

### Test: Wind Unit Conversions Accuracy

- [ ] Record several wind values and manually verify math:
  - [ ] 10 m/s = 36 km/h ✓
  - [ ] 10 m/s = 22.37 mph ✓
  - [ ] 15 m/s = 54 km/h ✓

---

## 4️⃣ **Favorites Management**

### Test: Add to Favorites

- [ ] Search for a city (e.g., "Hamburg")
- [ ] Click "Add to Favorites" / ⭐ button
- [ ] Verify: Star/button changes state
- [ ] Verify: City appears in Favorites list
- [ ] Verify: Favorites persisted after reload

### Test: Remove from Favorites

- [ ] Click favorite city's remove button (❌ or trash icon)
- [ ] Verify: City removed from list
- [ ] Verify: Star/button reverts
- [ ] Verify: Change persisted after reload

### Test: Quick Load from Favorites

- [ ] Add 3 cities to favorites
- [ ] Click one from favorites list
- [ ] Verify: Weather loads quickly (cached)
- [ ] Verify: All data displays (current, hourly, forecast)

### Test: Favorites Survive across Sessions

- [ ] Add favorites
- [ ] Close browser tab/window
- [ ] Reopen http://localhost:8000
- [ ] Verify: Favorites still there

---

## 5️⃣ **Dark Mode Toggle**

### Test: Enable Dark Mode

- [ ] Open app (should default to light mode or system preference)
- [ ] Click Dark Mode toggle (moon/sun icon)
- [ ] Verify: Background turns dark
- [ ] Verify: Text color adjusts to light
- [ ] Verify: All cards/sections have dark background
- [ ] Verify: Contrast still readable

### Test: Disable Dark Mode

- [ ] Click toggle again
- [ ] Verify: Returns to light mode

### Test: Dark Mode Persistence

- [ ] Set to dark mode
- [ ] Reload page
- [ ] Verify: Still dark mode
- [ ] Verify: localStorage shows `wetter_dark_mode: true`

### Test: Contrast in Both Modes

- [ ] Use browser's accessibility inspector or axe
- [ ] Verify: Body text 7:1 contrast minimum (both modes)
- [ ] Verify: Headings 16:1 contrast minimum (both modes)

---

## 6️⃣ **Language Toggle (i18n)**

### Test: Switch to English

- [ ] If in German (default), click Language selector
- [ ] Select "English"
- [ ] Verify: All labels change to English
  - [ ] "Aktuelle Temperatur" → "Current Temperature"
  - [ ] "Vorhersage" → "Forecast"
  - [ ] "Favoriten" → "Favorites"
  - [ ] "Einstellungen" → "Settings"
- [ ] Verify: Preference saved (reload still English)

### Test: Switch to German

- [ ] Select "Deutsch"
- [ ] Verify: All labels in German
- [ ] Verify: Numbers/dates format correctly (German style if applicable)

### Test: Bilingual Content

- [ ] Verify: Error messages translated
- [ ] Verify: Button labels translated
- [ ] Verify: Tooltips translated
- [ ] Verify: Accessibility labels translated (ARIA)

---

## 7️⃣ **Push Notifications**

### Prerequisites for Push Testing

- [ ] Start push server: `npm run push-server`
- [ ] Visit http://localhost:3001/dashboard
- [ ] Note the VAPID public key

### Test: Request Push Permission

- [ ] Click "Enable Notifications" button
- [ ] Browser should request permission dialog
- [ ] Click "Allow"
- [ ] Verify: Success message appears

### Test: Subscribe to Notifications

- [ ] After allowing, verify subscription shown in console or UI
- [ ] Go to http://localhost:3001/dashboard
- [ ] Verify: Your device appears in subscriber list

### Test: Send Test Notification

- [ ] From dashboard, send test notification
- [ ] Verify: Notification appears (even in background)
- [ ] Click notification
- [ ] Verify: App focuses or opens

### Test: Notification Handling

- [ ] Subscribe to notifications
- [ ] Minimize/close browser
- [ ] Send notification from dashboard
- [ ] Verify: System notification appears
- [ ] Verify: Title and message display correctly

### Test: Unsubscribe from Notifications

- [ ] Click "Disable Notifications" button
- [ ] Verify: Subscription removed from dashboard
- [ ] Send test notification
- [ ] Verify: No notification received

---

## 8️⃣ **7-Day Forecast**

### Test: 7 Days Display

- [ ] Search for a city
- [ ] Scroll to forecast section
- [ ] Verify: Shows 7 days of dates
- [ ] Verify: Weather icons for each day
- [ ] Verify: Min/Max temperatures for each day
- [ ] Verify: Units match selected (°C, °F, etc.)

### Test: Hourly Expansion (First 3 Days)

- [ ] For first 3 days, verify expand/collapse button
- [ ] Click day 1 expand
- [ ] Verify: Hourly breakdown shows (00:00, 01:00, ..., 23:00)
- [ ] Verify: Temps, icons, precipitation visible
- [ ] Click again to collapse
- [ ] Verify: Hourly section hides

### Test: Days 4-7 No Hourly

- [ ] Verify: Days 4-7 have NO expand button
- [ ] Only show daily min/max + icon

### Test: Unit Conversion in Forecast

- [ ] Switch temperature to °F
- [ ] Verify: 7-day temps update
- [ ] Switch wind to km/h
- [ ] Verify: Wind speeds in hourly update
- [ ] Switch back to C + m/s
- [ ] Verify: Values match original

---

## 9️⃣ **Maps Integration**

### Test: Map Displays

- [ ] Click "Map" tab or map icon
- [ ] Verify: Leaflet map loads
- [ ] Verify: OSM (OpenStreetMap) tiles visible
- [ ] Verify: Zoom/pan controls work

### Test: Current Location Marker

- [ ] Map should show marker for current city
- [ ] Verify: Marker at correct coordinates
- [ ] Click marker
- [ ] Verify: Popup or tooltip shows city name

### Test: Map Overlays

- [ ] If overlays selector available, try different overlays
- [ ] Verify: Map updates without breaking

---

## 🔟 **Weather Alerts**

### Test: Fetch Alerts

- [ ] App should fetch MeteoAlarm CAP feeds (if region has active alerts)
- [ ] If alerts present: Verify banner appears at top
- [ ] Verify: Alert title and description visible

### Test: Alert Colors

- [ ] If multiple alert severities, verify color-coding:
  - [ ] Red = Warning/Severe
  - [ ] Orange = Moderate
  - [ ] Yellow = Minor

### Test: Close Alerts

- [ ] Click close/X on alert banner
- [ ] Verify: Banner disappears

---

## 1️⃣1️⃣ **Historical Data & Charts**

### Test: Historical Data Loads

- [ ] In settings or chart section, verify historical data fetches
- [ ] Should show last 7-30 days of data
- [ ] Verify: Data points align with dates

### Test: Chart Renders

- [ ] Canvas chart should display
- [ ] Verify: Temperature line visible
- [ ] Verify: Precipitation bars visible
- [ ] Verify: X-axis shows dates
- [ ] Verify: Y-axis shows values

### Test: Chart Interaction

- [ ] Hover over data point
- [ ] Verify: Tooltip shows value + date

---

## 1️⃣2️⃣ **Analytics (Opt-in)**

### Test: Enable/Disable Analytics

- [ ] Go to Settings
- [ ] Toggle "Analytics" switch
- [ ] Verify: Preference saved
- [ ] Search for a city
- [ ] Verify: No console errors
- [ ] Optional: Check localStorage for analytics data

### Test: Analytics Data Export

- [ ] If analytics enabled, look for "Export Data" button
- [ ] Click to export
- [ ] Verify: JSON file downloads with event log

---

## 1️⃣3️⃣ **Offline Mode & Service Worker**

### Prerequisites

- [ ] Open DevTools (F12)
- [ ] Go to Application → Service Workers

### Test: Service Worker Registration

- [ ] Visit app, go to DevTools
- [ ] Verify: Service Worker listed as "activated and running"
- [ ] Note the cache names (e.g., "wetter-cache-v1")

### Test: Offline Access

- [ ] In DevTools Network tab, set to "Offline"
- [ ] Refresh page
- [ ] Verify: Page still loads from cache
- [ ] Verify: Previous weather data still visible
- [ ] Verify: No 404 errors in console

### Test: Cache Population

- [ ] Go back online (DevTools → Network → set to "No throttling")
- [ ] Search for a city
- [ ] Go offline again
- [ ] Search same city
- [ ] Verify: Data loads from cache

### Test: Stale-While-Revalidate

- [ ] Go online
- [ ] Search for new city
- [ ] Open DevTools Network tab
- [ ] Go offline
- [ ] Fetch same city
- [ ] Verify: Data loads immediately (stale)
- [ ] Go back online
- [ ] Verify: New data fetches in background

---

## 1️⃣4️⃣ **Accessibility (WCAG 2.1 AA)**

### Keyboard Navigation

- [ ] Press Tab repeatedly
- [ ] Verify: Focus outline visible on every interactive element
- [ ] Verify: Can reach search, buttons, toggles, favorites
- [ ] Verify: Enter key triggers button actions
- [ ] Verify: Space key toggles checkboxes/switches

### Screen Reader Test (if available)

- [ ] Enable screen reader (NVDA, JAWS, or macOS VoiceOver)
- [ ] Navigate to main content
- [ ] Verify: Headings announced with level (H1, H2, etc.)
- [ ] Verify: Button labels announced
- [ ] Verify: Form inputs announced with labels

### Visual Inspection

- [ ] Check focus indicators: Should have 3px outline
- [ ] Check button sizes: Should be ≥44x44px
- [ ] Check text size: Should be readable (min 14px)
- [ ] Check color contrast:
  - [ ] Headings: 16:1 contrast
  - [ ] Body text: 7:1 contrast
  - [ ] Use: https://webaim.org/resources/contrastchecker/

### Semantic HTML

- [ ] View page source
- [ ] Verify: `<h1>`, `<h2>` used for headings (not `<span>`)
- [ ] Verify: `<button>` elements for buttons
- [ ] Verify: `<a>` for links
- [ ] Verify: `<label>` for form inputs
- [ ] Verify: ARIA roles used appropriately

---

## 1️⃣5️⃣ **Error Handling & Edge Cases**

### Test: Network Timeout

- [ ] DevTools → Network → Throttling: "Slow 3G"
- [ ] Search for city
- [ ] Verify: Loading spinner shows
- [ ] Verify: Request completes or times out gracefully
- [ ] Verify: Error message if timeout

### Test: Invalid Coordinates

- [ ] In browser console: `window.appState.currentCoordinates = { latitude: 999, longitude: 999 }`
- [ ] Search
- [ ] Verify: Validation error or try different coordinates

### Test: API Rate Limiting

- [ ] Rapidly search multiple cities (20+ in 1 minute)
- [ ] Verify: No crashes or infinite loops
- [ ] Verify: Later requests handled gracefully

### Test: LocalStorage Full

- [ ] This is hard to test, but app should gracefully degrade:
- [ ] Verify: App still works if localStorage unavailable (in Safari private mode)

---

## 1️⃣6️⃣ **Cross-Browser Testing**

| Browser | Light Mode | Dark Mode | Mobile | Offline | Notes |
| ------- | ---------- | --------- | ------ | ------- | ----- |
| Chrome  | ✓ / ✗      | ✓ / ✗     | ✓ / ✗  | ✓ / ✗   |       |
| Firefox | ✓ / ✗      | ✓ / ✗     | ✓ / ✗  | ✓ / ✗   |       |
| Safari  | ✓ / ✗      | ✓ / ✗     | ✓ / ✗  | ✓ / ✗   |       |
| Edge    | ✓ / ✗      | ✓ / ✗     | ✓ / ✗  | ✓ / ✗   |       |

---

## 1️⃣7️⃣ **Performance Checklist**

- [ ] First Load: < 3 seconds on decent connection
- [ ] Repeat Load: < 1 second (cached)
- [ ] Weather Update: < 2 seconds
- [ ] Unit Toggle: Instant (<100ms)
- [ ] Dark Mode Toggle: Instant
- [ ] Language Switch: < 500ms

### Measure with DevTools

- [ ] DevTools → Network tab → Reload
- [ ] Check response times for:
  - [ ] index.html
  - [ ] style.css
  - [ ] app.js
  - [ ] API calls (should be < 1.5s each)

---

## 1️⃣8️⃣ **PWA Installation**

### Chrome / Edge

- [ ] Open app in browser
- [ ] Click "Install" button (if shown) or menu → "Install app"
- [ ] Verify: App installs
- [ ] Open from home screen
- [ ] Verify: Launches fullscreen (no address bar)
- [ ] Verify: Works offline

### Firefox

- [ ] Currently limited PWA support, but verify:
- [ ] App works in browser
- [ ] Service Worker active

### Safari (iOS)

- [ ] Open app in Safari
- [ ] Click Share → "Add to Home Screen"
- [ ] Verify: Icon appears on home screen
- [ ] Verify: Launches fullscreen
- [ ] Verify: Works offline

---

## ✅ **Sign-Off**

When all tests pass, fill in:

```
QA Date: ___________
Tester: ____________
Browser/Version: ___________
OS: ___________
Notes: _________________________________

Approved: [ ] All tests passed, app is production-ready
Blocker Issues: [ ] None / [ ] See notes above
```

---

## 🐛 **Bug Reporting Template**

If you find an issue, document it as:

```
Title: [AREA] Specific Issue
Severity: Critical / High / Medium / Low
Reproducible: Yes / No / Sometimes
Steps to Reproduce:
1. ...
2. ...
3. ...

Expected:
Actual:
Screenshots/Video: [if available]
Tested on: [Browser, OS, Version]
```

---

## 🚀 **Automated Testing (CI/CD)**

To run automated tests:

```bash
npm test                 # Run all unit tests
npm run lint            # ESLint code style check
npm run test:watch     # Watch mode for development
```

Tests are run automatically on GitHub pull requests.

---

Generated: 2025-11-15
App Version: 0.2.0
Status: 80% Implementation - QA Ready

# API-Doku

Diese Datei beschreibt die externen API-Integrationen, benötigte Keys und Hinweise, ob ein Account nötig ist.

## Eingebaute APIs (keine Keys nötig)

- **Open-Meteo**: Hauptquelle für Vorhersagen (kein API-Key, gratis). Basis-Endpoint: `https://api.open-meteo.com/v1/forecast`.
- **Nominatim (OpenStreetMap)**: Geocoding für Ortssuche (kein Key, bitte die Nutzungsbedingungen beachten und Requests throttle).

## Optional / zusätzliche APIs (können genauere Vorhersagen, Maps oder historische Daten liefern)

1. **OpenWeatherMap (optional)**

   - Zweck: zusätzliche Forecasts, tile-overlays (Wetterkarten), weitere Parameter.
   - Benötigt Account & API Key (Free tier verfügbar).
   - Registrierung: https://openweathermap.org/ (kostenloses Konto, API Key in Dashboard)

2. **VisualCrossing (optional)**

   - Zweck: historische Wetterdaten & alternative Forecasts (paid/free trial).
   - Registrierung: https://www.visualcrossing.com/

3. **Meteostat (optional)**

   - Zweck: historische Stationsdaten.
   - Registrierung: https://meteostat.net/en/ — einige Endpoints erfordern einen API-Key.

4. **MeteoAlarm / CAP feeds**
   - Zweck: Weather Alerts (regional). Häufig öffentliche Feeds, kein API-Key nötig; Integration per CAP/XML.

## Push Notifications (local dev)

- Für lokale Push-Tests wird ein VAPID-Key-Paar benötigt (public/private). Diese kannst du lokal erzeugen via `web-push` (siehe README).
- Die App versucht, den Public VAPID Key vom lokalen Push-Server (`http://localhost:3030/keys`) zu holen, falls vorhanden.

## Hinweise & Setup

- Wenn du zusätzliche Provider nutzen möchtest (OpenWeatherMap, VisualCrossing, Meteostat), erstelle die entsprechenden Konten und trage die API-Keys in der App-Einstellung `API Keys` ein (wird in den Einstellungen als nächster Schritt verfügbar).
- Ich werde in Kürze ein `README.md` mit Schritt-für-Schritt Setup hinzufügen, inklusive Erzeugen von VAPID-Keys und dem lokalen Push-Server.

## Datenschutz

- Achte bei der Verwendung von Drittanbieter-APIs auf Datenschutzbestimmungen; persönliche Daten (z. B. Standort) sollten mit Einwilligung verarbeitet werden.

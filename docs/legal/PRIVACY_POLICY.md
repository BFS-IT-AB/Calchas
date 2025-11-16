# Datenschutzerklärung

Stand: 15.11.2025

Calchas ist ein reines Lern- und Demonstrationsprojekt. Es werden nur die Daten verarbeitet, die für die angefragten Funktionen unbedingt notwendig sind.

## 1. Verantwortlich

- Projektteam BFS IT (Schulprojekt)
- Kontakt laut `README.md`

## 2. Verarbeitete Daten

| Zweck                   | Daten                         | Speicherort                   | Aufbewahrung                 |
| ----------------------- | ----------------------------- | ----------------------------- | ---------------------------- |
| Wetterabfrage           | Stadt, Koordinaten            | Nur API-Request               | Keine dauerhafte Speicherung |
| Favoriten/Verlauf       | Stadtname, Zeitstempel        | LocalStorage des Browsers     | Bis Nutzer löscht            |
| Push-Benachrichtigungen | Push-Subscription, freiwillig | Browser + lokaler Push-Server | Bis Nutzer kündigt           |
| Analytics (lokal)       | Event-Typ, Timestamp          | LocalStorage                  | Bis Nutzer löscht            |

## 3. Datenquellen / Auftragsverarbeitung

- **Primäre APIs:** Open-Meteo, BrightSky
- **Optionale APIs:** OpenWeatherMap, VisualCrossing, Meteostat (nur wenn Keys hinterlegt sind)
- **Geokodierung:** Nominatim (OpenStreetMap)

Alle Requests laufen direkt vom Client zur jeweiligen API; es existiert kein eigener Backend-Proxy.

## 4. Rechtsgrundlage

Nutzung erfolgt auf freiwilliger Basis (Art. 6 Abs. 1 lit. a DSGVO). Durch Verwendung akzeptieren Sie, dass die oben genannten minimalen Daten verarbeitet werden.

## 5. Betroffenenrechte

Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung. Da keine personenbezogenen Daten serverseitig gespeichert werden, können Sie sämtliche lokal gespeicherten Informationen selbst im Einstellungsdialog löschen (Cache & Verlauf).

## 6. Sicherheit

- HTTPS wird empfohlen (abhängig vom Hosting).
- Lokale Daten bleiben ausschließlich auf Ihrem Gerät.
- API-Keys können optional lokal verschlüsselt werden (Browserfunktionalität).

## 7. Änderungen

Bei funktionalen Erweiterungen kann diese Datenschutzerklärung angepasst werden. Nutzen Sie stets die neueste Version im Repository.

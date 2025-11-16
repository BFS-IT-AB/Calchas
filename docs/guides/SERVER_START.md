# 🚀 Server starten - Anleitung

## Problem gelöst: VS Code Terminal funktioniert jetzt!

Der globale `http-server` Befehl funktioniert nicht im VS Code Terminal. Daher habe ich einen **eigenen Node.js HTTP-Server** erstellt.

---

## ✅ Methode 1: HTTP-Server (Empfohlen)

### Schritt 1: Server starten

Öffne das VS Code Terminal (`` Strg + ` ``) und führe aus:

```powershell
node tools/http-server.js
```

**Output:**

```
🚀 Server läuft auf: http://localhost:8000
📂 Serving: C:\Users\wifel\Desktop\Assets\BFS IT\Projekt\calchas\src
```

### Schritt 2: App öffnen

Öffne im Browser:

```
http://localhost:8000
```

### Schritt 3: Server stoppen

Drücke `Strg + C` im Terminal.

---

## 🔧 Eigener Port?

Falls Port 8000 belegt ist:

```powershell
$env:PORT=8001; node tools/http-server.js
```

Oder kombiniert in einer Zeile:

```powershell
$env:PORT=3000; node tools/http-server.js
```

---

## ⚙️ Alternative: Live Server Extension

### Installation

1. Öffne VS Code Extensions (`Strg + Shift + X`)
2. Suche "Live Server"
3. Installiere "Live Server" von Ritwick Dey
4. Rechtsklick auf `src/index.html` → "Open with Live Server"

**Vorteil:** Automatisches Neuladen bei Dateiänderungen

---

## 🔔 Push-Benachrichtigungen testen

### Schritt 1: Push-Server starten

**In einem separaten Terminal:**

```powershell
node tools/push-server.js
```

**Output:**

```
🔔 Push-Demo-Server läuft auf: http://localhost:3001
📜 VAPID Public Key verfügbar unter: /vapid
```

### Schritt 2: VAPID Key abrufen

Die App holt den VAPID Key **automatisch** beim Start. Du kannst ihn auch manuell abrufen:

```
http://localhost:3001/vapid
```

### Schritt 3: Push-Benachrichtigung testen

1. Öffne die App: `http://localhost:8000`
2. Klicke auf **⚙️ Einstellungen**
3. Aktiviere **🔔 Push-Benachrichtigungen**
4. Der VAPID Key wird automatisch geladen
5. Subscription wird im Local Storage gespeichert

### Schritt 4: Testbenachrichtigung senden

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/send-test" -Method POST
```

---

## 🧪 Testen

### HTTP-Server testen

```powershell
# Server starten
node tools/http-server.js

# In neuem Terminal: Test-Request
Invoke-RestMethod -Uri "http://localhost:8000" -Method GET
```

### Push-Server testen

```powershell
# Push-Server starten
node tools/push-server.js

# In neuem Terminal: VAPID abrufen
Invoke-RestMethod -Uri "http://localhost:3001/vapid" -Method GET
```

---

## 📋 Beide Server gleichzeitig starten

### PowerShell Script (Optional)

Erstelle `start-all.ps1`:

```powershell
# Start HTTP Server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node tools/http-server.js"

# Wait 2 seconds
Start-Sleep -Seconds 2

# Start Push Server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node tools/push-server.js"

# Wait 2 seconds
Start-Sleep -Seconds 2

# Open Browser
Start-Process "http://localhost:8000"
```

**Ausführen:**

```powershell
.\start-all.ps1
```

---

## ❓ Troubleshooting

### Problem: "node: command not found"

**Lösung:** Node.js installieren von https://nodejs.org/

Überprüfen:

```powershell
node --version
```

### Problem: Port already in use (EADDRINUSE)

**Lösung 1:** Anderen Port verwenden

```powershell
$env:PORT=8001; node tools/http-server.js
```

**Lösung 2:** Prozess beenden

```powershell
# Finde Prozess auf Port 8000
Get-NetTCPConnection -LocalPort 8000 | Select-Object OwningProcess -Unique

# Beende Prozess (ID von oben)
Stop-Process -Id <PID> -Force
```

### Problem: CSS/JS werden nicht geladen

**Lösung:** Überprüfe, ob der Server aus dem richtigen Verzeichnis läuft:

```powershell
# Von Projekt-Root ausführen:
node tools/http-server.js
```

### Problem: VAPID Key nicht gefunden

**Lösung 1:** Push-Server läuft nicht → starten:

```powershell
node tools/push-server.js
```

**Lösung 2:** Manuell in Settings eingeben:

1. Öffne `http://localhost:3001/vapid`
2. Kopiere den Key
3. Füge ihn in App-Settings ein

---

## 🎯 Schnellstart-Zusammenfassung

```powershell
# Terminal 1: HTTP-Server
node tools/http-server.js

# Terminal 2 (optional): Push-Server
node tools/push-server.js

# Browser öffnen
# http://localhost:8000
```

**Fertig!** 🎉 Die App läuft jetzt lokal.

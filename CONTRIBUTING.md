# 🤝 Contributing zu Calchas

Danke dass du zu Calchas beitragen möchtest! Hier ist unser Workflow:

## 🔄 Contribution Workflow

1. **Fork das Repository**
   ```bash
   gh repo fork BFS-IT-AB/calchas --clone
   ```
2. **Erstelle einen Feature-Branch**
   ```bash
   git checkout -b feature/dein-feature-name
   ```
3. **Mache deine Changes**
   - Code schreiben
   - Testen (offline-mode, verschiedene Browser)
4. **Committen mit Conventional Commits**
   ```bash
   git commit -m "feat: add light mode toggle"
   git commit -m "fix: service worker caching issue"
   ```
5. **Push & Pull Request erstellen**

   ```bash
   git push origin feature/dein-feature-name
   ```

   - Gehe zu GitHub und erstelle einen Pull Request gegen main.

## Review-Prozess

- Core-Team wird automatisch benachrichtigt (Discord)
- Mindestens 2 Approvals nötig
- Diskussion im PR oder auf Discord
- Änderungen umsetzen falls nötig

## Merge

- Nach Approval merged ein Core-Team-Mitglied
- Branch wird automatisch gelöscht

## Weitere Hinweise

- Nutze die PR-Vorlage und fülle alle relevanten Abschnitte aus.
- Eröffne ein Issue oder diskutiere im Team, falls du unsicher bist.

## 💻 Lokales Setup

```bash
git clone https://github.com/BFS-IT-AB/calchas.git
cd calchas
npm install
npm run version-sync
# Öffne index.html im Browser
```

Alternativ kannst du auch ein Tool wie z.B. "Live Server" (VS Code Extension) nutzen, um die App mit automatischem Reload lokal zu testen.

```

## 📋 Code Style

- ES6+ JavaScript (const/let, arrow functions)
- Kommentare bei komplexer Logik
- Keine localStorage in Service Worker (Sandbox!)
- Design System CSS-Variablen nutzen

## 🐛 Bugs melden

Nutze GitHub Issues mit Template oder melde es auf Discord (#bugs).

## 💬 Fragen?

Discord Server: https://discord.com/invite/KaeDPazvck

## Code of Conduct

Wir erwarten einen respektvollen und konstruktiven Umgang miteinander.
Siehe [CODE_OF_CONDUCT.md]. 
```

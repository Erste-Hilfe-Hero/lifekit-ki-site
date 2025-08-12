
# LifeKit – Erste Hilfe & Notfall-Tools (mit KI, PWA, Legal, Consent)

## Schnellanleitung (funktioniert sicher bei Vercel)
1) **GitHub-Repo anlegen** und diesen Ordner hochladen (alle Dateien).
2) **Vercel > New Project > Import Git Repository** → Deploy.
3) Fertig. Die Seite läuft unter `…vercel.app`.

### Werbung aktivieren
- Öffne `src/App.tsx` und ersetze die `AdSlot`-Platzhalter mit deinem Werbe-Code (z. B. AdSense).
- Consent-Banner ist aktiv. Lade Ads ggf. erst bei Einwilligung.

### KI-Tab
- Im Tab „KI“ einen OpenAI-kompatiblen **API-Key** eintragen (lokal gespeichert).
- **Quellen prüfen** → **Entwurf erzeugen** → **Diff** ansehen → mit **PIN** veröffentlichen.

### Rechtliches
- `public/impressum.html` und `public/datenschutz.html` mit deinen Daten ausfüllen.
- `public/robots.txt` und `public/sitemap.xml` Domain anpassen.

## Lokal starten (optional)
1) Node.js 18+ installieren
2) `npm install`
3) `npm run dev`

## Warum kein TS-Fehler mehr?
- Build-Script nutzt **nur** `vite build` (kein separates `tsc -b`), daher kein TS18003.
- `tsconfig.json` nutzt `include: ["src/**/*"]` (findet alle Dateien).

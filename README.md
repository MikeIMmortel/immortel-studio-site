# Immortel Studio

Statische site voor Immortel Studio — meubels op maat en productontwerp door Mike van de Mortel.

## Structuur

```
/
├── index.html              # Hoofdpagina
├── style.css               # Stylesheet (één bestand)
├── app.js                  # Naamanimatie, scroll reveal, projectgrid, lightbox
├── projects.json           # Bron voor het "Werk"-blok (meubelprojecten)
├── CNAME                   # Custom domain voor GitHub Pages
├── images/                 # Alle foto's
│   └── lab/                # Projectfoto's voor het Projecten-blok
├── voeljefoto/index.html   # Subpagina: VoelJeFoto
├── f-dock/index.html       # Subpagina: F-Dock
└── panelmaker/index.html   # Subpagina: Panel Maker
```

## Lokaal draaien

Geen build-stap nodig — het is puur HTML/CSS/JS. Een eenvoudige statische server volstaat:

```bash
python3 -m http.server 8123
# open http://localhost:8123
```

## Deploy via GitHub Pages

1. Maak een nieuwe GitHub-repo aan (bijv. `immortel-studio-site`).
2. Push deze code naar de `main`-branch.
3. In de repo: **Settings → Pages → Source: Deploy from branch → `main` / root**.
4. **Custom domain** staat al in het `CNAME`-bestand: `immortel.studio`.
5. Zet **Enforce HTTPS** aan (Let's Encrypt, gratis).

## DNS-instellingen (bij je domein-registrar)

Voor het apex domein `immortel.studio`:

| Type  | Name | Value             |
|-------|------|-------------------|
| A     | @    | 185.199.108.153   |
| A     | @    | 185.199.109.153   |
| A     | @    | 185.199.110.153   |
| A     | @    | 185.199.111.153   |
| CNAME | www  | `<username>.github.io` |

Vervang `<username>` door je GitHub-gebruikersnaam. DNS-propagatie duurt soms tot 24 uur.

## Content wijzigen

- **Teksten / structuur**: `index.html` en de drie subpagina's.
- **Meubelprojecten (Werk)**: `projects.json` — voeg een entry toe en plaats foto's in `images/<slug>/`.
- **Foto's**: plaats nieuwe afbeeldingen in `images/` en verwijs ernaar vanuit HTML/JSON.
- **Styling**: alles in `style.css` (CSS-variabelen bovenaan voor kleuren / type).

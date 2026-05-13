# PUKiB.pl — strona internetowa

Statyczna strona dla **PUKiB Sp. z o.o.** — wynajem kontenerów i wywóz odpadów na Śląsku.
Zaprojektowana do hostowania na **GitHub Pages** lub dowolnym statycznym serwerze.

---

## Struktura — tylko 2 strony

```
pukib/
├── index.html           # Wszystko poza zamówieniem: hero, usługi, o firmie,
│                        # dla biznesu, FAQ, FB, kontakt — jedna płynna
│                        # strona z anchor-nawigacją (#o-nas, #biznes, #kontakt)
│
├── cennik.html          # Cennik 2026 + formularz zamówienia z animowaną
│                        # mini-wizualizacją kontenera obok formularza —
│                        # gdy wybierasz rozmiar, kontener się zmienia w skali
│                        # z sylwetką człowieka 1,80 m dla porównania
│
├── css/
│   ├── style.css        # Design tokens, header, footer, buttons, page-hero, marquee
│   ├── home.css         # Hero split, services, about-compact, FB feed, locations
│   └── pages.css        # Cennik, formularz, mini-viz, audience, kontakt-team
│
├── js/
│   └── main.js          # Mobile menu, scroll reveal, FAQ accordion (FIXED),
│                        # form recalc, container size → visualization sync
│
└── assets/
    ├── img/             # logo (transparent bg), truck, postery
    ├── posters/         # poster frames dla video w hero
    └── videos/          # hero.mp4 (drone — Mercedes Atego)
```

---

## Co zostało zrobione w v3 (wg feedbacku)

### Logo
Wycięte czystym algorytmem: zostają **tylko piksele wystarczająco czerwone** (R>110, G<90, B<90, R znacznie dominuje) **+ czarne shading przylegające do czerwieni** (3D efekt). Reszta — transparent. Bez szarych obrysów.

### Struktura — tylko 2 strony
- **index.html** zawiera wszystko poza zamówieniem: hero, 3 usługi, o firmie (zwięzły paragraf + zdjęcie ciężarówki), dla biznesu (6 typów klientów), FAQ (4 pytania), FB feed, kontakt (zespół + 2 lokalizacje na Google Maps). Każda treść w **jednym miejscu** — bez powtórzeń.
- **cennik.html** ma cennik + formularz zamówienia z **animowaną mini-wizualizacją** kontenera obok formularza. Strefy transportu są tu (a nie na home — bo ich miejsce jest przy zamawianiu).

### Wizualizacja kontenera w cenniku
- 2D widok z boku (side elevation), skala 1:38, kompaktowy (360×210 viewBox), umieszczony w sticky sidebarze obok podsumowania
- Sylwetka człowieka **1,80 m** stała, kontener animuje się przy zmianie rozmiaru
- Smooth fade transition (0.4s) między 7 / 10 / 36 m³
- Wymiary z czerwonymi mono-labelkami, stencil "PUKiB.pl" + badge "97" na boku
- Background grid jak na rysunku architektonicznym
- Klikasz size button w formularzu → kontener obok się zmienia w skali

### Facebook integracja
W sekcji FB jest **Facebook Page Plugin iframe** (oficjalny, darmowy widget od FB), który wyświetla najnowsze posty z timeline.

**Ważna uwaga:** Page Plugin działa tylko dla **Facebook Pages** (stron firmowych), **nie dla profili osobowych** (URL `/people/...`). Aktualny URL `facebook.com/people/PUKiB-Sp-zoo/61550223431423/` wskazuje na profil osobowy. Jeśli posty się nie pokazują:

1. **Przekonwertuj profil na Page** — w ustawieniach FB → "Utwórz stronę z profilu"
2. Po konwersji zaktualizuj URL w `index.html` (sekcja `<!-- FB Page Plugin -->`)
3. Posty zaczną się ładować automatycznie

Alternatywnie, jeśli profil nie może zostać przekonwertowany — iframe pokaże nagłówek profilu z przyciskiem "Otwórz profil" (graceful fallback).

---

## Dane firmy

```
PUKiB Sp. z o.o.
Siedziba: ul. Chudoby 4/1, 44-100 Gliwice
Baza:     ul. Dębina 16, 44-335 Jastrzębie-Zdrój
NIP: 631 262 02 53 · KRS: 0003645589 · BDO: 000011532

Tel:    503 759 504 (Przemysław Pilorz, Dyr. Handlowy)
        515 829 174 (Artur Obszański, Logistyk)
        780 069 290 (Przemysław Ostałowski, Logistyk)
        502 195 472 (Jakub Jasiurkowski, Logistyk)
        601 407 116 (Aneta Jasiurkowska, Faktury · BDO)

E-mail: kontenery@pukib.pl · dyspozytor@pukib.pl · bok@pukib.pl
FB:     facebook.com/people/PUKiB-Sp-zoo/61550223431423/
```

---

## Lokalne uruchomienie

```bash
cd pukib
python3 -m http.server 8000
# otwórz http://localhost:8000
```

W produkcji (GitHub Pages, Netlify, Vercel) wszystko zadziała — fonty Google, mapy Google, FB Page Plugin (jeśli jest Page).

---

## Deploy na GitHub Pages

1. Wgraj zawartość katalogu `pukib/` do repo na GitHub
2. Settings → Pages → Branch: `main`, folder `/` (root)
3. Po kilku minutach strona pod `https://<user>.github.io/<repo>/`

Dla domeny `pukib.pl` — w Settings → Pages → Custom domain wpisać domenę i ustawić rekordy A/CNAME u rejestratora.

---

## Stack

- **HTML5** semantyczny
- **CSS3** custom properties, grid, clamp(), aspect-ratio
- **Vanilla JS** ~220 linii, bez frameworka i bundlera
- **Fonty Google**: Big Shoulders Display (display), Archivo (body), JetBrains Mono (technical labels)
- **Brak zależności**, brak builda, brak node_modules — czysty static site

Paleta: czerwony `#dc2626`, czarny `#0a0a0a`, kremowy `#f4f1ea`, zielony kontenerowy `#4d8c2f`.

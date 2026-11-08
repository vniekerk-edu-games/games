# The Camper Vans SA – static site mock-up

Plain HTML, CSS and JavaScript. No build step, no server-side code, no database.
Leaflet (the map library) is bundled in `vendor/`, so the only outside requests are Google Fonts and OpenStreetMap map tiles.

## Run it locally
The site reads `data/campsites.csv`, so it must be served over HTTP (double-clicking `index.html` won't work):

    python -m http.server 8000      # then open http://localhost:8000

## Put it online
**GitHub Pages:** push this folder to a repo → Settings → Pages → deploy from the `main` branch, root folder.
**Netlify:** drag the folder onto app.netlify.com/drop, or connect the repo. Publish directory: the repo root, no build command.

## Add a campsite
1. Add a row to `data/campsites.csv`. Newest at the top (the "Latest addition" banner uses the first row).
2. Create `campsites/<slug>/` where `<slug>` is the value in the `slug` column (lowercase, hyphens).
3. Drop photos in as `1.webp`, `2.webp`, `3.webp`… (up to 12; `.jpg` also works). `1` is the card thumbnail; all of them appear in the carousel. The site tries `.webp` first, then `.jpg`.

That's it. The cards, filters, map pins and detail page are all generated from the CSV.

## CSV columns
`name, slug, town, region, highlights, remember, spots, features, website, lat, lon`

* `features` is a comma-separated list using exactly the names in the icon legend:
  Cycling, Kids Play Area, Rowing, Electricity, Pet Friendly, Shop available, Alternative Accommodation,
  Private Ablutions, Swimming, Fishing, Private Sites, Swimming Pool, Hiking Trails, Restaurant, 4 x 4
* Text fields can contain commas, quotes and blank lines (blank line = new paragraph) as long as the field is wrapped in quotes, which Excel and Google Sheets do automatically when exporting CSV.
* `town` isn't in the Google Form, so I filled it in from your current index page.
* `region` decides which coloured group a campsite appears in on the home page. My first guess is in the CSV; edit any cell. Allowed values are the five names in `REGIONS` at the top of `app.js` (add or rename areas there; colours come from the logo).

## Adding a new feature icon
Save a 128×128 PNG (black on transparent) in `assets/icons/`, then add one line to the `FEATURES` list at the top of `app.js`. Icons are applied as CSS masks, so they recolour automatically.

## Placeholder photos
Only Kruistementvlei, 22 Watervalle (`1.jpg`) and Groot Breede are your real photos. The other 26 `1.jpg` files are small crops from your index screenshot so the page doesn't look empty. They are `.jpg`; add a `1.webp` alongside and it takes over. `22-watervalle/2.jpg` is a crop from your page screenshot, there only to demonstrate the carousel.

## Files
    index.html        home: latest feature, filter tiles, search, area groups, map, about
    campsite.html     detail page, opened as campsite.html?id=<slug>
    style.css         all styling
    app.js            CSV loader, filters, carousel, maps
    data/campsites.csv
    campsites/<slug>/1.jpg, 2.jpg …
    assets/           logo, backgrounds, icons/
    vendor/leaflet/   map library

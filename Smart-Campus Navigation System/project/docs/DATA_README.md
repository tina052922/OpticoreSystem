# Campus location data

Structured JSON files live in `src/app/data/json/`:

- `buildings.json`
- `rooms.json`
- `offices.json`
- `facilities.json` (includes comfort rooms, `type: "cr"`)
- `landmarks.json`

They are merged in `src/app/data/placesCatalog.ts` for fast client-side search.

The source PDF is:

- `project/docs/CTU_Smart_Campus_Navigation.pdf`

If you install Python and a PDF text library (for example `pypdf`), you can extract tables or text from the PDF and merge them into the JSON files. The current JSON records preserve map coordinates from the interactive SVG workflow and are intended to be edited as the official PDF is digitized.

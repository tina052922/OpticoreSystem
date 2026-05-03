## Organize images into the correct folders

Your JSON expects images to be served from `public/images/...` using URLs like:

- `/images/buildings/COTEBuilding1.jpg`
- `/images/rooms/ITLab1.jpg`
- `/images/offices/SAO.jpg`
- `/images/facilities/CR.jpg`

### One-command organizer (Windows PowerShell)

1. Recommended: place your images in:

`src/assets/images/Images/`

2. Run (no args needed):

```powershell
cd "c:\Smart-Campus Navigation System"
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\organize-images.ps1
```

### Optional: use any other source folder

If your images are in another folder (example: `D:\CTU-Converted-Images\`), run:

`D:\CTU-Converted-Images\`

```powershell
cd "c:\Smart-Campus Navigation System"
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\organize-images.ps1 -SourceDir "D:\CTU-Converted-Images"
```

This script will:
- Copy files into the exact expected `public/images/...` subfolders
- Match names case-insensitively
- Try common extensions if the JSON says `.jpg` but your file is `.png`, etc.
- Print any missing URLs it could not find

### Verify quickly

After starting the dev server (`npm run dev`), open:

- `http://localhost:5173/images/buildings/COTEBuilding1.jpg`


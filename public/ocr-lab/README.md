# Mobile OCR lab — experimental

This is a **standalone, browser-only proof of concept**. Nothing is integrated into the normal Cube Companion navigation, draft simulator, cube publication or database.

## Try from a phone on the same Wi-Fi as your PC

1. Get the experiment branch in a separate Git worktree to avoid touching your normal working copy:
   - `git fetch origin experiment/mobile-ocr-scanner`
   - `git worktree add ../CubeCompanion-OCR-test origin/experiment/mobile-ocr-scanner`
   - `cd ../CubeCompanion-OCR-test`
2. Run `npm install`, then `npm run dev -- --host 0.0.0.0`.
3. Find your PC's LAN IPv4 address with `ipconfig` in Windows PowerShell.
4. On the phone, on the same Wi-Fi, open `http://PC-LAN-IP:5173/ocr-lab/index.html` (replace PC-LAN-IP with the actual IPv4 address). If Windows Firewall asks, allow Node on the private network.
5. Choose Camera or Gallery, select **one overhead image of the card stacks**, and run Analyze.
6. Note card matches vs. the real deck, OCR time and resolution. You can download a small JSON file containing only Oracle IDs and performance metrics.

## Important limitations

- The scanner uses a static copy of 463 cards from cube snapshot `e7f1eb468b44ab0c86324fdaa671f02eec0d968015c7f3a26dfc0dabc599b0fe`. It does not recognize basic lands or cards not in this snapshot.
- OCR is tentative. Cards with obscured names, complex title treatments or lines spanning multiple card columns may be missed or falsely recognized. We deliberately report *possible* matches rather than silently storing data.
- No photo is uploaded or persisted. The selected image is processed by Tesseract.js in a browser Web Worker, and its temporary image URLs/canvas live only in the browser session. Results are not synchronized or saved server-side.
- On first use, the proof of concept fetches Tesseract.js 6.0.1, its OCR worker, WebAssembly engine and English language files from jsDelivr. This can involve a substantial download and requires internet access.
- **Local development only:** the deployed site's strict Content Security Policy intentionally blocks external OCR code. Do not relax the main app's CSP for this experiment. If this approach proves useful, vendor/bundle pinned OCR assets separately and load them only for the scanner.
- This prototype uses **one photo**. No login, cloud DB, win rates or player history is involved.

## What to record from initial tests

For each shot, note how many card names actually appear, how many are correctly matched, false positives, skipped cards, phone type, image size and OCR seconds. These help decide whether a browser-only OCR implementation is viable and how much CPU/memory it needs.

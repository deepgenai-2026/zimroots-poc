# ZimRoots – GitHub Pages proof of concept

This export is safe for a public demonstration: all 71 profiles, 110 connections, personal attributes and archive examples are fictional and generated independently from the private family network.

## Publish to GitHub Pages

1. Create a GitHub repository, for example **zimroots-poc**. This bundle contains no real family data.
2. Extract this ZIP and upload **all its files directly to the repository root** (including index.html, app.js, styles.css, family_data.json and .nojekyll).
3. In GitHub open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**; select **main** and **/(root)**; then Save.
5. Wait for the Pages build to finish. Open the URL GitHub shows under Settings → Pages (usually https://YOUR_USERNAME.github.io/zimroots-poc/).

The source uses relative paths, so GitHub Pages can serve it from a repository subpath without a JavaScript build step.

## Local preview

From this directory, run `python -m http.server 8000` and open `http://localhost:8000/`. Opening index.html directly with file:// may block loading family_data.json.

## Scope and limitations

- **No real identity verification, user registration, database, consent management or messaging.** These are visual demonstrations only.
- Dragging nodes is interactive but positions reset when reloaded.
- `zimroots.co.zw` shown in the interface is an **illustrative address**, not configured to route to this site.
- GitHub Pages is public-facing even when its source repository may be private. Do not upload the separate private backup ZIP into this repository.

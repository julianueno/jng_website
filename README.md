# julianueno.xyz

Personal site of Júlia Nueno Guitart: a timeline of work with connections and curated paths between projects.

It's plain HTML, CSS and JavaScript with no build step, framework or dependencies.

```
index.html   page structure and the About text
data.js      ALL content: entries, lanes, paths  ← the file you edit
app.js       timeline, paths, card, list
styles.css   look
images/      project images
CNAME        tells GitHub Pages which domain to serve
```

## Editing content

Everything is in `data.js`. The comment at the top of the file explains each field.

- **Add a project:** copy an entry, give it a new `id`, set `lane` and `t` (decimal year, so 2024.5 is mid-2024).
- **Add an image:** put it in `images/` (JPG/WebP, around 1600px wide, under 400 KB) and set `img: 'images/<file>'`. Until then the card shows a placeholder with the `imgNote` text.
- **Connect two projects:** add one id to the other's `rel`. Connections are made two-way automatically.
- **Make a path:** add `{ id, label, ids: [...] }` to `paths`, with entry ids in reading order.
- **Ongoing work:** give it an `end` and it draws as a bar (see `thesis`).

Each entry has its own link, for example `julianueno.xyz/#w/humviol`.

## Preview locally

Open `index.html` in a browser, or run `python3 -m http.server` in this folder and go to http://localhost:8000.

## Publish on GitHub Pages

1. Create a public repository on GitHub, for example `julianueno/julianueno.xyz`, and push these files to the `main` branch.
2. In the repo, go to **Settings → Pages** and set **Source: Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
3. After a minute the site is live at `https://julianueno.github.io/<repo-name>/`. Check it there before moving the domain.

## Move the domain from Cargo

The `CNAME` file already contains `julianueno.xyz`.

1. **Find where the domain is registered.** It may be at a registrar such as Namecheap, Gandi or GoDaddy, or bought through Cargo. If Cargo is the registrar, you either manage DNS from Cargo's domain settings or transfer the domain out to a registrar first.
2. **(Recommended) Verify the domain with GitHub.** Go to your GitHub account **Settings → Pages → Add a domain** and add the TXT record it gives you. This stops anyone else's repo from claiming the domain.
3. **Change the DNS records** at the registrar. Remove the old Cargo records for `@` and `www`, then add:

   | Type  | Host | Value |
   |-------|------|-------|
   | A     | @    | 185.199.108.153 |
   | A     | @    | 185.199.109.153 |
   | A     | @    | 185.199.110.153 |
   | A     | @    | 185.199.111.153 |
   | AAAA  | @    | 2606:50c0:8000::153 |
   | AAAA  | @    | 2606:50c0:8001::153 |
   | AAAA  | @    | 2606:50c0:8002::153 |
   | AAAA  | @    | 2606:50c0:8003::153 |
   | CNAME | www  | julianueno.github.io |

   Check these against GitHub's docs ("Managing a custom domain for your GitHub Pages site") in case they've changed.
4. **Set the domain on the repo.** In the repo's **Settings → Pages → Custom domain**, enter `julianueno.xyz` and save. Once the DNS check passes, which can take a few minutes to a few hours, tick **Enforce HTTPS**.
5. **Disconnect the domain from the Cargo site,** so Cargo stops expecting it. Keep the Cargo site until the new one is live, and use it as an archive if you want.

## Things to fill in

- `[EMAIL]` in `index.html` (About section)
- Images for each entry
- Short texts for entries that only say "Essay." or "Book."
- `t` values: years come from the old site, but months are approximate for most projects

# Publishing Blue Mold: Containment on Google Play (Trusted Web Activity)

The game is a PWA at **https://kkruk93-ux.github.io/blue-mold/game/**. On Android it is wrapped as a
**Trusted Web Activity (TWA)** with Google's **Bubblewrap** CLI – the Android app opens the PWA full-screen,
without browser UI, as long as the site proves (Digital Asset Links) that it belongs to the app.

Nothing in this folder is published to GitHub Pages. **Never commit the signing key or its passwords.**

Official docs (checked October 2026):
- TWA for web developers: https://developer.chrome.com/docs/android/trusted-web-activity/android-for-web-devs
- Bubblewrap CLI: https://github.com/GoogleChromeLabs/bubblewrap/tree/main/packages/cli
- Digital Asset Links / TWA verification: https://developer.chrome.com/docs/android/trusted-web-activity/integration-guide
- Create a developer account (personal, one-time 25 USD, identity verification): https://support.google.com/googleplay/android-developer/answer/6112435 and https://support.google.com/googleplay/android-developer/answer/13628312
- New personal accounts – closed test with at least 12 testers for 14 days before production: https://support.google.com/googleplay/android-developer/answer/14151465
- Target API level requirements (new apps/updates must target the current required level – Android 16 / API 36 from 31 Aug 2026): https://support.google.com/googleplay/android-developer/answer/11926878
- Data safety form: https://support.google.com/googleplay/android-developer/answer/10787469
- Content rating (IARC questionnaire): https://support.google.com/googleplay/android-developer/answer/9859655
- Store listing assets (icon 512×512, feature graphic 1024×500, screenshots): https://support.google.com/googleplay/android-developer/answer/9866151
- Play App Signing: https://support.google.com/googleplay/android-developer/answer/9842756

## 0. Before you start

1. The PR with the `docs/` folder is merged and **Settings → Pages → Source = GitHub Actions** is set, so
   `https://kkruk93-ux.github.io/blue-mold/game/manifest.webmanifest` loads.
2. Check the PWA in Chrome DevTools → Application → Manifest (no errors, maskable icon OK) and Lighthouse.
3. Install: Node.js LTS, then `npm i -g @bubblewrap/cli`. On first run Bubblewrap offers to download a JDK and the Android SDK – accept.

## 1. Create the Android project (on your own computer, outside this repo)

```bash
mkdir bluemold-twa && cd bluemold-twa
bubblewrap init --manifest=https://kkruk93-ux.github.io/blue-mold/game/manifest.webmanifest
```
Suggested answers:
- Domain: `kkruk93-ux.github.io` · URL path: `/blue-mold/game/`
- Application name: `Blue Mold: Containment` · Short name: `Containment`
- Application ID (package): `io.github.kkruk93ux.bluemold.containment` (cannot be changed after publishing)
- Version code `1`, version name `1.0.0`
- Display mode: `standalone` · Orientation: `portrait` · Status bar colour `#22262A` · Splash colour `#EEEADF`
- Icon / maskable icon: the URLs from the manifest (`icons/icon-512.png`, `icons/maskable-512.png`)
- Fallback: `customtabs` · Location delegation: **no** · Play Billing: **no** (v1.0 has no purchases)
- Signing key: let Bubblewrap **create a new keystore** (e.g. `android.keystore`, alias `upload`).
  Keep the keystore and both passwords in a password manager + an offline backup. **Do not put it in git.**

Then check the generated `app/build.gradle`: `targetSdkVersion` must be at least the level Play currently requires
(API 36 for new apps from 31 Aug 2026). If it is lower, run `bubblewrap update` with the newest CLI, or raise
`targetSdkVersion`/`compileSdkVersion` to 36 and rebuild.

```bash
bubblewrap build      # → app-release-bundle.aab (upload this) and app-release-signed.apk (for local testing)
```

## 2. Digital Asset Links (removes the browser address bar)

Android looks for `https://kkruk93-ux.github.io/.well-known/assetlinks.json` – at the **root of the domain**,
not inside `/blue-mold/`. A project site cannot serve that path, so:

1. Create a public repo named exactly **`kkruk93-ux.github.io`** (user site). Add an empty file **`.nojekyll`**
   (otherwise Jekyll skips the `.well-known` folder) and `.well-known/assetlinks.json` – template:
   [`assetlinks.example.json`](assetlinks.example.json). Enable Pages for that repo (branch `main`, root).
   This does not affect the `/blue-mold/` project site.
2. Put **both** SHA-256 fingerprints in it:
   - your upload key: `bubblewrap fingerprint add <SHA256>` / `keytool -list -v -keystore android.keystore`
   - the **Play App Signing** key: Play Console → your app → Test and release → App integrity → App signing (available after the first upload).
3. Verify: https://developers.google.com/digital-asset-links/tools/generator or
   `adb shell pm get-app-links io.github.kkruk93ux.bluemold.containment`.
   If the address bar is still visible in the installed app, a fingerprint is missing.

(Alternative: a custom domain for the site – then `assetlinks.json` goes to that domain's `/.well-known/`.)

## 3. Play Console

1. Developer account: personal, 25 USD one-time, identity verification (links above). The developer name can be a
   brand (e.g. "Rovi Here"), but Play shows the account holder's legal name, country and developer e-mail publicly
   (more details, such as the address, once you monetise) – read answer/13628312 before signing up.
2. **Create app** → name `Blue Mold: Containment`, Game, Free, accept declarations.
3. **App content** (Policy section):
   - Privacy policy: `https://kkruk93-ux.github.io/blue-mold/game/privacy.html`
   - Ads: **No** · App access: all features available without login
   - Content rating: fill in the IARC questionnaire honestly (category Game/Puzzle; no violence/blood, no gambling, no user communication, no purchases)
   - Target audience: 13+ (recommended for the horror theme; avoids the Families programme)
   - **Data safety: "No data collected" and "No data shared"** – progress is kept only on the device; nothing is sent anywhere
   - Government apps: no · Financial features: none · Health: none
4. **Store listing**: texts and graphics from [`../store/listing.md`](../store/listing.md) (icon, feature graphic, ≥2 phone screenshots).
5. **Testing**:
   - Internal testing: upload the `.aab`, install on your phone, check full-screen (no URL bar), offline mode, back button.
   - **Closed testing**: new personal accounts must run a closed test with **at least 12 testers opted in for 14 continuous days**
     before they can apply for production access. Collect tester e-mails (or a Google Group), share the opt-in link.
6. After 14 days: Dashboard → **Apply for production** → answer the questions → production release.

## 4. Updates

- Content changes (levels, text, art) only need a push to `main` – the TWA always loads the live site.
  **Bump `CACHE` in `docs/game/sw.js`** so players get the new files.
- Android-side changes (icon, name, target API): bump `appVersionCode` in `twa-manifest.json`, `bubblewrap update`, `bubblewrap build`, upload the new `.aab`.

## 5. Later: "full case files" one-time unlock (not implemented)

`docs/game/js/levels.js` → `CONFIG.freeLevels: 5`, `fullUnlocked: true`, `unlockId: "full_case_files"`.
To sell case files 6–12 later: set `fullUnlocked: false`, add Play Billing through the **Digital Goods API +
Payment Request API** (Bubblewrap `twa-manifest.json` → `"playBilling": {"enabled": true}`), and pass the entitlement
to `isAvailable()`. Requirements: a Google Payments merchant profile linked to Play Console, a one-time product in the
Console, working Digital Asset Links, and a small backend that **acknowledges each purchase within 3 days** (otherwise
Google refunds it). Check the Play Billing Library version the TWA helper bundles (https://developer.android.com/google/play/billing/deprecation-faq).
Turning on monetisation also changes what Play shows publicly about the developer account (see answer/13628312) and
requires updating the store listing ("In-app purchases"), the Data safety form and the privacy policy.

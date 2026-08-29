# Taurus Project Control — Android V25

This is the Android application for the live Taurus Project Control website:

`https://taurusprojectcontrol.vercel.app`

The app loads the live Vercel deployment and applies the Taurus V25 dark mobile interface after login. Website data and feature changes therefore appear automatically; no new APK is required for normal Vercel/Supabase content changes. A new APK is needed only when changing native Android behavior or the V25 app theme.

## Upload to GitHub and download the APK

1. Create a new empty GitHub repository, for example `taurus-project-control-android`.
2. Upload **the contents of this folder** to the root of that repository. The repository root should show `app`, `.github`, `build.gradle`, and `settings.gradle`. The workflow can also locate this complete Android project inside an uploaded ZIP.
3. Open the repository's **Actions** tab.
4. Select **Build Taurus V25 Android APK**.
5. Click **Run workflow**, then **Run workflow** again.
6. Wait for the green check mark, open the completed workflow run, and download the artifact named **Taurus-Project-Control-V25-Android**.
7. Unzip the downloaded artifact and install `Taurus-Project-Control-V25.apk` on the Android phone.

Android may ask you to allow installation from your browser or file manager because this APK is installed outside Google Play. The GitHub-built APK is a debug-signed APK suitable for direct personal/internal installation.

## Website address

The address is defined once in:

`app/src/main/java/com/taurus/projectcontrol/MainActivity.java`

Change `START_URL` only if your Vercel/custom domain changes, then build a new APK.

## Included behavior

- Live website updates without rebuilding the app
- Supabase login session and cookies
- File selection/upload from the phone
- Excel/PDF and other website downloads through Android Download Manager
- Pull down to refresh
- Android back-button web navigation
- External telephone, email, messaging, and non-web links
- HTTPS-only network policy
- Taurus launcher icon and branded system bars
- V25 dark dashboard with branded header, 2×2 KPI cards, progress panel, project status, and bottom navigation

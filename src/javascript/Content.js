/**
 * Centralized personal content for the portfolio.
 * Edit this file to update name, bio, contact info, achievements and projects
 * without touching any of the 3D/World code.
 */
export default {
    profile: {
        name: 'Salah AbuShamseih',
        tagline: 'Flutter · Web · Odoo ERP Developer',
        bio: 'Versatile software developer specializing in website creation and mobile development with Flutter, powered by scalable backends like Supabase and Firebase. I also lead and implement tailored ERP Odoo solutions to streamline complex business operations.',
        email: 'salahshadi2005@gmail.com',
        social: {
            instagram: 'https://www.instagram.com/salah.abushamseih/',
            github: 'https://github.com/Salahianoo',
            linkedin: 'https://www.linkedin.com/in/salah-abushamseih-aa1864305/'
        }
    },

    // Shown on the university building in the information section
    education: {
        institution: 'The Hashemite University',
        degree: 'Computer Engineer'
    },

    // TODO: replace with your real achievements/certifications
    achievements: [
        { title: 'Flutter Development', subtitle: 'Cross-platform mobile apps' },
        { title: 'Odoo ERP', subtitle: 'Tailored business solutions' },
        { title: 'Supabase & Firebase', subtitle: 'Scalable backends' },
        { title: 'Web Development', subtitle: 'Full-stack websites' }
    ],

    /**
     * TODO: replace with your real projects.
     *
     * `images` are the screenshots shown on the boards you drive past. Drop the
     * files in `static/images/projects/` and reference them from the site root,
     * e.g. '/images/projects/my-app-1.png'. One board is created per image, so
     * three entries gives three boards.
     *
     * The board is 1.72:1 — 1600x930 fits exactly, 16:9 is near enough. Leave
     * `images` empty and a generated placeholder slide is used instead.
     *
     * `link` is where the floor pad sends people when clicked. A project's
     * floor pad has three possible states, decided by `link` and `status`:
     *   - `link` set        -> clickable "OPEN" pad, opens that URL
     *   - `link` empty, `status` set   -> a plain text label (e.g. "COMING
     *     SOON"), not clickable — for something real but not live yet
     *   - both empty         -> no pad and no label at all — for entries with
     *     nothing to send anyone to (client/internal work)
     * There is no fallback link any more: a project with no `link` no longer
     * silently opens the GitHub profile.
     */
    projects: [
        {
            name: 'Mood',
            // Trimmed hard from the written subtitle: this renders as a single
            // unwrapped line on the floor, so roughly 70 characters is the
            // ceiling before it runs off the label. The full version lives in
            // `caseStudy` below.
            description: 'Offline-first SaaS for a PS5 lounge & café. Flutter, Riverpod, Hive.',
            // The app itself isn't public — it was sold to one venue — so the
            // link points at that venue's real-world location instead of a
            // store listing. linkLabel swaps the default "OPEN" for wording
            // that matches: this is somewhere to visit, not something to
            // install.
            link: 'https://www.google.com/maps/place/Mood+playstation/@31.8826775,35.9335109,128m/data=!3m1!1e3!4m6!3m5!1s0x151b59f9bb0ec86d:0x808d4cbaf487c109!8m2!3d31.8826375!4d35.9338281!16s%2Fg%2F11srrlh__h?hl=en-JO&entry=ttu&g_ep=EgoyMDI2MDgxMC4wIKXMDSoASAFQAw%3D%3D',
            linkLabel: 'CHECK OUT THE STORE',
            status: 'SOLD TO THE STORE',
            images: ['/images/projects/Mood-portfolio-1600x930.png'],
            // Not rendered anywhere yet — kept for the planned per-project
            // pages. Nothing reads this field today.
            caseStudy: 'Mood is a full offline operations system for a PlayStation gaming lounge and its attached coffee shop, built solo end-to-end — product decisions, UI, and the offline data layer. Staff run the whole venue from one Android tablet with no internet dependency: PS5 rooms bill by the second from a persisted timestamp (never a fragile in-memory timer, so a killed app never loses time), a "waiting for a friend" mode lets a table open and sell drinks before billing starts, and the café POS is stock-linked — selling an item decrements inventory automatically and reverses cleanly if removed. The shift-accounting layer goes beyond "cash collected": every product tracks cost price against sale price, so the end-of-shift summary separates revenue from actual profit, with a running log of non-resale operational expenses (supplies) netted in too. Every closed bill gets a permanent sequential number, shared across both floors, and stays in a 48-hour lookback archive after its shift closes — with confirm-gated delete for corrections. Built in Flutter with Riverpod for state and Hive for fully offline, on-device persistence — no backend, no signal required on site.'
        },
        {
            name: 'Qisma',
            // Kept short on purpose — this renders as a single unwrapped line
            // on the floor beside the boards
            description: 'AI-powered bill splitting & money tracking.',
            link: 'https://play.google.com/store/apps/details?id=com.salah.qisma',
            images: ['/images/projects/qisma-1.png']
        },
        {
            name: 'LoopFruit',
            description: 'Fast, colourful memory game. 7 modes, daily challenge.',
            link: 'https://play.google.com/store/apps/details?id=com.salah.loopfruit',
            images: ['/images/projects/loopfruit-1.png']
        },
        {
            name: 'Adatuna',
            description: 'Arab heritage, curated. Arabic-first, RTL native.',
            link: '',
            status: 'COMING SOON',
            images: ['/images/projects/adatuna-1.png']
        },
        {
            name: 'Exam Vault',
            // Trimmed hard from the written material: single unwrapped line on
            // the floor, ~70 characters is the ceiling. The full write-up
            // (architecture, feature list, the overlay/rename problem it
            // solves) lives in `caseStudy` below.
            description: 'Arabic/RTL exam-paper library. Flutter app + React admin dashboard.',
            link: '',
            status: 'COMING SOON',
            images: ['/images/projects/exam-vault-portfolio.png'],
            // Not rendered anywhere yet — kept for the planned per-project
            // pages, same as Mood's. Nothing reads this field today.
            caseStudy: 'Exam Vault (خزنة الامتحانات) is a two-part system for distributing past exam papers at Hashemite University. Students use a Flutter app built entirely in Arabic and right-to-left: they drill down from a section (compulsory, elective, remedial) to a subject to an exam type — midterm, final, screens, or suggested questions — and read the PDF in an embedded viewer or download it for offline use, with favourites and recently-viewed papers kept on the device and a global search that jumps straight to any subject. Cached lists render before the network responds, so the app never opens to a blank screen or a spinner. Staff use a React + TypeScript dashboard that writes everything the app reads: they upload PDFs by drag-and-drop and create or rename sections, subjects, and exam types on the fly, all of which appear in students\' hands without an app-store release. Writes are restricted to a named admin allowlist enforced by server-side security rules; reads stay public, because open access is the point of the product. Both apps talk to the same Firebase project (Auth, Firestore, Storage, Hosting) — no backend service to deploy, patch, or pay for. The interesting problem: the mobile app ships with its subject lists compiled into the binary, so anything an admin adds has to reach students who are still running an older build — solved by layering the admin\'s data as Firestore overlays on top of the app\'s built-in defaults, with the built-ins acting as the offline fallback. The subtler problem was renaming: every uploaded file is keyed by its subject name, so a naive rename would orphan hundreds of PDFs, or worse, silently empty the subject for every user who hadn\'t updated yet — solved by separating each record\'s immutable storage key from its display label, so renaming changes only what\'s shown, files never move, and older builds keep working untouched.'
        },
        {
            // No link and no status: client/internal work with nothing public
            // to send a visitor to, so no floor pad at all
            name: 'Odoo ERP',
            description: 'Custom ERP implementations for business operations.',
            link: '',
            images: ['/images/projects/odoo_hero_1600x930.png']
        },
        {
            // TODO: rename if this module has a proper name — the card carries
            // no title, so this one is inferred from the artwork
            name: 'Odoo Sales & Inventory',
            description: 'Supply chain & inventory with live telemetry.',
            link: '',
            images: ['/images/projects/odoo-warehouse.png']
        },
        {
            // TODO: rename if this module has a proper name — the card carries
            // no title, so this one is inferred from the artwork
            name: 'Odoo HR',
            description: 'Time-off requests, approvals & org structure.',
            link: '',
            images: ['/images/projects/hr_hero_1600x930.png']
        }

        // Placeholder removed — was 'Web Platform', a generic stand-in with no
        // real screenshots or link. Re-add a real entry here (with an `images`
        // array) for an actual web project; copy the shape of the entries
        // above. Leaving this out changes nothing else: the category signposts
        // in ProjectsSection.js only cover indices 0-2 and 3-5, so removing the
        // trailing 7th entry doesn't shift either group.
    ]
}

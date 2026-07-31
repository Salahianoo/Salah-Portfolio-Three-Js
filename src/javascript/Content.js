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
            name: 'Qisma',
            // Kept short on purpose — this renders as a single unwrapped line
            // on the floor beside the boards
            description: 'AI-powered bill splitting & money tracking.',
            link: '',
            status: 'COMING SOON',
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

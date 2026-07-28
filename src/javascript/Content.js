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
     * `link` is where the OPEN pad on the floor sends people; empty falls back
     * to the GitHub profile in `profile.social`.
     */
    projects: [
        {
            name: 'Qisma',
            // Kept short on purpose — this renders as a single unwrapped line
            // on the floor beside the boards
            description: 'AI-powered bill splitting & money tracking.',
            link: '',
            images: ['/images/projects/qisma-1.png']
        },
        {
            name: 'LoopFruit',
            description: 'Fast, colourful memory game. 7 modes, daily challenge.',
            link: '',
            images: ['/images/projects/loopfruit-1.png']
        },
        {
            name: 'Adatuna',
            description: 'Arab heritage, curated. Arabic-first, RTL native.',
            link: '',
            images: ['/images/projects/adatuna-1.png']
        },
        {
            name: 'Odoo ERP',
            description: 'Custom ERP implementations for business operations.',
            link: '',
            images: ['/images/projects/odoo_hero_1600x930.png']
        },
        {
            // TODO: rename if this module has a proper name — the card carries
            // no title, so this one is inferred from the artwork
            name: 'Odoo Warehouse',
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
        },
        {
            name: 'Web Platform',
            description: 'Web application powered by a Supabase/Firebase backend.',
            link: '',
            images: []
        }
    ]
}

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
            github: 'https://github.com/Salahianoo',
            linkedin: 'https://www.linkedin.com/in/salah-abushamseih-aa1864305/'
        }
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
            name: 'Flutter Mobile App',
            description: 'Cross-platform mobile application built with Flutter.',
            link: '',
            images: []
        },
        {
            name: 'Odoo ERP Solution',
            description: 'Custom ERP implementation streamlining business operations.',
            link: '',
            images: []
        },
        {
            name: 'Web Platform',
            description: 'Web application powered by a Supabase/Firebase backend.',
            link: '',
            images: []
        }
    ]
}

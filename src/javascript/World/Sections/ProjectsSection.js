import * as THREE from 'three'
import Project from './Project'
import gsap from 'gsap'
import { createTextTexture, createTextImageDataURL, wrapLines } from '../../Utils/TextTexture.js'
import { createSignpost } from '../../Utils/Props.js'
import Content from '../../Content.js'

export default class ProjectsSection
{
    constructor(_options)
    {
        // Options
        this.time = _options.time
        this.resources = _options.resources
        this.camera = _options.camera
        this.passes = _options.passes
        this.objects = _options.objects
        this.areas = _options.areas
        this.zones = _options.zones
        this.tiles = _options.tiles
        this.debug = _options.debug
        this.x = _options.x
        this.y = _options.y

        // Debug
        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder('projects')
            this.debugFolder.open()
        }

        // Set up
        this.items = []

        // Spacing between consecutive projects. The tile path between two of
        // them runs from x + projectHalfWidth to x + interDistance -
        // projectHalfWidth, so under twice the half width (12) there is no
        // room for tiles and none are laid.
        //
        // The floor panel is 16 wide, so at 16 the panels abutted and a pad on
        // one project sat right against its neighbour's. 20 leaves four units
        // of clear ground between panels.
        this.interDistance = 20
        // Tighter spacing used only between two projects in the same category
        // group (see setLayout), so the Odoo modules read as one row of work
        // rather than three separate stops.
        //
        // What limits it is the floor text, not the boards: each project paints
        // its own name and caption starting 4.72 left of its centre, and the
        // widest Odoo one (Odoo ERP) ends 3.67 right of it. At 11 that leaves
        // about 2.6 units of clear floor between one caption and the next; at 10
        // they all but meet. Below 12 the connecting tile path above has
        // nowhere to go and simply lays no tiles, which is what a cluster this
        // close wants anyway.
        this.tightInterDistance = 11
        this.positionRandomess = 4
        this.projectHalfWidth = 6

        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false
        this.container.updateMatrix()

        this.setGeometries()
        this.setMeshes()
        this.setLayout()
        this.setList()
        this.setZone()

        // Add all project from the list
        for(const _options of this.list)
        {
            this.add(_options)
        }

        this.setCategorySignposts()
    }

    /**
     * Precomputes every project's x position and the category groups they
     * belong to, before any Project is actually built. Two projects in the
     * same group sit `tightInterDistance` apart instead of `interDistance`,
     * so e.g. the three Odoo modules read as one cluster.
     *
     * Doing this analytically up front — rather than accumulating a running
     * x inside `add()` — means `setZone()` can size its trigger volume off the
     * real last position instead of assuming uniform spacing.
     */
    setLayout()
    {
        // `tight: true` pulls that group's own members closer together; groups
        // without it keep the default spacing. Only ERP SYSTEMS was asked to
        // cluster tighter — MOBILE APPS stays at the original spacing.
        this.categoryGroups = [
            { text: 'MOBILE APPS', start: 0, count: 4 },
            { text: 'WEB DEVELOPMENT', start: 4, count: 1 },
            { text: 'ERP SYSTEMS', start: 5, count: 3, tight: true }
        ]

        const inGroup = (_index, _group) => _index >= _group.start && _index < _group.start + _group.count

        this.positions = []
        let cursor = this.x

        // How far a project's row of boards reaches either side of its centre.
        // Mirrors Project.boards.xInter (5) and the board plane's width
        // (4.671); the projects are not built yet, so they cannot be asked.
        const rowReach = (_project) =>
        {
            const count = Math.max(1, (_project.images || []).length)
            return (count - 1) * 5 * 0.5 + 4.671 * 0.5
        }

        // Clear ground kept between the edge of one row of boards and the next
        const boardClearance = 4

        for(let i = 0; i < Content.projects.length; i++)
        {
            if(i > 0)
            {
                const sameGroup = this.categoryGroups.find((_group) => inGroup(i - 1, _group) && inGroup(i, _group))
                const spacing = (sameGroup && sameGroup.tight) ? this.tightInterDistance : this.interDistance

                // A fixed spacing only works while rows are short. Two
                // four-board rows side by side (Mood then Aiodyx) reach 9.8 each
                // way, so at 20 apart their end boards all but touched. The gap
                // grows just enough to keep them clear; short rows are unchanged.
                const needed = rowReach(Content.projects[i - 1]) + rowReach(Content.projects[i]) + boardClearance
                cursor += Math.max(spacing, needed)
            }

            this.positions.push(cursor)
        }
    }

    /**
     * Replicas of the crossroads fingerposts, one per run of related projects,
     * so a visitor driving in knows what they are looking at.
     *
     * Each group in `categoryGroups` (see setLayout) names a slice of the
     * project list by start index and length — extend a `count` when a
     * category gains a project, and the sign re-centres itself on whatever it
     * covers.
     */
    setCategorySignposts()
    {
        this.signposts = {}
        this.signposts.items = []

        for(const _group of this.categoryGroups)
        {
            const covered = this.items.slice(_group.start, _group.start + _group.count)
            if(covered.length === 0)
            {
                continue
            }

            // Centred on the group in x. It has to stand clear of the board row
            // in y rather than on it: with an odd number of projects the
            // centroid lands exactly on the middle project's board. The OPEN
            // pads reach to project.y - 6.5, so -9 clears those too.
            let x = covered.reduce((_total, _project) => _total + _project.x, 0) / covered.length
            const y = covered.reduce((_total, _project) => _total + _project.y, 0) / covered.length - 9

            // An odd-sized group centres on its middle project, which stands
            // the post squarely in front of that project's floor pads — with
            // MOBILE APPS at five projects, the pole was cutting across
            // LoopFruit's PLAY STORE pad. Slide it into the gap between the
            // middle project and the next one instead, so it always stands on
            // empty ground between two of them.
            const middle = _group.start + Math.floor(_group.count / 2)
            const next = middle + 1

            if(_group.count % 2 === 1 && next < _group.start + _group.count)
            {
                x += (this.positions[next] - this.positions[middle]) * 0.5
            }

            // A group of one has no neighbour inside it to slide toward, so the
            // rule above leaves the post standing on that project's pad — which
            // is exactly where WEB DEVELOPMENT landed, covering Aiodyx's OPEN.
            // It goes in the gap before the project instead. The board's arrow
            // points toward +x, so from there it points across at the project
            // it names.
            else if(_group.count === 1)
            {
                const previous = this.positions[_group.start - 1]
                x = typeof previous === 'undefined'
                    ? x - this.interDistance * 0.5
                    : (previous + this.positions[_group.start]) * 0.5
            }

            const options = createSignpost(_group.text)
            options.offset.x += x
            options.offset.y += y
            this.objects.add(options)

            this.signposts.items.push({ text: _group.text, x, y })
        }
    }

    setGeometries()
    {
        this.geometries = {}
        this.geometries.floor = new THREE.PlaneGeometry(16, 8)
    }

    setMeshes()
    {
        this.meshes = {}

        // this.meshes.boardStructure = this.objects.getConvertedMesh(this.resources.items.projectsBoardStructure.scene.children, { floorShadowTexture: this.resources.items.projectsBoardStructureFloorShadowTexture })
        this.resources.items.areaOpenTexture.magFilter = THREE.NearestFilter
        this.resources.items.areaOpenTexture.minFilter = THREE.LinearFilter
        this.meshes.boardPlane = this.resources.items.projectsBoardPlane.scene.children[0]
        this.meshes.areaLabel = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.5), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, alphaMap: this.resources.items.areaOpenTexture }))
        this.meshes.areaLabel.matrixAutoUpdate = false
    }

    setList()
    {
        // Built from Content.js. A project that lists `images` gets those on its
        // boards; one that does not falls back to generated placeholder slides,
        // so the section still reads before any screenshots exist.
        //
        // One board is created per image, so the array length sets how many
        // boards a project has. The board plane is 4.671 x 2.714, i.e. 1.72:1 —
        // 1600x930 fits it exactly, and 16:9 is close enough not to notice.
        const slideColors = ['#2b6cb0', '#2c7a7b', '#6b46c1', '#3182ce', '#4c51bf']

        this.list = Content.projects.map((_project, _index) =>
        {
            const color = slideColors[_index % slideColors.length]

            const imageSources = _project.images && _project.images.length > 0
                ? _project.images
                : ['Overview', 'Details', 'Tech stack'].map((_label) => createTextImageDataURL(
                    [
                        { text: _project.name, x: 40, y: 100, fontSize: 62, fontWeight: 900 },
                        { text: _label, x: 40, y: 178, fontSize: 34, fontWeight: 400, color: '#dddddd' }
                    ],
                    { width: 1600, height: 930, background: color }
                ))

            // Inset from the left edge. The label plane is 16 units wide, so a
            // texture x of 20 put the text at project.x - 7.69 — out past where
            // the connecting tile path ends (project.x - projectHalfWidth), and
            // the first characters were being covered by a tile. 210 brings it
            // in to project.x - 4.72, clear of the path.
            // maxWidth leaves ~20px of margin inside the 1024-wide canvas from
            // the x inset. It is a guard, not the layout: descriptions are meant
            // to be short enough not to reach it, but an over-long one now
            // condenses to fit instead of silently running off the label.
            //
            // A caption too long for one line wraps onto a second, 30px below
            // (see wrapLines). There is room for it: the nearest thing painted
            // underneath is a stacked status label, down at canvas y ~307.
            const descriptionLines = wrapLines(_project.description, { maxWidth: 790, fontSize: 22, fontWeight: 400 })

            const floorTexture = createTextTexture(
                [
                    { text: _project.name, x: 210, y: 60, fontSize: 44, fontWeight: 900, maxWidth: 790 },
                    ...descriptionLines.map((_line, _index) => (
                        { text: _line, x: 214, y: 120 + _index * 30, fontSize: 22, fontWeight: 400, color: '#999999', maxWidth: 790 }
                    ))
                ],
                { width: 1024, height: 512 }
            )

            // Every destination a project has, normalised to one shape. A
            // project may declare `links: [{ href, label, mark }]` for something
            // on more than one store (LoopFruit), or the original single
            // `link` / `linkLabel` / `linkMark` / `linkLabelScale` set, or
            // neither. `label` swaps the default baked "OPEN" texture for custom
            // text, `mark` stands a store logo on the pad beside it, and
            // `labelScale` draws that text larger than usual.
            //
            // `status` stays independent of all of it — Project.js can render
            // either, both (a status plus a link), or neither.
            const links = _project.links && _project.links.length > 0
                ? _project.links
                    .filter((_link) => Boolean(_link.href))
                    .map((_link) => ({ href: _link.href, label: _link.label || null, mark: _link.mark || null, labelScale: _link.labelScale || 1 }))
                : _project.link
                    ? [{ href: _project.link, label: _project.linkLabel || null, mark: _project.linkMark || null, labelScale: _project.linkLabelScale || 1 }]
                    : []

            return {
                name: _project.name,
                imageSources,
                floorTexture,
                links,
                status: _project.status || null,
                labelPosition: { x: - 4.8, y: - 3 },
                labelHalfExtents: { x: 3.2, y: 1.5 }
            }
        })
    }

    setZone()
    {
        // Half the real span from the first to the last project, in place of
        // the old `list.length * (interDistance / 2)` — that assumed every
        // gap was the same size, which stopped being true once category
        // groups could use tightInterDistance.
        //
        // The edges are set explicitly rather than as a centre plus half the
        // span. That version shifted the whole zone 12 units left of the span
        // it measured, so its right edge stopped 12 short of the last project
        // — Odoo HR sat just outside it, and Aiodyx, once added, sat entirely
        // outside: driving up to it swung the camera back to the default angle
        // and brought the edge blur back, so its boards were seen differently
        // from every other project's.
        //
        // The left edge stays exactly where it was, since that is where the
        // road in from the crossroads enters. The right edge now clears the
        // last project's whole row of boards, however many it has.
        const lastX = this.positions[this.positions.length - 1]
        const last = this.list[this.list.length - 1]
        // Mirrors Project.boards.xInter and the board plane width; the projects
        // are not built yet when the zone is sized, so they cannot be read back
        const boardSpacing = 5
        const boardHalfWidth = 4.671 * 0.5
        const lastBoardsReach = (last.imageSources.length - 1) * boardSpacing * 0.5 + boardHalfWidth

        const left = this.x - this.projectHalfWidth - 6
        const right = lastX + lastBoardsReach + this.projectHalfWidth

        const zone = this.zones.add({
            position: { x: (left + right) * 0.5, y: this.y },
            halfExtents: { x: (right - left) * 0.5, y: 12 },
            data: { cameraAngle: 'projects' }
        })

        zone.on('in', (_data) =>
        {
            this.camera.angle.set(_data.cameraAngle)
            gsap.to(this.passes.horizontalBlurPass.material.uniforms.uStrength.value, { x: 0, duration: 2 })
            gsap.to(this.passes.verticalBlurPass.material.uniforms.uStrength.value, { y: 0, duration: 2 })
        })

        zone.on('out', () =>
        {
            this.camera.angle.set('default')
            gsap.to(this.passes.horizontalBlurPass.material.uniforms.uStrength.value, { x: this.passes.horizontalBlurPass.strength, duration: 2 })
            gsap.to(this.passes.verticalBlurPass.material.uniforms.uStrength.value, { y: this.passes.verticalBlurPass.strength, duration: 2 })
        })
    }

    add(_options)
    {
        const x = this.positions[this.items.length]
        let y = this.y
        if(this.items.length > 0)
        {
            y += (Math.random() - 0.5) * this.positionRandomess
        }

        // Create project
        const project = new Project({
            time: this.time,
            resources: this.resources,
            objects: this.objects,
            areas: this.areas,
            geometries: this.geometries,
            meshes: this.meshes,
            debug: this.debugFolder,
            x: x,
            y: y,
            ..._options
        })

        this.container.add(project.container)

        // Add tiles
        if(this.items.length >= 1)
        {
            const previousProject = this.items[this.items.length - 1]
            const start = new THREE.Vector2(previousProject.x + this.projectHalfWidth, previousProject.y)
            const end = new THREE.Vector2(project.x - this.projectHalfWidth, project.y)
            const delta = end.clone().sub(start)
            this.tiles.add({
                start: start,
                delta: delta
            })
        }

        // Save
        this.items.push(project)
    }
}

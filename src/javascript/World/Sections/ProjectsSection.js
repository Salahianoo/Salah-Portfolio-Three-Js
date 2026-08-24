import * as THREE from 'three'
import Project from './Project'
import gsap from 'gsap'
import { createTextTexture, createTextImageDataURL } from '../../Utils/TextTexture.js'
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
        // projectHalfWidth, so interDistance has to stay above twice the half
        // width (12) or the connecting path inverts.
        this.interDistance = 16
        // Tighter spacing used only between two projects in the same category
        // group (see setLayout) — 14 is the floor with a 2-unit safety margin
        // above the 12-unit limit above.
        this.tightInterDistance = 14
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
            { text: 'MOBILE APPS', start: 0, count: 5 },
            { text: 'ERP SYSTEMS', start: 5, count: 3, tight: true }
        ]

        const inGroup = (_index, _group) => _index >= _group.start && _index < _group.start + _group.count

        this.positions = []
        let cursor = this.x

        for(let i = 0; i < Content.projects.length; i++)
        {
            if(i > 0)
            {
                const sameGroup = this.categoryGroups.find((_group) => inGroup(i - 1, _group) && inGroup(i, _group))
                cursor += (sameGroup && sameGroup.tight) ? this.tightInterDistance : this.interDistance
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
            const floorTexture = createTextTexture(
                [
                    { text: _project.name, x: 210, y: 60, fontSize: 44, fontWeight: 900, maxWidth: 790 },
                    { text: _project.description, x: 214, y: 120, fontSize: 22, fontWeight: 400, color: '#999999', maxWidth: 790 }
                ],
                { width: 1024, height: 512 }
            )

            // Every destination a project has, normalised to one shape. A
            // project may declare `links: [{ href, label, mark }]` for something
            // on more than one store (LoopFruit), or the original single
            // `link` / `linkLabel` / `linkMark` trio, or neither. `label` swaps
            // the default baked "OPEN" texture for custom text, and `mark`
            // stands a store logo on the pad beside it.
            //
            // `status` stays independent of all of it — Project.js can render
            // either, both (a status plus a link, e.g. Mood: sold to one venue
            // but worth visiting), or neither.
            const links = _project.links && _project.links.length > 0
                ? _project.links
                    .filter((_link) => Boolean(_link.href))
                    .map((_link) => ({ href: _link.href, label: _link.label || null, mark: _link.mark || null }))
                : _project.link
                    ? [{ href: _project.link, label: _project.linkLabel || null, mark: _project.linkMark || null }]
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
        const lastX = this.positions[this.positions.length - 1]
        const totalWidth = (lastX - this.x) / 2

        const zone = this.zones.add({
            position: { x: this.x + totalWidth - this.projectHalfWidth - 6, y: this.y },
            halfExtents: { x: totalWidth, y: 12 },
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

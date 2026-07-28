import * as THREE from 'three'
import { createTextTexture } from '../../Utils/TextTexture.js'
import { createJordanFlagTexture } from '../../Utils/FlagTexture.js'
import { createUniversity, createInstagramGlyph, applyScreenTextures } from '../../Utils/Props.js'
import Content from '../../Content.js'

export default class InformationSection
{
    constructor(_options)
    {
        // Options
        this.time = _options.time
        this.resources = _options.resources
        this.objects = _options.objects
        this.areas = _options.areas
        this.tiles = _options.tiles
        this.debug = _options.debug
        this.x = _options.x
        this.y = _options.y

        // Set up
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false

        this.setFlag()
        this.removeFrenchLandmarks()
        this.removeTwitterBird()
        this.setStatic()
        this.setInstagramGlyph()
        this.setLinks()
        this.setEducation()
        this.setActivities()
        this.setTiles()
    }

    /**
     * The static model carries a French tricolour at the top of the flagpole,
     * built as three co-located stripe meshes. Collapse them into one quad and
     * paint a Jordanian flag on it.
     *
     * Objects.add reuses these mesh instances rather than cloning them, so the
     * kept mesh keeps the model's own transform and the material can simply be
     * overwritten once the parser has run.
     */
    setFlag()
    {
        this.flag = {}

        // GLTFLoader strips Blender's dots: "shadeWhite.112" -> "shadeWhite112"
        this.flag.stripeNames = ['shadeWhite112', 'shadeRed005', 'shadeBlue']

        const scene = this.resources.items.informationStaticBase.scene
        const stripes = scene.children.filter((_child) => this.flag.stripeNames.includes(_child.name))

        if(stripes.length === 0)
        {
            return
        }

        // Extent of the whole tricolour, so the replacement covers the same area
        const bounds = new THREE.Box3()
        for(const _stripe of stripes)
        {
            _stripe.geometry.computeBoundingBox()
            bounds.union(_stripe.geometry.boundingBox)
        }

        const size = bounds.getSize(new THREE.Vector3())
        const center = bounds.getCenter(new THREE.Vector3())

        // Keep the first, drop the rest
        this.flag.mesh = stripes[0]
        for(const _stripe of stripes.slice(1))
        {
            scene.remove(_stripe)
        }

        // Flat quad in the flag's plane — length on X, height on Z. The model's
        // node is turned 180 degrees on Z, so local +X points back at the pole
        // and the geometry is mirrored to keep the chevron on the hoist.
        const geometry = new THREE.PlaneGeometry(size.x, size.z, 1, 1)
        geometry.rotateX(Math.PI * 0.5)
        geometry.scale(- 1, 1, 1)
        geometry.translate(center.x, center.y, center.z)

        this.flag.mesh.geometry = geometry
        this.flag.texture = createJordanFlagTexture()
        this.flag.material = new THREE.MeshBasicMaterial({ map: this.flag.texture, side: THREE.DoubleSide })
    }

    setStatic()
    {
        this.objects.add({
            base: this.resources.items.informationStaticBase.scene,
            collision: this.resources.items.informationStaticCollision.scene,
            floorShadowTexture: this.resources.items.informationStaticFloorShadowTexture,
            offset: new THREE.Vector3(this.x, this.y, 0),
            mass: 0
        })

        if(this.flag.mesh)
        {
            this.flag.mesh.material = this.flag.material
        }
    }

    /**
     * Drops nodes out of the static base and collision scenes by name.
     *
     * GLTFLoader strips the dots from Blender's names, so "shadeGray.007" and
     * "Cube.055" read as "shadeGray007" and "Cube055" here.
     */
    removeStaticNodes(_baseNames, _collisionNames)
    {
        const scenes = [
            { scene: this.resources.items.informationStaticBase.scene, names: _baseNames },
            { scene: this.resources.items.informationStaticCollision.scene, names: _collisionNames }
        ]

        for(const _target of scenes)
        {
            for(const _node of _target.scene.children.filter((_child) => _target.names.includes(_child.name)))
            {
                _target.scene.remove(_node)
            }
        }
    }

    /**
     * The static model is set in Paris: an Eiffel Tower stands beside the
     * flagpole. It reads as French landmark next to a Jordanian flag, so it
     * goes. The baguettes that used to lie at its foot were a separate
     * `objects.add()` pair and are simply no longer added.
     *
     * Its shadow is painted into the static floorShadow texture and cannot be
     * removed from there without repainting the texture, so the blob was
     * erased from the PNG rather than left hanging over bare floor.
     */
    removeFrenchLandmarks()
    {
        this.removeStaticNodes(['shadeGray007'], ['Cube055'])
    }

    /**
     * The contact row was modelled with four pedestals — Twitter, GitHub,
     * LinkedIn, mail. Only the Twitter bird and its collider go; the plinth it
     * stood on (`shadeWhite_033` / `Cube063`) stays and carries Instagram
     * instead, so the row is still four figures against four link areas.
     */
    removeTwitterBird()
    {
        this.removeStaticNodes(['shadeOrange005'], ['Cube067'])
    }

    /**
     * Instagram has no modelled figure, so one is extruded to stand on the
     * vacated plinth. Sits at the plinth's local (1.88, 0.67); its top face is
     * at z 0.47 and the neighbouring figures reach about z 1.8.
     */
    setInstagramGlyph()
    {
        const options = createInstagramGlyph(1.12)
        options.offset.x += this.x + 1.88
        options.offset.y += this.y + 0.67

        this.objects.add(options)
    }

    setLinks()
    {
        // Set up
        this.links = {}
        // The pedestals sit at local x = 1.88, 4.28, 6.68, 9.08 and the areas
        // step by 2.4, so the row starts on the first plinth — the one now
        // carrying Instagram.
        this.links.x = 1.95
        this.links.y = - 1.5
        this.links.halfExtents = {}
        this.links.halfExtents.x = 1
        this.links.halfExtents.y = 1
        this.links.distanceBetween = 2.4
        this.links.labelWidth = this.links.halfExtents.x * 2 + 1
        this.links.labelGeometry = new THREE.PlaneGeometry(this.links.labelWidth, this.links.labelWidth * 0.25, 1, 1)
        this.links.labelOffset = - 1.6
        this.links.items = []

        this.links.container = new THREE.Object3D()
        this.links.container.matrixAutoUpdate = false
        this.container.add(this.links.container)

        // The github and linkedin labels are just the plain service names, so the
        // baked textures still fit. The mail one spelled out the address, and
        // instagram was never modelled, so both are drawn from Content.js in the
        // same white-on-black style.
        this.links.mailLabelTexture = createTextTexture(
            [
                { text: 'MAIL', x: 4, y: 34, fontSize: 54, fontWeight: 900 },
                { text: Content.profile.email.toUpperCase(), x: 4, y: 94, fontSize: 42, fontWeight: 700, maxWidth: 504 }
            ],
            { width: 512, height: 128 }
        )

        this.links.instagramLabelTexture = createTextTexture(
            [
                { text: 'INSTAGRAM', x: 4, y: 34, fontSize: 54, fontWeight: 900, maxWidth: 504 }
            ],
            { width: 512, height: 128 }
        )

        // Options (see Content.js for real values)
        this.links.options = [
            {
                href: Content.profile.social.instagram,
                labelTexture: this.links.instagramLabelTexture
            },
            {
                href: Content.profile.social.github,
                labelTexture: this.resources.items.informationContactGithubLabelTexture
            },
            {
                href: Content.profile.social.linkedin,
                labelTexture: this.resources.items.informationContactLinkedinLabelTexture
            },
            {
                href: `mailto:${Content.profile.email}`,
                labelTexture: this.links.mailLabelTexture
            }
        ]

        // Create each link
        let i = 0
        for(const _option of this.links.options)
        {
            // Set up
            const item = {}
            item.x = this.x + this.links.x + this.links.distanceBetween * i
            item.y = this.y + this.links.y
            item.href = _option.href

            // Create area
            item.area = this.areas.add({
                position: new THREE.Vector2(item.x, item.y),
                halfExtents: new THREE.Vector2(this.links.halfExtents.x, this.links.halfExtents.y)
            })
            item.area.on('interact', () =>
            {
                window.open(_option.href, '_blank')
            })

            // Texture
            item.texture = _option.labelTexture
            item.texture.magFilter = THREE.NearestFilter
            item.texture.minFilter = THREE.LinearFilter

            // Create label
            item.labelMesh = new THREE.Mesh(this.links.labelGeometry, new THREE.MeshBasicMaterial({ wireframe: false, color: 0xffffff, alphaMap: _option.labelTexture, depthTest: true, depthWrite: false, transparent: true }))
            item.labelMesh.position.x = item.x + this.links.labelWidth * 0.5 - this.links.halfExtents.x
            item.labelMesh.position.y = item.y + this.links.labelOffset
            item.labelMesh.matrixAutoUpdate = false
            item.labelMesh.updateMatrix()
            this.links.container.add(item.labelMesh)

            // Save
            this.links.items.push(item)

            i++
        }
    }

    /**
     * The university building, west of the road, with the degree written on the
     * floor in front of it the same way the achievements panel is.
     *
     * The spot is clear in the static model: the nearest scenery is the tree at
     * (-8.84, 1.03) and the rocks around (-8.2, -0.5), all north of it.
     */
    setEducation()
    {
        this.education = {}
        this.education.x = - 9.5
        this.education.y = - 4

        const options = createUniversity({ logo: this.resources.items.universityLogoTexture })
        options.offset.x += this.x + this.education.x
        options.offset.y += this.y + this.education.y

        this.objects.add(options)
        applyScreenTextures(options)

        // Floor label, in front of the building and clear of the achievements
        // panel which starts at local x = -5.5
        this.education.label = {}
        this.education.label.width = 8
        this.education.label.height = 2.25

        // Canvas kept to the text's own proportions, so the panel is not mostly
        // empty and the lettering reads at the same size as the achievements one
        this.education.label.texture = createTextTexture(
            [
                { text: 'EDUCATION', x: 20, y: 58, fontSize: 68, fontWeight: 900 },
                { text: Content.education.institution, x: 24, y: 150, fontSize: 48, fontWeight: 700, maxWidth: 976 },
                { text: Content.education.degree, x: 24, y: 212, fontSize: 32, fontWeight: 400, color: '#999999' }
            ],
            { width: 1024, height: 288 }
        )
        this.education.label.texture.magFilter = THREE.NearestFilter
        this.education.label.texture.minFilter = THREE.LinearFilter

        this.education.label.mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(this.education.label.width, this.education.label.height, 1, 1),
            new THREE.MeshBasicMaterial({ color: 0xffffff, alphaMap: this.education.label.texture, transparent: true })
        )
        // Pushed west of the building's centre line so the tree at (-6.34,
        // -10.02) does not stand on the lettering
        this.education.label.mesh.position.x = this.x + this.education.x - 1.5
        this.education.label.mesh.position.y = this.y + this.education.y - 7
        this.education.label.mesh.matrixAutoUpdate = false
        this.education.label.mesh.updateMatrix()
        this.container.add(this.education.label.mesh)
    }

    setActivities()
    {
        // Set up
        this.activities = {}
        this.activities.x = this.x + 0
        this.activities.y = this.y - 10
        this.activities.multiplier = 5.5

        // Geometry
        this.activities.geometry = new THREE.PlaneGeometry(2 * this.activities.multiplier, 1 * this.activities.multiplier, 1, 1)

        // Texture generated from real profile content (see Content.js)
        const achievementLines = [
            { text: 'ACHIEVEMENTS', x: 20, y: 60, fontSize: 68, fontWeight: 900 }
        ]
        Content.achievements.forEach((_achievement, _index) =>
        {
            const y = 160 + _index * 90
            achievementLines.push({ text: _achievement.title, x: 24, y, fontSize: 44, fontWeight: 700 })
            achievementLines.push({ text: _achievement.subtitle, x: 24, y: y + 40, fontSize: 26, fontWeight: 400, color: '#999999' })
        })

        this.activities.texture = createTextTexture(achievementLines, { width: 1024, height: 512 })
        this.activities.texture.magFilter = THREE.NearestFilter
        this.activities.texture.minFilter = THREE.LinearFilter

        // Material
        this.activities.material = new THREE.MeshBasicMaterial({ wireframe: false, color: 0xffffff, alphaMap: this.activities.texture, transparent: true })

        // Mesh
        this.activities.mesh = new THREE.Mesh(this.activities.geometry, this.activities.material)
        this.activities.mesh.position.x = this.activities.x
        this.activities.mesh.position.y = this.activities.y
        this.activities.mesh.matrixAutoUpdate = false
        this.activities.mesh.updateMatrix()
        this.container.add(this.activities.mesh)
    }

    setTiles()
    {
        this.tiles.add({
            start: new THREE.Vector2(this.x - 1.2, this.y + 13),
            delta: new THREE.Vector2(0, - 20)
        })
    }
}

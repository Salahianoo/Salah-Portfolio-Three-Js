import * as THREE from 'three'
import { createTextTexture } from '../../Utils/TextTexture.js'
import { createJordanFlagTexture } from '../../Utils/FlagTexture.js'
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
        this.setStatic()
        this.setBaguettes()
        this.setLinks()
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

    setBaguettes()
    {
        this.baguettes = {}

        this.baguettes.x = - 4
        this.baguettes.y = 6

        this.baguettes.a = this.objects.add({
            base: this.resources.items.informationBaguetteBase.scene,
            collision: this.resources.items.informationBaguetteCollision.scene,
            offset: new THREE.Vector3(this.x + this.baguettes.x - 0.56, this.y + this.baguettes.y - 0.666, 0.2),
            rotation: new THREE.Euler(0, 0, - Math.PI * 37 / 180),
            duplicated: true,
            shadow: { sizeX: 0.6, sizeY: 3.5, offsetZ: - 0.15, alpha: 0.35 },
            mass: 1.5,
            // soundName: 'woodHit'
        })

        this.baguettes.b = this.objects.add({
            base: this.resources.items.informationBaguetteBase.scene,
            collision: this.resources.items.informationBaguetteCollision.scene,
            offset: new THREE.Vector3(this.x + this.baguettes.x - 0.8, this.y + this.baguettes.y - 2, 0.5),
            rotation: new THREE.Euler(0, - 0.5, Math.PI * 60 / 180),
            duplicated: true,
            shadow: { sizeX: 0.6, sizeY: 3.5, offsetZ: - 0.15, alpha: 0.35 },
            mass: 1.5,
            sleep: false,
            // soundName: 'woodHit'
        })
    }

    setLinks()
    {
        // Set up
        this.links = {}
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
        // baked textures still fit. The mail one spelled out the address, so it
        // is redrawn from Content.js to match the same white-on-black style.
        this.links.mailLabelTexture = createTextTexture(
            [
                { text: 'MAIL', x: 4, y: 34, fontSize: 54, fontWeight: 900 },
                { text: Content.profile.email.toUpperCase(), x: 4, y: 94, fontSize: 42, fontWeight: 700, maxWidth: 504 }
            ],
            { width: 512, height: 128 }
        )

        // Options (see Content.js for real values)
        this.links.options = [
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

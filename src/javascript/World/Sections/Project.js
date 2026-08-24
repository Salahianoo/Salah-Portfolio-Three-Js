import * as THREE from 'three'

import ProjectBoardMaterial from '../../Materials/ProjectBoard.js'
import { createTextTexture, fitFontSize } from '../../Utils/TextTexture.js'
import { storeMarks } from '../../Utils/Props.js'
import gsap from 'gsap'

export default class Project
{
    constructor(_options)
    {
        // Options
        this.time = _options.time
        this.resources = _options.resources
        this.objects = _options.objects
        this.areas = _options.areas
        this.name = _options.name
        this.geometries = _options.geometries
        this.meshes = _options.meshes
        this.debug = _options.debug
        this.name = _options.name
        this.x = _options.x
        this.y = _options.y
        this.imageSources = _options.imageSources
        this.floorTexture = _options.floorTexture
        // Every destination this project has, as [{ href, label }]. Empty when
        // there is nowhere real to send people. `label` swaps the default
        // "OPEN" text on that pad.
        this.links = _options.links || []
        // A plain-text floor label ("COMING SOON"...). Independent of `links` —
        // may appear alone, alongside a single link (stacked), or not at all
        this.status = _options.status
        this.labelPosition = _options.labelPosition
        this.labelHalfExtents = _options.labelHalfExtents

        // Set up
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false
        // this.container.updateMatrix()

        this.setBoards()
        this.setFloor()
    }

    setBoards()
    {
        // Set up
        this.boards = {}
        this.boards.items = []
        this.boards.xInter = 5
        // Centre the row on the project whatever its board count. Hardcoding
        // this to -5 only lined up when a project had exactly three images.
        this.boards.xStart = - ((this.imageSources.length - 1) * this.boards.xInter) * 0.5
        this.boards.y = 5
        // Shown until the slide texture finishes loading and fades in over it
        this.boards.color = '#6b6e8e'
        this.boards.threeColor = new THREE.Color(this.boards.color)

        if(this.debug)
        {
            this.debug.addColor(this.boards, 'color').name('boardColor').onChange(() =>
            {
                this.boards.threeColor.set(this.boards.color)
            })
        }

        // Create each board
        let i = 0

        for(const _imageSource of this.imageSources)
        {
            // Set up
            const board = {}
            board.x = this.x + this.boards.xStart + i * this.boards.xInter
            board.y = this.y + this.boards.y

            // Create structure with collision
            this.objects.add({
                base: this.resources.items.projectsBoardStructure.scene,
                collision: this.resources.items.projectsBoardCollision.scene,
                floorShadowTexture: this.resources.items.projectsBoardStructureFloorShadowTexture,
                offset: new THREE.Vector3(board.x, board.y, 0),
                rotation: new THREE.Euler(0, 0, 0),
                duplicated: true,
                mass: 0
            })

            // Image load
            const image = new Image()
            image.addEventListener('load', () =>
            {
                board.texture = new THREE.Texture(image)
                // board.texture.magFilter = THREE.NearestFilter
                // board.texture.minFilter = THREE.LinearFilter
                board.texture.anisotropy = 4
                // board.texture.colorSpace = THREE.SRGBColorSpace
                board.texture.needsUpdate = true

                board.planeMesh.material.uniforms.uTexture.value = board.texture

                gsap.to(board.planeMesh.material.uniforms.uTextureAlpha, { value: 1, duration: 1, ease: 'power4.inOut' })
            })

            image.src = _imageSource

            // Plane
            board.planeMesh = this.meshes.boardPlane.clone()
            board.planeMesh.position.x = board.x
            board.planeMesh.position.y = board.y
            board.planeMesh.matrixAutoUpdate = false
            board.planeMesh.updateMatrix()
            board.planeMesh.material = new ProjectBoardMaterial()
            board.planeMesh.material.uniforms.uColor.value = this.boards.threeColor
            board.planeMesh.material.uniforms.uTextureAlpha.value = 0
            this.container.add(board.planeMesh)

            // Save
            this.boards.items.push(board)

            i++
        }
    }

    setFloor()
    {
        this.floor = {}

        this.floor.x = 0
        this.floor.y = - 2

        // Container
        this.floor.container = new THREE.Object3D()
        this.floor.container.position.x = this.x + this.floor.x
        this.floor.container.position.y = this.y + this.floor.y
        this.floor.container.matrixAutoUpdate = false
        this.floor.container.updateMatrix()
        this.container.add(this.floor.container)

        // Texture
        this.floor.texture = this.floorTexture
        this.floor.texture.magFilter = THREE.NearestFilter
        this.floor.texture.minFilter = THREE.LinearFilter

        // Geometry
        this.floor.geometry = this.geometries.floor

        // Material
        this.floor.material =  new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, alphaMap: this.floor.texture })

        // Mesh
        this.floor.mesh = new THREE.Mesh(this.floor.geometry, this.floor.material)
        this.floor.mesh.matrixAutoUpdate = false
        this.floor.container.add(this.floor.mesh)

        // `status` and `links` are independent: a project can show either one,
        // both, or neither. When both are present (Mood: sold to a single
        // venue, but worth visiting in person) they stack vertically and sit
        // on their own, closer anchor — the single-label anchor (-3) put a
        // stacked pair 6+ units from the name/description text painted on
        // the floor above them, reading as disconnected from the rest of the
        // project. -1.4 brings them noticeably nearer without the pad
        // reaching up into the boards. With only one of the two, nothing
        // changes from before.
        const stacked = this.links.length === 1 && Boolean(this.status)
        const stackedAnchorY = - 1.4
        const stackGap = 0.6

        // Plain-text label, no Area — nothing to walk into or press ENTER on.
        if(this.status)
        {
            const y = stacked ? stackedAnchorY + stackGap : this.labelPosition.y

            // fontSize measured to fill the canvas the way the baked "OPEN"
            // texture does — at 46 the text sat small and high (y=34 on a
            // 128-tall canvas, textBaseline is 'middle' so that's nowhere near
            // centre) and read as noticeably weaker than "OPEN" at the same
            // distance. 58 is the largest size "COMING SOON" fits without
            // clipping the 512-wide canvas; y=64 is dead centre.
            //
            // maxWidth condenses anything longer than that rather than letting
            // it run off the edge, so a status is not capped at 11 characters.
            this.floor.statusTexture = createTextTexture(
                [{ text: this.status, x: 16, y: 64, fontSize: 58, fontWeight: 900, color: '#ffffff', maxWidth: 480 }],
                { width: 512, height: 128 }
            )
            this.floor.statusTexture.magFilter = THREE.NearestFilter
            this.floor.statusTexture.minFilter = THREE.LinearFilter

            this.floor.statusLabel = new THREE.Mesh(
                new THREE.PlaneGeometry(2, 0.5),
                new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, alphaMap: this.floor.statusTexture })
            )
            this.floor.statusLabel.position.set(this.labelPosition.x, y, 0.001)
            this.floor.statusLabel.matrixAutoUpdate = false
            this.floor.statusLabel.updateMatrix()
            this.floor.container.add(this.floor.statusLabel)
        }

        // Real destinations: one clickable pad each. A `label` swaps the baked
        // "OPEN" texture for custom generated text — e.g. Mood's "CHECK OUT
        // THE STORE", pointing at the physical venue rather than an app
        // listing, or LoopFruit's two store names.
        //
        // Several pads spread along x rather than stacking in y: the areas are
        // 3.2 half-extents wide against a 16-wide floor, so two of them sit at
        // -4.8 and +4.8 and exactly fill it without touching. A third would not
        // fit, and nothing needs one.
        this.floor.links = []

        // Size, placement and weight of the optional store badge on a pad.
        // The mass matches the intro letters, which are the same kind of
        // object at much the same size.
        this.marks = { height: 1.5, offsetY: 1.1, mass: 1.5 }

        const spread = this.links.length > 1
        const step = Math.abs(this.labelPosition.x) * 2

        this.links.forEach((_link, _index) =>
        {
            const x = spread
                ? this.labelPosition.x + _index * step
                : this.labelPosition.x
            const y = stacked ? stackedAnchorY - stackGap : this.labelPosition.y

            const item = {}

            item.area = this.areas.add({
                position: new THREE.Vector2(this.x + x, this.y + this.floor.y + y),
                halfExtents: new THREE.Vector2(this.labelHalfExtents.x, this.labelHalfExtents.y)
            })
            item.area.on('interact', () =>
            {
                window.open(_link.href, '_blank')
            })

            if(_link.label)
            {
                // Sized to fill the canvas rather than set to a fixed number,
                // because that is what decides how big the lettering reads
                // once the texture is on the pad.
                //
                // A long label such as Mood's "CHECK OUT THE STORE" falls
                // under the 50 floor, so it keeps the size it always had and
                // `maxWidth` condenses it to the full width — matching the
                // squeeze on "COMING SOON" beside it, which is what that size
                // was originally measured for. A short one like "PLAY STORE"
                // has slack instead: at 50 it covered barely half the canvas
                // and read visibly weaker than the baked "OPEN" texture, so it
                // is scaled up until it fills the same width.
                item.texture = createTextTexture(
                    [{ text: _link.label, x: 16, y: 64, fontSize: fitFontSize(_link.label), fontWeight: 900, color: '#ffffff', maxWidth: 480 }],
                    { width: 512, height: 128 }
                )
                item.texture.magFilter = THREE.NearestFilter
                item.texture.minFilter = THREE.LinearFilter

                item.labelMesh = new THREE.Mesh(
                    new THREE.PlaneGeometry(2, 0.5),
                    new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, alphaMap: item.texture })
                )
            }
            else
            {
                item.labelMesh = this.meshes.areaLabel.clone()
            }

            item.labelMesh.position.x = x
            item.labelMesh.position.y = y
            item.labelMesh.position.z = 0.001
            item.labelMesh.matrixAutoUpdate = false
            item.labelMesh.updateMatrix()
            this.floor.container.add(item.labelMesh)

            // An optional badge standing on the pad: the store's own logo,
            // extruded from Utils/Props.js.
            //
            // It stands a unit behind the lettering rather than on it. The
            // camera hides the ground back and to the left of anything solid,
            // so a mark placed in front would cover its own label, and one
            // placed on it would cover the text outright.
            //
            // Knockable, like the intro letters. The pad keeps its painted
            // label either way, so shoving the badge off it loses nothing —
            // the text on the floor is what actually names the button.
            const build = storeMarks[_link.mark]

            if(build)
            {
                const markOptions = build(this.marks.height, { mass: this.marks.mass })
                markOptions.offset.x += this.x + x
                markOptions.offset.y += this.y + this.floor.y + y + this.marks.offsetY

                this.objects.add(markOptions)
                item.mark = markOptions
            }

            this.floor.links.push(item)
        })
    }
}

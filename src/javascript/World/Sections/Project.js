import * as THREE from 'three'

import ProjectBoardMaterial from '../../Materials/ProjectBoard.js'
import { createTextTexture } from '../../Utils/TextTexture.js'
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
        // {href} when the project has somewhere real to send people, else null
        this.link = _options.link
        // A plain-text floor label ("COMING SOON"...) shown instead of a link
        // when there's nothing to open yet but it's still worth flagging
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

        // A real, published link: the clickable "OPEN" pad, unchanged from
        // before. Nothing below this branch runs — no pad and no label for a
        // project with neither a link nor a status.
        if(this.link)
        {
            this.floor.area = this.areas.add({
                position: new THREE.Vector2(this.x + this.labelPosition.x, this.y + this.floor.y + this.labelPosition.y),
                halfExtents: new THREE.Vector2(this.labelHalfExtents.x, this.labelHalfExtents.y)
            })
            this.floor.area.on('interact', () =>
            {
                window.open(this.link.href, '_blank')
            })

            this.floor.areaLabel = this.meshes.areaLabel.clone()
            this.floor.areaLabel.position.x = this.labelPosition.x
            this.floor.areaLabel.position.y = this.labelPosition.y
            this.floor.areaLabel.position.z = 0.001
            this.floor.areaLabel.matrixAutoUpdate = false
            this.floor.areaLabel.updateMatrix()
            this.floor.container.add(this.floor.areaLabel)
        }
        // Not live yet: a plain status label at the same spot. No Area is
        // created, so there's nothing to walk into or press ENTER on.
        else if(this.status)
        {
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
            this.floor.statusLabel.position.set(this.labelPosition.x, this.labelPosition.y, 0.001)
            this.floor.statusLabel.matrixAutoUpdate = false
            this.floor.statusLabel.updateMatrix()
            this.floor.container.add(this.floor.statusLabel)
        }
    }
}

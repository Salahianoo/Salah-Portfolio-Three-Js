import * as THREE from 'three'
import { createSmartphone, createLaptop, createCodingDesk, createDesignBoards, createServerRack, applyScreenTextures } from '../../Utils/Props.js'

export default class CrossroadsSection
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

        this.setPlinths()
        this.setStatic()
        this.setProps()
        this.setTiles()
    }

    /**
     * The crossroads ships with five plinths of Bruno Simon's hobbies — an
     * arcade cabinet, cinema seats, a TV, golf clubs and dumbbells. They are
     * replaced here with the five sides of Salah's work.
     *
     * Each plinth carries exactly one sculpted figure (~11k verts). Their poses
     * are baked, so only the three that suit a desk scene are kept:
     *
     *   shadeOrange_014  seated (3.87 tall, 2.38 deep)  -> the coding desk
     *   shadeOrange007   standing (5.13 tall)           -> the design boards
     *   shadeOrange_001  standing (5.06 tall)           -> the laptop
     *
     * shadeOrange001 is crouched and shadeOrange011 is mid-golf-swing; neither
     * reads as someone working, so both are dropped.
     *
     * Everything else within 4 units of a plinth centre is hobby clutter and
     * goes. The collision model holds only the plinth boxes and the signposts,
     * so it is left alone.
     */
    setPlinths()
    {
        this.plinths = {}

        // Local positions of the five plinths, and the top surface they present
        this.plinths.positions = [[0, 0], [9, 9], [9, - 9], [- 9, 9], [- 9, - 9]]
        this.plinths.topZ = 0.95

        // Heading from an object toward the default camera, and the direction
        // that reads as "right" on screen. Compositions are laid out along
        // these so nothing hides behind anything else.
        this.plinths.toCamera = new THREE.Vector2(1.135, - 1.45).normalize()
        this.plinths.right = new THREE.Vector2(- this.plinths.toCamera.y, this.plinths.toCamera.x)

        // A figure with yaw t faces (sin t, -cos t) — confirmed by the arcade
        // figure's 39deg pointing exactly at its cabinet.
        this.plinths.faceCamera = Math.atan2(this.plinths.toCamera.x, - this.plinths.toCamera.y)
        this.plinths.faceAway = this.plinths.faceCamera + Math.PI

        // GLTFLoader strips Blender's dots: "shadeWhite.078" -> "shadeWhite078"
        this.plinths.keep = new Set(['shadeWhite078', 'shadeWhite007', 'shadeWhite080', 'shadeWhite077', 'shadeWhite079'])

        const offsetBy = (_vector, _distance) => [_vector.x * _distance, _vector.y * _distance]

        // Each kept figure: which nodes move together, the pivot they rotate
        // about, the plinth they land on, where on it, and their current yaw.
        // The seated figure brings its cinema seat — the pose is authored for
        // it, so it doubles as the desk chair and saves modelling one.
        this.plinths.figures = [
            {
                // Seated, to the coding desk. Turned away from the camera so we
                // look over their shoulder at the screens.
                names: ['shadeOrange_014', 'shadeOrange_015', 'shadeOrange_016', 'shadeOrange_017', 'shadeOrange_018', 'shadeOrange_019', 'shadeOrange_020'],
                pivot: [9, 9.4],
                plinth: [0, 0],
                at: offsetBy(this.plinths.toCamera, 1.55),
                yaw: 0,
                target: this.plinths.faceAway
            },
            {
                // Standing, presenting at the design boards
                names: ['shadeOrange007'],
                pivot: [0.1, - 0.2],
                plinth: [9, 9],
                at: offsetBy(this.plinths.right, 1.5),
                yaw: Math.atan2(0.334, 0.943) * 2,
                target: this.plinths.faceCamera
            },
            {
                // Standing, beside the laptop
                names: ['shadeOrange_001'],
                pivot: [9.1, - 9.9],
                plinth: [9, - 9],
                at: offsetBy(this.plinths.right, - 1.45),
                yaw: Math.PI,
                target: this.plinths.faceCamera
            }
        ]

        for(const _figure of this.plinths.figures)
        {
            for(const _name of _figure.names)
            {
                this.plinths.keep.add(_name)
            }
        }

        const scene = this.resources.items.crossroadsStaticBase.scene

        // Strip the hobby props
        for(const _node of [...scene.children])
        {
            if(this.plinths.keep.has(_node.name) || _node.name === 'floor007')
            {
                continue
            }

            const nearPlinth = this.plinths.positions.some(([x, y]) =>
                Math.hypot(_node.position.x - x, _node.position.y - y) < 4
            )

            if(nearPlinth)
            {
                scene.remove(_node)
            }
        }

        // Turn and move the survivors onto their new plinths
        const axis = new THREE.Vector3(0, 0, 1)

        for(const _figure of this.plinths.figures)
        {
            const turn = _figure.target - _figure.yaw
            const spin = new THREE.Quaternion().setFromAxisAngle(axis, turn)
            const pivot = new THREE.Vector3(_figure.pivot[0], _figure.pivot[1], 0)
            const destination = new THREE.Vector3(
                _figure.plinth[0] + _figure.at[0] - _figure.pivot[0],
                _figure.plinth[1] + _figure.at[1] - _figure.pivot[1],
                0
            )

            for(const _node of scene.children)
            {
                if(!_figure.names.includes(_node.name))
                {
                    continue
                }

                // Swing the whole group about the pivot, then slide it across
                _node.position.sub(pivot).applyAxisAngle(axis, turn).add(pivot).add(destination)
                _node.quaternion.premultiply(spin)
            }
        }
    }

    setStatic()
    {
        this.objects.add({
            base: this.resources.items.crossroadsStaticBase.scene,
            collision: this.resources.items.crossroadsStaticCollision.scene,
            floorShadowTexture: this.resources.items.crossroadsStaticFloorShadowTexture,
            offset: new THREE.Vector3(this.x, this.y, 0),
            mass: 0
        })
    }

    /**
     * The five replacement props, built from primitives in Utils/Props.js.
     * Plinth assignment follows the figures: the seated one sits at the coding
     * desk in the centre, the two standing ones present at the laptop and the
     * boards, and the two figure-less plinths carry the phone and the rack.
     */
    setProps()
    {
        const { toCamera, right } = this.plinths
        const along = (_vector, _distance) => [_vector.x * _distance, _vector.y * _distance]

        const items = this.resources.items

        this.props = [
            // Centre — the code. Sits just beyond the seated figure so the
            // monitors face back past their shoulder toward the camera.
            {
                build: createCodingDesk,
                screens: {
                    left: items.screenCodeEditorTexture,
                    center: items.screenDashboardTexture,
                    right: items.screenTerminalTexture
                },
                plinth: [0, 0],
                offset: along(toCamera, - 0.15)
            },
            // NE — collaboration, boards to the figure's left
            {
                build: createDesignBoards,
                screens: { board: items.screenDesignBoardTexture },
                plinth: [9, 9],
                offset: along(right, - 0.9)
            },
            // SE — web / Odoo, laptop to the figure's right
            {
                build: createLaptop,
                screens: { lid: items.screenOdooTexture },
                plinth: [9, - 9],
                offset: along(right, 0.75)
            },
            // NW / SW — no figure, so these sit centred
            {
                build: createSmartphone,
                screens: { phone: items.screenPhoneTexture },
                plinth: [- 9, 9],
                offset: [0, 0]
            },
            { build: createServerRack, plinth: [- 9, - 9], offset: [0, 0] }
        ]

        for(const _prop of this.props)
        {
            const options = _prop.build(_prop.screens)

            options.offset.x += this.x + _prop.plinth[0] + _prop.offset[0]
            options.offset.y += this.y + _prop.plinth[1] + _prop.offset[1]
            options.offset.z += this.plinths.topZ

            this.objects.add(options)
            applyScreenTextures(options)
        }
    }

    setTiles()
    {
        // To intro
        this.tiles.add({
            start: new THREE.Vector2(this.x, - 10),
            delta: new THREE.Vector2(0, this.y + 14)
        })

        // To projects
        this.tiles.add({
            start: new THREE.Vector2(this.x + 12.5, this.y),
            delta: new THREE.Vector2(7.5, 0)
        })

        // To projects
        this.tiles.add({
            start: new THREE.Vector2(this.x - 13, this.y),
            delta: new THREE.Vector2(- 6, 0)
        })
    }
}

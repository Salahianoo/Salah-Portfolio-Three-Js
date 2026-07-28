import * as THREE from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { font, capHeightRatio } from './BlockText.js'

/**
 * Builds the crossroads plinth props out of primitives at runtime, the same way
 * BlockText.js builds the intro letters — no modelled assets required.
 *
 * Meshes are named after the shade they want (`shadeBlack`, `shadeBlue`, ...)
 * because Objects.getConvertedMesh picks the matcap material off the mesh name.
 * Collision children are named `cube` and carry their full extents in `scale`,
 * which is what Physics.addObjectFromThree reads.
 */

// The Mesh constructor needs something; the parser overwrites it immediately.
const placeholderMaterial = new THREE.MeshBasicMaterial()

/**
 * Z rotation that turns a surface whose front faces -Y toward the default
 * camera, which sits on the (1.135, -1.45) heading. Flat things (screens,
 * boards, the phone) need this or they present their edge to the viewer.
 */
export const FACING = Math.atan2(1.135, 1.45)

class Prop
{
    constructor()
    {
        this.base = new THREE.Object3D()
        this.collision = new THREE.Object3D()
    }

    /**
     * @param _shade   matcap name — 'white', 'black', 'blue', 'gray', ...
     * @param _size    [width, depth, height]
     * @param _position [x, y, z] of the box centre, local to the plinth top
     * @param _rotation [x, y, z] euler, radians
     * @param _collide  add a matching physics box
     */
    box(_shade, _size, _position, _rotation = [0, 0, 0], _collide = false)
    {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(..._size), placeholderMaterial)
        mesh.name = `shade${_shade.substring(0, 1).toUpperCase()}${_shade.substring(1)}`
        mesh.position.set(..._position)
        mesh.rotation.set(..._rotation)
        this.base.add(mesh)

        if(_collide)
        {
            const collider = new THREE.Object3D()
            collider.name = 'cube'
            collider.scale.set(..._size)
            collider.position.set(..._position)
            this.collision.add(collider)
        }

        return this
    }

    /**
     * A flat panel plus the slightly smaller coloured face that sits proud of
     * it — the shape every screen in here is made of.
     */
    screen(_frameShade, _faceShade, _size, _position, _rotation = [0, 0, 0], _collide = false)
    {
        const [w, d, h] = _size
        this.box(_frameShade, [w, d, h], _position, _rotation, _collide)

        // Nudge the face forward along the panel's own -Y after rotation
        const forward = new THREE.Vector3(0, - (d * 0.5 + 0.02), 0)
        forward.applyEuler(new THREE.Euler(..._rotation))

        this.box(_faceShade, [w * 0.86, 0.04, h * 0.84], [
            _position[0] + forward.x,
            _position[1] + forward.y,
            _position[2] + forward.z
        ], _rotation)

        return this
    }

    /**
     * Adds a mesh from geometry built elsewhere (extruded shapes, text).
     */
    custom(_shade, _geometry, _position = [0, 0, 0], _rotation = [0, 0, 0])
    {
        const mesh = new THREE.Mesh(_geometry, placeholderMaterial)
        mesh.name = `shade${_shade.substring(0, 1).toUpperCase()}${_shade.substring(1)}`
        mesh.position.set(..._position)
        mesh.rotation.set(..._rotation)
        this.base.add(mesh)

        return this
    }

    /**
     * No `shadow` option here on purpose: Shadows.add always draws the blob at
     * ground level and only uses height to fade its alpha, so a prop standing
     * on a 0.95-high plinth would cast its shadow underneath the plinth where
     * nothing can see it. The plinths' own shadows are baked into the section's
     * floorShadow texture already.
     */
    toOptions(_x, _y, _z, _rotationZ = 0)
    {
        return {
            base: this.base,
            collision: this.collision,
            offset: new THREE.Vector3(_x, _y, _z),
            rotation: new THREE.Euler(0, 0, _rotationZ),
            mass: 0
        }
    }
}

/**
 * Mobile development — an oversized phone standing on the plinth like a
 * monument, screen turned to the camera.
 */
export function createSmartphone()
{
    const prop = new Prop()

    prop.box('black', [1.7, 0.3, 3.3], [0, 0, 1.65], [0, 0, 0], true)
    prop.box('blue', [1.44, 0.06, 2.86], [0, - 0.18, 1.72])

    // A couple of UI cards so the screen is not a flat slab
    prop.box('white', [1.15, 0.04, 0.5], [0, - 0.22, 2.55])
    prop.box('white', [1.15, 0.04, 0.34], [0, - 0.22, 1.9])
    prop.box('white', [0.52, 0.04, 0.34], [- 0.31, - 0.22, 1.42])
    prop.box('emeraldGreen', [0.52, 0.04, 0.34], [0.31, - 0.22, 1.42])

    // Camera notch and home bar
    prop.box('gray', [0.3, 0.04, 0.08], [0, - 0.22, 3.02])
    prop.box('gray', [0.6, 0.04, 0.06], [0, - 0.22, 0.36])

    return prop.toOptions(0, 0, 0, FACING)
}

/**
 * Web / Odoo work — an oversized open laptop for the standing figure to
 * present beside.
 */
export function createLaptop()
{
    const prop = new Prop()
    const lidTilt = - 0.24

    // Base, keyboard well and trackpad
    prop.box('gray', [3.0, 2.1, 0.18], [0, 0, 0.09], [0, 0, 0], true)
    prop.box('black', [2.6, 1.35, 0.05], [0, - 0.1, 0.2])
    prop.box('white', [0.85, 0.5, 0.03], [0, - 0.78, 0.2])

    // Lid, hinged at the back edge and leaning away from the viewer
    prop.screen('gray', 'blue', [3.0, 0.16, 2.05], [0, 1.15, 1.12], [lidTilt, 0, 0])

    return prop.toOptions(0, 0, 0, FACING)
}

/**
 * The code itself — a desk with a three-monitor array. The seated figure and
 * its chair come from the original model, so nothing is modelled for the
 * person here.
 */
export function createCodingDesk()
{
    const prop = new Prop()
    const deskZ = 2.0

    // Desk top and legs
    prop.box('white', [4.0, 1.9, 0.16], [0, 0, deskZ], [0, 0, 0], true)
    prop.box('gray', [0.16, 1.7, deskZ], [- 1.85, 0, deskZ * 0.5])
    prop.box('gray', [0.16, 1.7, deskZ], [1.85, 0, deskZ * 0.5])

    // Three monitors, the outer pair angled inward toward the chair
    const monitorZ = deskZ + 0.63
    prop.screen('black', 'blue', [1.5, 0.12, 1.0], [0, 0.6, monitorZ])
    prop.screen('black', 'blue', [1.5, 0.12, 1.0], [- 1.5, 0.78, monitorZ], [0, 0, 0.32])
    prop.screen('black', 'blue', [1.5, 0.12, 1.0], [1.5, 0.78, monitorZ], [0, 0, - 0.32])

    // Monitor feet
    for(const x of [- 1.5, 0, 1.5])
    {
        prop.box('gray', [0.34, 0.34, 0.14], [x, x === 0 ? 0.6 : 0.78, deskZ + 0.15])
    }

    // Keyboard and tower
    prop.box('gray', [1.25, 0.4, 0.06], [0, - 0.42, deskZ + 0.11])
    prop.box('black', [0.55, 1.0, 1.4], [1.45, - 0.3, 0.7], [0, 0, 0], true)
    prop.box('emeraldGreen', [0.1, 0.04, 0.1], [1.45, - 0.81, 1.15])

    return prop.toOptions(0, 0, 0, 0)
}

/**
 * Collaborative / design work — two boards on stands with sticky-note blocks,
 * for the standing figure to present at.
 */
export function createDesignBoards()
{
    const prop = new Prop()

    // Main board on legs
    prop.box('gray', [0.12, 0.12, 1.5], [- 1.15, 0.1, 0.75])
    prop.box('gray', [0.12, 0.12, 1.5], [1.15, 0.1, 0.75])
    prop.screen('white', 'white', [2.8, 0.14, 1.9], [0, 0.1, 2.45], [0, 0, 0], true)

    // Wireframe blocks on the face
    prop.box('blue', [0.75, 0.04, 0.5], [- 0.72, - 0.02, 2.85])
    prop.box('blue', [0.75, 0.04, 0.28], [- 0.72, - 0.02, 2.3])
    prop.box('purple', [0.8, 0.04, 0.82], [0.62, - 0.02, 2.6])

    // Smaller angled board beside it
    prop.box('gray', [0.1, 0.1, 1.2], [1.95, - 1.15, 0.6])
    prop.screen('white', 'emeraldGreen', [1.5, 0.12, 1.1], [2.05, - 1.2, 1.75], [0, 0, - 0.55])

    return prop.toOptions(0, 0, 0, FACING)
}

/**
 * A replica of the crossroads fingerposts, for labelling a group of projects.
 *
 * Measured off the originals in crossroads/static/base.glb so it reads as the
 * same object: a 0.18 x 0.18 x 4.07 pole, a 0.59-tall arrow board 0.18 deep,
 * and lettering standing 0.04 proud of the board face. The real signs' text is
 * modelled geometry rather than a texture, so this generates real extruded
 * text too instead of faking it with a decal.
 */
export function createSignpost(_text, _options = {})
{
    const options = {
        poleHeight: 4.07,
        poleWidth: 0.18,
        boardHeight: 0.59,
        // Deeper than the pole on purpose. Both are centred on y=0, so if the
        // board matched the pole's 0.18 their front faces would be coplanar and
        // the pole would punch through the sign and cut the lettering in half.
        // Giving the board 0.04 of clearance each side hides the post inside it.
        boardDepth: 0.26,
        boardZ: 3.5,
        capHeight: 0.28,
        letterThickness: 0.04,
        padding: 0.28,
        pointLength: 0.26,
        ..._options
    }

    const prop = new Prop()

    // Lettering first, so the board can be sized to whatever it measures
    const size = options.capHeight / capHeightRatio
    const textGeometry = new TextGeometry(_text, {
        font,
        size,
        depth: options.letterThickness,
        curveSegments: 4,
        bevelEnabled: false
    })
    textGeometry.rotateX(Math.PI * 0.5)
    textGeometry.computeBoundingBox()

    const textBox = textGeometry.boundingBox
    const textWidth = textBox.max.x - textBox.min.x

    // Centre the text on its own origin so it can be placed on the board face
    textGeometry.translate(
        - (textBox.min.x + textBox.max.x) * 0.5,
        - (textBox.min.y + textBox.max.y) * 0.5,
        - (textBox.min.z + textBox.max.z) * 0.5
    )

    const boardWidth = textWidth + options.padding * 2 + options.pointLength

    // Arrow board: a rectangle with one pointed end, extruded like the original
    const shape = new THREE.Shape()
    shape.moveTo(- boardWidth * 0.5, 0)
    shape.lineTo(boardWidth * 0.5 - options.pointLength, 0)
    shape.lineTo(boardWidth * 0.5, options.boardHeight * 0.5)
    shape.lineTo(boardWidth * 0.5 - options.pointLength, options.boardHeight)
    shape.lineTo(- boardWidth * 0.5, options.boardHeight)
    shape.closePath()

    const boardGeometry = new THREE.ExtrudeGeometry(shape, { depth: options.boardDepth, bevelEnabled: false })
    // Authored in XY extruded along +Z; stand it up so height runs along Z
    boardGeometry.rotateX(Math.PI * 0.5)
    boardGeometry.translate(0, options.boardDepth * 0.5, options.boardZ - options.boardHeight * 0.5)

    prop.box('brown', [options.poleWidth, options.poleWidth, options.poleHeight],
        [0, 0, options.poleHeight * 0.5], [0, 0, 0], true)
    prop.custom('white', boardGeometry)

    // Lettering sits proud of the board's front face, shifted back from the
    // point so it stays inside the rectangular part
    prop.custom('gray', textGeometry, [
        - options.pointLength * 0.5,
        - (options.boardDepth * 0.5 + options.letterThickness * 0.5),
        options.boardZ
    ])

    return prop.toOptions(0, 0, 0, FACING)
}

/**
 * Backend — a server rack for the Supabase / Firebase side of the bio.
 */
export function createServerRack()
{
    const prop = new Prop()

    prop.box('black', [1.8, 1.3, 3.4], [0, 0, 1.7], [0, 0, 0], true)

    // Blades with status lights down the front face
    for(let i = 0; i < 6; i++)
    {
        const z = 0.45 + i * 0.5
        prop.box('gray', [1.5, 0.06, 0.34], [0, - 0.68, z])
        prop.box(i % 2 === 0 ? 'emeraldGreen' : 'blue', [0.1, 0.05, 0.1], [0.58, - 0.72, z])
        prop.box('white', [0.5, 0.05, 0.04], [- 0.35, - 0.72, z])
    }

    // Cap
    prop.box('gray', [1.9, 1.4, 0.12], [0, 0, 3.46])

    return prop.toOptions(0, 0, 0, FACING)
}

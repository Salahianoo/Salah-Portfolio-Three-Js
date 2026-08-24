import * as THREE from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
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

        // Faces waiting for an image material, applied after Objects.add has run
        this.screens = []
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
     * A single quad carrying an image, front facing -Y like every other face in
     * here.
     *
     * Named `shadeWhite` on purpose. Objects.getConvertedMesh hands unmatched
     * names to its default parser, which *clones* the mesh — the clone is what
     * ends up in the scene and the reference kept here would be orphaned. The
     * shade parser reuses the instance instead, so the material can be swapped
     * afterwards by applyScreenTextures().
     *
     * @param _size [width, height]
     * @param _transparent  for cut-out artwork such as a logo on a wall
     */
    image(_texture, _size, _position, _rotation = [0, 0, 0], _transparent = false)
    {
        const geometry = new THREE.PlaneGeometry(..._size)
        geometry.rotateX(Math.PI * 0.5)

        const mesh = new THREE.Mesh(geometry, placeholderMaterial)
        mesh.name = 'shadeWhite'
        mesh.position.set(..._position)
        mesh.rotation.set(..._rotation)
        this.base.add(mesh)

        this.screens.push({ mesh, texture: _texture, transparent: _transparent })

        return this
    }

    /**
     * A flat panel plus the slightly smaller face that sits proud of it — the
     * shape every screen in here is made of. Pass `_texture` to make that face
     * an image instead of a flat colour.
     */
    screen(_frameShade, _faceShade, _size, _position, _rotation = [0, 0, 0], _collide = false, _texture = null)
    {
        const [w, d, h] = _size
        this.box(_frameShade, [w, d, h], _position, _rotation, _collide)

        // Nudge the face forward along the panel's own -Y after rotation
        const forward = new THREE.Vector3(0, - (d * 0.5 + 0.02), 0)
        forward.applyEuler(new THREE.Euler(..._rotation))

        const facePosition = [
            _position[0] + forward.x,
            _position[1] + forward.y,
            _position[2] + forward.z
        ]

        if(_texture)
        {
            this.image(_texture, [w * 0.86, h * 0.84], facePosition, _rotation)
        }
        else
        {
            this.box(_faceShade, [w * 0.86, 0.04, h * 0.84], facePosition, _rotation)
        }

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
     * The plinth props pass no `_shadow` on purpose: Shadows.add always draws
     * the blob at ground level and only uses height to fade its alpha, so a
     * prop standing on a 0.95-high plinth would cast its shadow underneath the
     * plinth where nothing can see it. The plinths' own shadows are baked into
     * the section's floorShadow texture already.
     *
     * Props that stand on the ground itself do want one.
     */
    toOptions(_x, _y, _z, _rotationZ = 0, _shadow = null)
    {
        const options = {
            base: this.base,
            collision: this.collision,
            offset: new THREE.Vector3(_x, _y, _z),
            rotation: new THREE.Euler(0, 0, _rotationZ),
            mass: 0,
            screens: this.screens
        }

        if(_shadow)
        {
            options.shadow = _shadow
        }

        return options
    }
}

/**
 * Swaps the matcap the shade parser assigned for the screen's own image.
 *
 * Has to run *after* Objects.add, which walks the base children and sets a
 * material on each one.
 */
export function applyScreenTextures(_options)
{
    for(const _screen of _options.screens || [])
    {
        if(!_screen.texture)
        {
            continue
        }

        _screen.texture.colorSpace = THREE.SRGBColorSpace
        _screen.texture.needsUpdate = true

        // alphaTest rather than plain transparency, so cut-out artwork still
        // writes depth and does not have to be sorted against the wall behind it
        _screen.mesh.material = new THREE.MeshBasicMaterial({
            map: _screen.texture,
            transparent: _screen.transparent === true,
            alphaTest: _screen.transparent === true ? 0.2 : 0
        })
    }
}

/**
 * Mobile development — an oversized phone standing on the plinth like a
 * monument, screen turned to the camera.
 */
export function createSmartphone(_screens = {})
{
    const prop = new Prop()

    prop.box('black', [1.7, 0.3, 3.3], [0, 0, 1.65], [0, 0, 0], true)

    // The mockup draws its own status bar, cards and home bar, so the body is
    // all that is modelled here
    prop.image(_screens.phone, [1.44, 2.86], [0, - 0.18, 1.72])

    return prop.toOptions(0, 0, 0, FACING)
}

/**
 * Web / Odoo work — an oversized open laptop for the standing figure to
 * present beside.
 */
export function createLaptop(_screens = {})
{
    const prop = new Prop()
    const lidTilt = - 0.24

    // Base, keyboard well and trackpad
    prop.box('gray', [3.0, 2.1, 0.18], [0, 0, 0.09], [0, 0, 0], true)
    prop.box('black', [2.6, 1.35, 0.05], [0, - 0.1, 0.2])
    prop.box('white', [0.85, 0.5, 0.03], [0, - 0.78, 0.2])

    // Lid, hinged at the back edge and leaning away from the viewer
    prop.screen('gray', 'blue', [3.0, 0.16, 2.05], [0, 1.15, 1.12], [lidTilt, 0, 0], false, _screens.lid)

    return prop.toOptions(0, 0, 0, FACING)
}

/**
 * The code itself — a desk with a three-monitor array. The seated figure and
 * its chair come from the original model, so nothing is modelled for the
 * person here.
 */
export function createCodingDesk(_screens = {})
{
    const prop = new Prop()
    const deskZ = 2.0

    // Desk top and legs
    prop.box('white', [4.0, 1.9, 0.16], [0, 0, deskZ], [0, 0, 0], true)
    prop.box('gray', [0.16, 1.7, deskZ], [- 1.85, 0, deskZ * 0.5])
    prop.box('gray', [0.16, 1.7, deskZ], [1.85, 0, deskZ * 0.5])

    // Three monitors, the outer pair angled inward toward the chair. This prop
    // is not turned by FACING, so world -X is the viewer's left.
    const monitorZ = deskZ + 0.63
    prop.screen('black', 'blue', [1.5, 0.12, 1.0], [0, 0.6, monitorZ], [0, 0, 0], false, _screens.center)
    prop.screen('black', 'blue', [1.5, 0.12, 1.0], [- 1.5, 0.78, monitorZ], [0, 0, 0.32], false, _screens.left)
    prop.screen('black', 'blue', [1.5, 0.12, 1.0], [1.5, 0.78, monitorZ], [0, 0, - 0.32], false, _screens.right)

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
export function createDesignBoards(_screens = {})
{
    const prop = new Prop()

    // Main board on legs. The mockup draws its own wireframes, flow arrows and
    // sticky notes, so nothing is modelled on the face.
    prop.box('gray', [0.12, 0.12, 1.5], [- 1.15, 0.1, 0.75])
    prop.box('gray', [0.12, 0.12, 1.5], [1.15, 0.1, 0.75])
    prop.screen('white', 'white', [2.8, 0.14, 1.9], [0, 0.1, 2.45], [0, 0, 0], true, _screens.board)

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
 * Traces a rounded rectangle centred on the origin into an existing Shape or
 * Path, so the same helper can cut a hole as well as draw an outline.
 */
function roundedRect(_path, _width, _height, _radius)
{
    const x = - _width * 0.5
    const y = - _height * 0.5
    const r = _radius

    _path.moveTo(x + r, y)
    _path.lineTo(x + _width - r, y)
    _path.absarc(x + _width - r, y + r, r, - Math.PI * 0.5, 0, false)
    _path.lineTo(x + _width, y + _height - r)
    _path.absarc(x + _width - r, y + _height - r, r, 0, Math.PI * 0.5, false)
    _path.lineTo(x + r, y + _height)
    _path.absarc(x + r, y + _height - r, r, Math.PI * 0.5, Math.PI, false)
    _path.lineTo(x, y + r)
    _path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)

    return _path
}

/**
 * The Instagram mark, for the plinth the Twitter bird used to stand on.
 *
 * The other three contact figures are modelled geometry rather than decals, so
 * this is extruded to match instead of being a textured plane. Shaded `orange`
 * because that is the shade the model's own logo figures use.
 *
 * @param _height  how tall the glyph stands, matching the neighbouring figures
 */
export function createInstagramGlyph(_z, _height = 1.15)
{
    const prop = new Prop()

    const body = roundedRect(new THREE.Shape(), _height, _height, _height * 0.3)
    body.holes.push(roundedRect(new THREE.Path(), _height * 0.76, _height * 0.76, _height * 0.21))

    const lens = new THREE.Shape()
    lens.absarc(0, 0, _height * 0.26, 0, Math.PI * 2, false)

    const lensHole = new THREE.Path()
    lensHole.absarc(0, 0, _height * 0.16, 0, Math.PI * 2, true)
    lens.holes.push(lensHole)

    const flash = new THREE.Shape()
    flash.absarc(_height * 0.26, _height * 0.26, _height * 0.075, 0, Math.PI * 2, false)

    const depth = 0.16
    const geometry = new THREE.ExtrudeGeometry([body, lens, flash], { depth, bevelEnabled: false })

    // Authored in XY extruded along +Z; standing it up puts height on Z and
    // turns the extrusion toward -Y, which is the face the figures present
    geometry.rotateX(Math.PI * 0.5)
    geometry.translate(0, depth * 0.5, _z)

    prop.custom('orange', geometry)

    // The plinth's own collider only reaches z 1.17, so the glyph needs its own
    prop.collision.add(Object.assign(new THREE.Object3D(), { name: 'cube' }))
    prop.collision.children[0].scale.set(_height, 0.3, _height)
    prop.collision.children[0].position.set(0, 0, _z)

    return prop.toOptions(0, 0, 0, 0)
}

/**
 * The university, for the education marker in the information section.
 *
 * A classical block: steps up to a portico of columns under a pediment, with a
 * tower behind carrying the crest. The tower is what makes the logo readable —
 * a pediment is too shallow to hold a round emblem at this scale, and the wall
 * behind the portico is hidden by its own columns.
 */
export function createUniversity(_screens = {})
{
    const prop = new Prop()

    const blockDepth = 5.4
    const blockFront = 0.4 - blockDepth * 0.5
    const porticoY = blockFront - 0.3
    const roofZ = 4.0

    // Base and entrance steps
    prop.box('white', [11.0, 6.5, 0.4], [0, 0.4, 0.2], [0, 0, 0], true)
    prop.box('white', [5.4, 0.9, 0.22], [0, blockFront - 1.3, 0.51])
    prop.box('white', [6.2, 0.5, 0.22], [0, blockFront - 0.9, 0.73])

    // Main block, and the doorway recess under the portico
    prop.box('beige', [10.0, blockDepth, 3.4], [0, 0.4, 2.3], [0, 0, 0], true)
    prop.box('brown', [2.2, 0.12, 2.1], [0, blockFront - 0.07, 1.9])

    // Windows either side of the portico, two floors
    for(const x of [- 4.2, - 3.5, 3.5, 4.2])
    {
        for(const z of [1.75, 3.0])
        {
            prop.box('blue', [0.5, 0.1, 0.8], [x, blockFront - 0.06, z])
        }
    }

    // Portico: six columns carrying an entablature
    const columnGeometry = new THREE.CylinderGeometry(0.26, 0.26, 3.0, 10)
    columnGeometry.rotateX(Math.PI * 0.5)

    for(const x of [- 3.5, - 2.1, - 0.7, 0.7, 2.1, 3.5])
    {
        prop.custom('white', columnGeometry.clone(), [x, porticoY, 2.1])
    }

    prop.box('white', [8.6, 1.3, 0.55], [0, porticoY, 3.87])

    // Pediment — a triangle extruded back over the entablature
    const pedimentWidth = 9.0
    const pedimentHeight = 1.3
    const pedimentDepth = 1.3

    const shape = new THREE.Shape()
    shape.moveTo(- pedimentWidth * 0.5, 0)
    shape.lineTo(pedimentWidth * 0.5, 0)
    shape.lineTo(0, pedimentHeight)
    shape.closePath()

    const pedimentGeometry = new THREE.ExtrudeGeometry(shape, { depth: pedimentDepth, bevelEnabled: false })
    // Authored in XY extruded along +Z; stand it up so height runs along Z
    pedimentGeometry.rotateX(Math.PI * 0.5)
    pedimentGeometry.translate(0, porticoY + pedimentDepth * 0.5, roofZ + 0.15)

    prop.custom('white', pedimentGeometry)

    // Tower behind the pediment, crest on its front face
    const towerY = 0.9
    const towerDepth = 3.2

    prop.box('beige', [3.4, towerDepth, 3.8], [0, towerY, roofZ + 1.9])
    prop.box('white', [3.8, towerDepth + 0.4, 0.28], [0, towerY, roofZ + 3.94])
    prop.box('emeraldGreen', [2.6, towerDepth - 0.6, 0.5], [0, towerY, roofZ + 4.33])

    // Sits clear of the pediment apex (roofZ + 0.15 + 1.3 = 5.45)
    prop.image(
        _screens.logo,
        [2.2, 2.2],
        [0, towerY - towerDepth * 0.5 - 0.03, roofZ + 2.3],
        [0, 0, 0],
        true
    )

    return prop.toOptions(0, 0, 0, FACING, { sizeX: 12, sizeY: 12, offsetZ: - 0.1, alpha: 0.35 })
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

/**
 * Finishes a mark that stands on the ground rather than on a plinth.
 *
 * `Prop.toOptions` returns `mass: 0` because every plinth prop is static
 * scenery. A mark standing in the open wants a shadow of its own and a bounce
 * sound whatever its weight, and a mass if it is meant to be driven into —
 * which the pad badges are, like the intro letters. Leave the mass at 0 for one
 * that should stay put.
 */
function makeStanding(_options, _width, _height, _mass)
{
    _options.mass = _mass
    _options.soundName = 'brick'
    // Matches BlockText's ratio — the folio's blob shadows are a good deal
    // wider than the object casting them
    _options.shadow = { sizeX: _width * 1.6, sizeY: _width * 1.6, offsetZ: - _height * 0.5, alpha: 0.4 }

    return _options
}

/**
 * Stands an extruded-in-XY geometry up on the floor.
 *
 * Shapes in here are authored y-up in the XY plane and extruded along +Z, the
 * same convention BlockText uses. A quarter turn on X puts their height on Z
 * and turns the extruded face toward -Y, which is the side `FACING` then
 * swings around to the camera. The geometry is centred on its own origin so
 * the mesh, the physics box and the shadow all share one pivot.
 *
 * @returns the world-space [width, thickness, height] of the result
 */
function standUp(_geometry, _height, _yDown = false)
{
    _geometry.computeBoundingBox()

    const authored = _geometry.boundingBox
    const scale = _height / (authored.max.y - authored.min.y)

    // Depth is left alone — it is already specified in world units
    _geometry.scale(scale, scale, 1)
    // Artwork taken from an SVG is authored y-down, so it stands up through the
    // opposite quarter turn. Turning it rather than mirroring it matters: a
    // negative scale would flip the winding and leave every face inside out.
    _geometry.rotateX(_yDown ? - Math.PI * 0.5 : Math.PI * 0.5)
    _geometry.computeBoundingBox()

    const box = _geometry.boundingBox
    _geometry.translate(
        - (box.min.x + box.max.x) * 0.5,
        - (box.min.y + box.max.y) * 0.5,
        - (box.min.z + box.max.z) * 0.5
    )

    return [box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z]
}

// How thick a store mark stands relative to its height — measured at 2.2 units
// tall, where a depth of 0.42 looked right.
//
// It has to scale with the mark rather than be fixed: a flat 0.42 on a 1.5-tall
// pad badge is a third of its height, and comes out as a lump of shaded side
// faces rather than a logo.
const DEPTH_RATIO = 0.42 / 2.2

/**
 * The Apple mark, for badging a project's App Store pad.
 *
 * Taken as SVG path data and extruded, rather than drawn from bezier curves by
 * hand. Hand-authoring it was the first attempt and it was not close enough:
 * the bite kept cutting into the right shoulder, so the lobe above it came out
 * as a thin horn instead of a round one, and the notch between the two humps
 * read as a deep V rather than a shallow dip.
 *
 * Body and leaf are kept as two separate <path> elements on purpose. As
 * subpaths of one path they are subject to the fill rule, and whether the leaf
 * came back as its own shape or as a hole in the body would depend on it.
 */
const APPLE_BODY = 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09z'
const APPLE_LEAF = 'M15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701'

export function createAppStoreMark(_height = 2.2, _options = {})
{
    const prop = new Prop()
    const depth = _options.depth ?? _height * DEPTH_RATIO

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${APPLE_BODY}"/><path d="${APPLE_LEAF}"/></svg>`
    const shapes = new SVGLoader().parse(svg).paths.flatMap((_path) => SVGLoader.createShapes(_path))

    const geometry = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false })
    const [width, thickness, height] = standUp(geometry, _height, true)

    prop.custom('white', geometry)

    const collider = new THREE.Object3D()
    collider.name = 'cube'
    collider.scale.set(width, thickness, height)
    prop.collision.add(collider)

    return makeStanding(prop.toOptions(0, 0, height * 0.5, FACING), width, height, _options.mass ?? 0)
}

/**
 * The Google Play mark, for badging a project's Play Store pad.
 *
 * Four triangles meeting at one interior point: the outer corners are the top
 * and bottom of the left edge, the midpoint between them, and the tip on the
 * right. Every facet is its own mesh because the shade parser assigns a matcap
 * per mesh name, which is what makes the four colours possible without a
 * single texture.
 */
export function createPlayStoreMark(_height = 2.2, _options = {})
{
    const prop = new Prop()
    const depth = _options.depth ?? _height * DEPTH_RATIO
    const width = _height * 0.86

    // Green reads at the top, blue down the left edge, yellow along the top of
    // the point and red underneath it. Swap these four names to re-order the
    // facets — nothing else depends on them.
    const shades = { topLeft: 'green', bottomLeft: 'blue', topRight: 'yellow', bottomRight: 'red' }

    // Centred on the origin so the mark spins about its middle when hit
    const top = [- width * 0.5, _height * 0.5]
    const bottom = [- width * 0.5, - _height * 0.5]
    const hinge = [- width * 0.5, 0]
    const tip = [width * 0.5, 0]
    // Where the four facets meet, a little over a third of the way to the tip
    const centre = [- width * 0.5 + width * 0.38, 0]

    const facets = [
        [shades.topLeft, top, hinge, centre],
        [shades.bottomLeft, hinge, bottom, centre],
        [shades.bottomRight, bottom, tip, centre],
        [shades.topRight, tip, top, centre]
    ]

    // Every facet is standing up by the same transform, so they stay aligned
    for(const [_shade, _a, _b, _c] of facets)
    {
        const shape = new THREE.Shape()
        shape.moveTo(..._a)
        shape.lineTo(..._b)
        shape.lineTo(..._c)
        shape.closePath()

        const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })

        // Authored already at final world size, so there is nothing to scale —
        // just stand it up and centre the extrusion on the mark's own plane
        geometry.rotateX(Math.PI * 0.5)
        geometry.translate(0, depth * 0.5, 0)

        prop.custom(_shade, geometry)
    }

    const collider = new THREE.Object3D()
    collider.name = 'cube'
    collider.scale.set(width, depth, _height)
    prop.collision.add(collider)

    return makeStanding(prop.toOptions(0, 0, _height * 0.5, FACING), width, _height, _options.mass ?? 0)
}

/**
 * The store marks by name, so a project can build one from the `mark` string on
 * a link in Content.js without knowing which function draws it.
 */
export const storeMarks = {
    appStore: createAppStoreMark,
    playStore: createPlayStoreMark
}

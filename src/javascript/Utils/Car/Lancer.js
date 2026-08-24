import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

/**
 * A 2004 Mitsubishi Lancer, sport trim, built from primitives at runtime — the
 * same approach Utils/Props.js takes for the crossroads props, so no modelled
 * asset is needed.
 *
 * Everything here is authored in the chassis object's own frame, which is what
 * Car.js positions from physics every tick:
 *
 *   +X  forward (nose)      +Y  left        +Z  up
 *   origin  = physics body position + Car.chassis.offset (0, 0, -0.28)
 *   ground  = z -0.07
 *   wheels  = front x ±0.60, rear x -0.60, y ±0.39, z 0.18, radius 0.25
 *
 * Those wheel positions come out of Physics.js and the raycast vehicle places
 * the wheel meshes itself, so the arches are cut to sit on them rather than the
 * other way round. They were moved to a centred wheelbase for this body — see
 * the note on wheelFrontOffsetDepth in Physics.js.
 *
 * Mesh names carry the shade: `Objects.getConvertedMesh` looks the material up
 * from the name, so `shadeNavy` finds the generated navy paint matcap and
 * `pureRed` / `pureYellow` find the lamp materials Car.js then overrides.
 */

// The Mesh constructor needs something; the shade parser replaces it.
const placeholderMaterial = new THREE.MeshBasicMaterial()

const shadeName = (_shade) => `shade${_shade.substring(0, 1).toUpperCase()}${_shade.substring(1)}`

class Model
{
    constructor()
    {
        this.scene = new THREE.Object3D()
    }

    mesh(_name, _geometry, _position = [0, 0, 0], _rotation = [0, 0, 0])
    {
        const mesh = new THREE.Mesh(_geometry, placeholderMaterial)
        mesh.name = _name
        mesh.position.set(..._position)
        mesh.rotation.set(..._rotation)
        this.scene.add(mesh)

        return this
    }

    box(_shade, _size, _position, _rotation = [0, 0, 0])
    {
        return this.mesh(shadeName(_shade), new THREE.BoxGeometry(..._size), _position, _rotation)
    }

    /**
     * A cylinder lying along an axis. Three's cylinders are built along Y,
     * which is already the axle direction for a wheel.
     */
    cylinder(_shade, _radius, _length, _position, _axis = 'y', _segments = 20)
    {
        const geometry = new THREE.CylinderGeometry(_radius, _radius, _length, _segments)
        const rotation = _axis === 'x' ? [0, 0, Math.PI * 0.5] : _axis === 'z' ? [Math.PI * 0.5, 0, 0] : [0, 0, 0]

        return this.mesh(shadeName(_shade), geometry, _position, rotation)
    }

    /**
     * Marks the pivot. `getConvertedMesh` moves the container here and makes
     * every child relative to it, which is how the antenna ends up rotating
     * about its base rather than about the middle of the car.
     */
    center(_position)
    {
        const node = new THREE.Object3D()
        node.name = 'center'
        node.position.set(..._position)
        this.scene.add(node)

        return this
    }
}

/**
 * Extrudes a side-profile outline into a solid body.
 *
 * The outline is drawn in XZ — the view the photographs show best — as a list
 * of [x, z] points, with `['arch', x, z, radius]` cutting a wheel arch as a
 * semicircle over the top rather than a corner. It is authored in XY and
 * extruded along +Z, then stood up so height runs along Z and the extrusion
 * becomes the car's width, centred on y = 0.
 */
function extrudeProfile(_points, _width, _bevel = 0.02)
{
    const shape = new THREE.Shape()

    _points.forEach((_point, _index) =>
    {
        if(_point[0] === 'arch')
        {
            const [, x, y, radius] = _point
            // From PI to 0 with decreasing angle passes over the top, so the
            // arc bites upward into the body instead of bulging below it
            shape.absarc(x, y, radius, Math.PI, 0, true)
        }
        else if(_index === 0)
        {
            shape.moveTo(_point[0], _point[1])
        }
        else
        {
            shape.lineTo(_point[0], _point[1])
        }
    })

    shape.closePath()

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: _width,
        bevelEnabled: _bevel > 0,
        bevelThickness: _bevel,
        bevelSize: _bevel,
        bevelOffset: 0,
        bevelSegments: 2
    })

    geometry.rotateX(Math.PI * 0.5)
    geometry.translate(0, _width * 0.5, 0)

    return geometry
}

/**
 * The three-diamond mark, from Mitsubishi's own artwork.
 *
 * It was three rhombi placed by hand before, which did not survive contact
 * with the real thing: the mark is three rhombi meeting at a single shared
 * vertex, each pointing outward, and getting that junction right by eye at
 * this size is hopeless. Each subpath is its own <path> so the fill rule
 * cannot decide one of them is a hole in another.
 *
 * The artwork is y-down like all SVG, so it stands up through the opposite
 * quarter turn — rotated rather than mirrored, or the winding flips and the
 * faces end up inside out.
 */
const MITSUBISHI = [
    'm112.45 0 38.42 65.13-38.42 65.12L74.03 65.6Z',
    'M112.45 130.25h74.96l37.49 63.72h-74.97z',
    'M112.45 130.25H37.48L0 193.97h74.97z'
]

/**
 * @param _size    width of the whole mark, in world units
 * @param _facing  +1 to face the nose, -1 to face the tail
 */
function createBadgeGeometry(_size, _facing)
{
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 224.9 193.97">${MITSUBISHI.map((_d) => `<path d="${_d}"/>`).join('')}</svg>`
    const shapes = new SVGLoader().parse(svg).paths.flatMap((_path) => SVGLoader.createShapes(_path))

    // Thickness is given in world units and left unscaled below, so it does
    // not shrink along with the artwork
    const geometry = new THREE.ExtrudeGeometry(shapes, { depth: 0.018, bevelEnabled: false })

    geometry.computeBoundingBox()
    const authored = geometry.boundingBox
    geometry.scale(_size / (authored.max.x - authored.min.x), _size / (authored.max.x - authored.min.x), 1)

    // Up-in-the-artwork to up-in-the-world, then turned to face along X
    geometry.rotateX(- Math.PI * 0.5)
    geometry.rotateZ(_facing > 0 ? - Math.PI * 0.5 : Math.PI * 0.5)

    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    geometry.translate(
        - (box.min.x + box.max.x) * 0.5,
        - (box.min.y + box.max.y) * 0.5,
        - (box.min.z + box.max.z) * 0.5
    )

    return geometry
}

/**
 * Places a flat panel along a line drawn on the side profile, so glass follows
 * the same points the body outline was built from instead of being eyeballed.
 *
 * `_lift` pushes it out along the line's normal, clear of the paint underneath.
 */
function panelAlong(_from, _to, _width, _thickness, _lift)
{
    const dx = _to[0] - _from[0]
    const dz = _to[1] - _from[1]
    const length = Math.hypot(dx, dz)

    // A box turned by this about Y lies along the line: unrotated it runs on X,
    // and rotating by -atan2 swings it onto the line's heading in XZ
    const rotationY = - Math.atan2(dz, dx)

    // Outward normal, away from the cabin the panel skins
    const normal = [- dz / length, dx / length]
    const sign = normal[1] < 0 ? - 1 : 1

    return {
        size: [length, _width, _thickness],
        position: [
            (_from[0] + _to[0]) * 0.5 + normal[0] * _lift * sign,
            0,
            (_from[1] + _to[1]) * 0.5 + normal[1] * _lift * sign
        ],
        rotation: [0, rotationY, 0]
    }
}

const NAVY = 'navy'

/**
 * The body: paint, glass, bumpers, lamps, the boot spoiler that marks this as
 * the sport trim, and the badges.
 *
 * The profile is set out around the two wheel positions, with equal overhangs
 * front and rear. The cabin sits between the axles the way a saloon's does,
 * which leaves a long bonnet ahead of it and a boot deck behind for the
 * spoiler to stand on rather than having it hang off the roof.
 */

// Points shared by the outline and the glass, so the two cannot drift apart
const WINDSCREEN = [[0.18, 0.60], [- 0.10, 0.91]]
const REAR_SCREEN = [[- 0.50, 0.92], [- 0.70, 0.62]]

function createChassis()
{
    const model = new Model()

    const bodyWidth = 1.0
    const cabinWidth = 0.86
    const cabinHalf = cabinWidth * 0.5

    // Bottom edge runs forward at z 0.16 with an arch cut over each wheel, then
    // up the nose, back along a long flat bonnet and waistline, over the boot
    // and down the rear panel.
    model.mesh(shadeName(NAVY), extrudeProfile([
        [- 1.02, 0.30],
        [- 1.00, 0.16],
        [- 0.90, 0.16],
        ['arch', - 0.60, 0.16, 0.30],
        [0.30, 0.16],
        ['arch', 0.60, 0.16, 0.30],
        [1.00, 0.16],
        [1.02, 0.30],
        [1.02, 0.46],
        [0.94, 0.585],
        [0.60, 0.615],
        [0.20, 0.62],
        [- 0.66, 0.62],
        [- 0.80, 0.665],
        [- 0.99, 0.655],
        [- 1.02, 0.50]
    ], bodyWidth))

    // Cabin, painted like the rest of the car. The roof is part of this rather
    // than a separate cap on top of dark glass, which is what made the first
    // attempt read as a luggage box strapped to the roof.
    model.mesh(shadeName(NAVY), extrudeProfile([
        WINDSCREEN[0],
        WINDSCREEN[1],
        REAR_SCREEN[0],
        REAR_SCREEN[1]
    ], cabinWidth, 0.012))

    // Glass, laid onto the cabin's own outline
    for(const [from, to] of [WINDSCREEN, [REAR_SCREEN[1], REAR_SCREEN[0]]])
    {
        const panel = panelAlong(from, to, cabinWidth - 0.06, 0.03, 0.022)
        model.box('glass', panel.size, panel.position, panel.rotation)
    }

    // Side glass. Kept well inside the cabin outline so its corners do not poke
    // through where the pillars slope away.
    model.box('glass', [0.38, 0.02, 0.18], [- 0.24, cabinHalf + 0.007, 0.75])
    model.box('glass', [0.38, 0.02, 0.18], [- 0.24, - cabinHalf - 0.007, 0.75])

    // Bumpers, valances and sills
    model.box('black', [0.14, 0.94, 0.15], [0.985, 0, 0.235])
    model.box('black', [0.12, 0.92, 0.15], [- 1.00, 0, 0.235])
    // Sills stop short of both arches. At 1.10 long this ran on into the front
    // arch, where the profile is cut away for the wheel, and hung there as a
    // black bar stuck to the tyre with nothing behind it.
    model.box('black', [0.58, 0.045, 0.09], [0, 0.502, 0.215])
    model.box('black', [0.58, 0.045, 0.09], [0, - 0.502, 0.215])

    // Grille, with the chrome brow the 2004 car wears above it
    model.box('black', [0.05, 0.52, 0.14], [1.005, 0, 0.40])
    model.box('white', [0.06, 0.56, 0.03], [1.008, 0, 0.475])

    // Headlights, swept back along the wings
    model.box('white', [0.16, 0.30, 0.11], [0.925, 0.32, 0.50], [0, 0, - 0.14])
    model.box('white', [0.16, 0.30, 0.11], [0.925, - 0.32, 0.50], [0, 0, 0.14])

    // Fog lights in the valance
    model.cylinder('white', 0.035, 0.04, [1.055, 0.32, 0.235], 'x', 12)
    model.cylinder('white', 0.035, 0.04, [1.055, - 0.32, 0.235], 'x', 12)

    // Tail lamp housings — the lit red/yellow faces are separate objects that
    // Car.js drives from the brake and reverse controls
    model.box('white', [0.04, 0.24, 0.18], [- 1.01, 0.31, 0.47])
    model.box('white', [0.04, 0.24, 0.18], [- 1.01, - 0.31, 0.47])

    // Mirrors
    model.box('black', [0.08, 0.11, 0.055], [0.14, 0.50, 0.63])
    model.box('black', [0.08, 0.11, 0.055], [0.14, - 0.50, 0.63])

    // Door handles
    for(const x of [0.05, - 0.38])
    {
        model.box('black', [0.11, 0.035, 0.035], [x, 0.505, 0.55])
        model.box('black', [0.11, 0.035, 0.035], [x, - 0.505, 0.55])
    }

    // The spoiler. This is what separates the sport trim from the base car in
    // the photographs: a blade lifted off the boot lid on two pedestals, set
    // well behind the rear screen so it reads as a boot wing.
    model.box(NAVY, [0.10, 0.07, 0.11], [- 0.80, 0.34, 0.715])
    model.box(NAVY, [0.10, 0.07, 0.11], [- 0.80, - 0.34, 0.715])
    model.box(NAVY, [0.22, 0.88, 0.05], [- 0.80, 0, 0.795])

    // Chrome exhaust tip
    model.cylinder('white', 0.05, 0.10, [- 1.045, - 0.30, 0.205], 'x', 12)

    // Badges: centred on the grille, and on the rear panel between the lamps
    model.mesh(shadeName('white'), createBadgeGeometry(0.115, 1), [1.045, 0, 0.405])
    model.mesh(shadeName('white'), createBadgeGeometry(0.10, - 1), [- 1.042, 0, 0.445])

    return model
}

/**
 * One wheel, in its own frame: the raycast vehicle drives each of the four
 * from physics, so this is centred on the origin with the axle along Y.
 */
function createWheel()
{
    const model = new Model()

    const radius = 0.25
    const width = 0.24

    model.cylinder('black', radius, width, [0, 0, 0], 'y', 24)

    // Alloy face, just proud of the tyre on both sides
    model.cylinder('white', 0.165, width + 0.01, [0, 0, 0], 'y', 24)
    model.cylinder('gray', 0.055, width + 0.02, [0, 0, 0], 'y', 12)

    // Ten spokes, the multi-spoke wheel the sport car wears
    for(let i = 0; i < 10; i++)
    {
        const angle = (i / 10) * Math.PI * 2
        model.box(
            'white',
            [0.032, width + 0.008, 0.17],
            [Math.sin(angle) * 0.088, 0, Math.cos(angle) * 0.088],
            [0, angle, 0]
        )
    }

    return model
}

/**
 * The lit faces of the tail lamps. Car.js swaps their materials for the shared
 * brake/reverse ones and fades them with the controls, so the shade here only
 * has to route through a parser.
 */
function createBackLights(_shade, _z, _height)
{
    const model = new Model()

    model.mesh(_shade, new THREE.BoxGeometry(0.02, 0.20, _height), [- 1.035, 0.31, _z])
    model.mesh(_shade, new THREE.BoxGeometry(0.02, 0.20, _height), [- 1.035, - 0.31, _z])

    return model
}

/**
 * A short mast at the back of the roof. The `center` node is the pivot Car.js
 * swings as the car accelerates.
 */
function createAntena()
{
    const model = new Model()

    model.center([- 0.46, 0.28, 0.93])
    model.cylinder('black', 0.03, 0.03, [- 0.46, 0.28, 0.945], 'y', 10)
    model.cylinder('black', 0.013, 0.28, [- 0.46, 0.28, 1.10], 'y', 8)

    return model
}

/**
 * Built to the same shape the GLB resources have — `{ scene }` — so Car.js can
 * use these in place of the loaded models without caring where they came from.
 */
export function createLancerModels()
{
    return {
        chassis: createChassis(),
        wheel: createWheel(),
        backLightsBrake: createBackLights('pureRed', 0.515, 0.10),
        backLightsReverse: createBackLights('pureYellow', 0.415, 0.06),
        antena: createAntena()
    }
}

import * as THREE from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import fontSource from 'three/examples/fonts/helvetiker_bold.typeface.json'

export const font = new FontLoader().parse(fontSource)

// Placeholder material — the Objects parser swaps in the real matcap shade
// based on the mesh name, but a Mesh still needs something at construction.
const placeholderMaterial = new THREE.MeshBasicMaterial()

/**
 * Cap height of the font at size 1, measured once, so callers can ask for a
 * height in world units instead of guessing a font size.
 */
export const capHeightRatio = (() =>
{
    const geometry = new TextGeometry('H', { font, size: 1, depth: 1, curveSegments: 1, bevelEnabled: false })
    geometry.computeBoundingBox()

    const ratio = geometry.boundingBox.max.y - geometry.boundingBox.min.y
    geometry.dispose()

    return ratio
})()

/**
 * Builds upright extruded block letters for a string, one physical object per
 * glyph (or per word), sized to match the original folio's letter models:
 * ~0.84 wide, 0.43 thick, 1.39 tall, standing on the floor about 0.16 apart.
 *
 * Returns an array of option objects ready to hand straight to `objects.add()`.
 */
export function createBlockText(_text, _options = {})
{
    const options = {
        x: 0,
        y: 0,
        capHeight: 1.39,
        thickness: 0.43,
        // Helvetiker is wider than the folio's original letter models — condense
        // it to their 0.84-wide / 1.39-tall proportions so long names still fit
        widthRatio: 0.72,
        letterSpacing: 0.16,
        wordSpacing: 0.55,
        groupBy: 'letter', // 'letter' | 'word'
        shade: 'white',
        mass: 1.5,
        soundName: 'brick',
        ..._options
    }

    const size = options.capHeight / capHeightRatio
    const shadeName = `shade${options.shade.substring(0, 1).toUpperCase()}${options.shade.substring(1)}`

    // Shadows in the original are a soft blob a good deal wider than the
    // letter itself — keep that ratio whatever cap height is asked for.
    const shadowScale = options.capHeight / 1.39

    const tokens = options.groupBy === 'word' ? _text.split(/\s+/).filter((_word) => _word !== '') : [..._text]

    // First pass — build and measure every token, laying them out left to right
    const pieces = []
    let cursor = 0

    for(const _token of tokens)
    {
        if(_token === ' ')
        {
            cursor += options.wordSpacing
            continue
        }

        // Drop anything the font has no glyph for rather than throwing
        const drawable = [..._token].filter((_character) => typeof font.data.glyphs[_character] !== 'undefined').join('')
        if(drawable === '')
        {
            continue
        }

        const geometry = new TextGeometry(drawable, {
            font,
            size,
            depth: options.thickness,
            curveSegments: 5,
            bevelEnabled: true,
            bevelThickness: 0.015,
            bevelSize: 0.015,
            bevelOffset: 0,
            bevelSegments: 1
        })

        geometry.scale(options.widthRatio, 1, 1)

        // Stand the text up. It is authored in XY extruded along +Z; the world
        // is Z-up and the camera sits to the south, so a quarter turn on X
        // makes it upright and facing the camera.
        geometry.rotateX(Math.PI * 0.5)
        geometry.computeBoundingBox()

        const box = geometry.boundingBox
        const width = box.max.x - box.min.x
        const thickness = box.max.y - box.min.y
        const height = box.max.z - box.min.z

        // Centre the geometry on its own origin so the mesh, the physics box
        // and the shadow all share a single pivot
        geometry.translate(
            - (box.min.x + box.max.x) * 0.5,
            - (box.min.y + box.max.y) * 0.5,
            - (box.min.z + box.max.z) * 0.5
        )

        pieces.push({ geometry, width, thickness, height, left: cursor })

        cursor += width + (options.groupBy === 'word' ? options.wordSpacing : options.letterSpacing)
    }

    if(pieces.length === 0)
    {
        return []
    }

    // Second pass — centre the whole line on the requested position and wrap
    // each piece in the base/collision pair that `objects.add()` expects
    const totalWidth = cursor - (options.groupBy === 'word' ? options.wordSpacing : options.letterSpacing)
    const startX = options.x - totalWidth * 0.5

    return pieces.map((_piece) =>
    {
        const mesh = new THREE.Mesh(_piece.geometry, placeholderMaterial)
        mesh.name = shadeName

        const base = new THREE.Object3D()
        base.add(mesh)

        // Physics reads name + scale off the node; scale is the full extent
        const collisionBox = new THREE.Object3D()
        collisionBox.name = 'cube'
        collisionBox.scale.set(_piece.width, _piece.thickness, _piece.height)

        const collision = new THREE.Object3D()
        collision.add(collisionBox)

        return {
            base,
            collision,
            offset: new THREE.Vector3(startX + _piece.left + _piece.width * 0.5, options.y, _piece.height * 0.5),
            rotation: new THREE.Euler(0, 0, 0),
            shadow: { sizeX: 1.5 * shadowScale, sizeY: 1.5 * shadowScale, offsetZ: - _piece.height * 0.5, alpha: 0.4 },
            mass: options.mass,
            soundName: options.soundName
        }
    })
}

import * as THREE from 'three'

/**
 * Paints a matcap (lit-sphere) texture on a canvas.
 *
 * The folio's matcaps are all PNGs under static/models/matcaps, and the shade
 * parser looks a material up by mesh name — so a colour that has no PNG cannot
 * be used. Rather than commit another binary for one car, this draws the same
 * kind of image at runtime: a sphere lit from the upper left, with a rim light
 * and a specular hit, which is all a matcap of a painted surface really is.
 *
 * A matcap is sampled by the surface normal, so the disc has to fill the
 * square: the centre of the image is the part of the surface facing the camera
 * and the edge is the part turned fully away.
 */
export function createMatcapTexture(_options = {})
{
    const options = {
        // Deepest tone, at the edge where the surface turns away. Kept well
        // clear of black: the matcap shader darkens further with its indirect
        // term, and a shadow this colour is what made the first attempt read
        // as a black car rather than a navy one.
        shadow: '#16294a',
        // The body colour, across most of the surface
        base: '#2d5896',
        // Where the key light lands
        light: '#78b0ea',
        // Thin brighter edge, the giveaway that a surface is glossy
        rim: '#96c4f4',
        specular: '#eef5ff',
        size: 256,
        ..._options
    }

    const size = options.size
    const half = size * 0.5

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')

    // Outside the disc is never sampled, but filling it keeps the edge from
    // bleeding transparent pixels when the texture is filtered
    context.fillStyle = options.shadow
    context.fillRect(0, 0, size, size)

    context.save()
    context.beginPath()
    context.arc(half, half, half, 0, Math.PI * 2)
    context.clip()

    context.fillStyle = options.base
    context.fillRect(0, 0, size, size)

    // Key light, upper left
    const keyX = size * 0.36
    const keyY = size * 0.28
    const key = context.createRadialGradient(keyX, keyY, 0, keyX, keyY, size * 0.62)
    key.addColorStop(0, options.light)
    key.addColorStop(1, 'rgba(0, 0, 0, 0)')
    context.fillStyle = key
    context.fillRect(0, 0, size, size)

    // Shadow gathering in the lower right, opposite the key
    const fillX = size * 0.72
    const fillY = size * 0.78
    const fill = context.createRadialGradient(fillX, fillY, 0, fillX, fillY, size * 0.5)
    fill.addColorStop(0, options.shadow)
    fill.addColorStop(0.6, 'rgba(0, 0, 0, 0)')
    fill.addColorStop(1, 'rgba(0, 0, 0, 0)')
    context.fillStyle = fill
    context.fillRect(0, 0, size, size)

    // Rim: only the outer band, where the surface is edge-on to the camera
    const rim = context.createRadialGradient(half, half, size * 0.34, half, half, half)
    rim.addColorStop(0, 'rgba(0, 0, 0, 0)')
    rim.addColorStop(0.82, 'rgba(0, 0, 0, 0)')
    rim.addColorStop(1, options.rim)
    context.fillStyle = rim
    context.fillRect(0, 0, size, size)

    // Specular
    const specX = size * 0.33
    const specY = size * 0.24
    const spec = context.createRadialGradient(specX, specY, 0, specX, specY, size * 0.13)
    spec.addColorStop(0, options.specular)
    spec.addColorStop(1, 'rgba(255, 255, 255, 0)')
    context.fillStyle = spec
    context.fillRect(0, 0, size, size)

    context.restore()

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true

    return texture
}

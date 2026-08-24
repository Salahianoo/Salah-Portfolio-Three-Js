import * as THREE from 'three'

/**
 * Draws lines of text onto an offscreen canvas.
 * Used to generate simple text-based art (name plates, labels, slides)
 * without needing pre-baked image assets.
 */
function drawTextCanvas(lines, _options = {})
{
    const options = {
        width: 1024,
        height: 512,
        background: '#000000',
        ..._options
    }

    const canvas = document.createElement('canvas')
    canvas.width = options.width
    canvas.height = options.height

    const context = canvas.getContext('2d')
    context.fillStyle = options.background
    context.fillRect(0, 0, canvas.width, canvas.height)

    context.textBaseline = 'middle'

    for(const line of lines)
    {
        context.fillStyle = line.color || '#ffffff'
        context.textAlign = line.align || 'left'
        context.font = `${line.fontWeight || 700} ${line.fontSize}px ${line.fontFamily || 'Arial, sans-serif'}`

        // maxWidth condenses the glyphs to fit rather than clipping them, which
        // is what the folio's baked labels look like
        if(line.maxWidth)
        {
            context.fillText(line.text, line.x, line.y, line.maxWidth)
        }
        else
        {
            context.fillText(line.text, line.x, line.y)
        }
    }

    return canvas
}

/**
 * Picks the font size that makes a single line fill `maxWidth`.
 *
 * The labels in here are drawn on a fixed canvas and then mapped onto a plane,
 * so how big the lettering *looks* is set by how much of the canvas it covers,
 * not by its nominal size. A fixed size therefore reads inconsistently: long
 * strings overflow and get condensed back to the full width, while short ones
 * sit small in the middle of an otherwise empty canvas.
 *
 * The `min` floor is what keeps long strings behaving exactly as before — they
 * land under it, stay at the old size, and are condensed to width by `maxWidth`
 * as usual. Only strings short enough to have slack are scaled up.
 */
export function fitFontSize(_text, _options = {})
{
    const options = { maxWidth: 480, min: 50, max: 90, fontWeight: 900, fontFamily: 'Arial, sans-serif', ..._options }

    const reference = 100
    const context = document.createElement('canvas').getContext('2d')
    context.font = `${options.fontWeight} ${reference}px ${options.fontFamily}`

    const naturalWidth = context.measureText(_text).width
    if(naturalWidth === 0)
    {
        return options.min
    }

    const fitted = Math.round(reference * (options.maxWidth / naturalWidth))

    return Math.min(options.max, Math.max(options.min, fitted))
}

/**
 * Returns a THREE.CanvasTexture suitable for use as an alphaMap
 * (white text on black background, matching the project's existing label convention).
 */
export function createTextTexture(lines, _options = {})
{
    const canvas = drawTextCanvas(lines, _options)
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    return texture
}

/**
 * Returns a data URI image, for use anywhere a plain image URL/src is expected
 * (e.g. project board slide images) instead of a THREE texture.
 */
export function createTextImageDataURL(lines, _options = {})
{
    const canvas = drawTextCanvas(lines, _options)

    return canvas.toDataURL('image/png')
}

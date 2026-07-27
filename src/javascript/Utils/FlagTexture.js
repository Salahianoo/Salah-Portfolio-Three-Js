import * as THREE from 'three'

/**
 * Draws a seven-pointed star, one point facing up.
 */
function drawStar(_context, _x, _y, _outerRadius, _innerRadius)
{
    const points = 7

    _context.beginPath()

    for(let i = 0; i < points * 2; i++)
    {
        const radius = i % 2 === 0 ? _outerRadius : _innerRadius
        const angle = - Math.PI * 0.5 + (i * Math.PI) / points

        _context.lineTo(_x + Math.cos(angle) * radius, _y + Math.sin(angle) * radius)
    }

    _context.closePath()
    _context.fill()
}

/**
 * Flag of Jordan: black, white and green horizontal bands with a red chevron
 * at the hoist carrying a white seven-pointed star.
 */
export function createJordanFlagTexture()
{
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256

    const context = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const band = height / 3

    context.fillStyle = '#000000'
    context.fillRect(0, 0, width, band)

    context.fillStyle = '#ffffff'
    context.fillRect(0, band, width, band)

    context.fillStyle = '#007a3d'
    context.fillRect(0, band * 2, width, band)

    // Chevron, apex on the centreline a third of the way along
    context.fillStyle = '#ce1126'
    context.beginPath()
    context.moveTo(0, 0)
    context.lineTo(width / 3, height * 0.5)
    context.lineTo(0, height)
    context.closePath()
    context.fill()

    context.fillStyle = '#ffffff'
    drawStar(context, width * 0.13, height * 0.5, height * 0.15, height * 0.075)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true

    return texture
}

import EventEmitter from './EventEmitter.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

export default class Resources extends EventEmitter
{
    /**
     * Constructor
     */
    constructor()
    {
        super()

        this.setLoaders()

        this.toLoad = 0
        this.loaded = 0
        this.items = {}
    }

    /**
     * Set loaders
     */
    setLoaders()
    {
        this.loaders = []

        // Images
        this.loaders.push({
            extensions: ['jpg', 'png', 'webp'],
            action: (_resource) =>
            {
                const image = new Image()

                image.addEventListener('load', () =>
                {
                    this.fileLoadEnd(_resource, image)
                })

                image.addEventListener('error', () =>
                {
                    this.fileLoadEnd(_resource, image)
                })

                image.src = _resource.source
            }
        })

        // SVG
        //
        // Rasterised onto a canvas rather than handed straight to a texture.
        // These files carry a viewBox but no width/height, so an <img> has an
        // intrinsic ratio and no intrinsic size — the browser would fall back to
        // the 300x150 default object size and the screens would come out blurry.
        // Drawing at an explicit width keeps them sharp.
        this.loaders.push({
            extensions: ['svg'],
            action: (_resource) =>
            {
                const width = _resource.rasterWidth || 1024
                const image = new Image()

                image.addEventListener('load', () =>
                {
                    // Fall back to the decoded size if the viewBox is missing
                    const ratio = image.naturalWidth > 0 ? image.naturalHeight / image.naturalWidth : 1

                    const canvas = document.createElement('canvas')
                    canvas.width = width
                    canvas.height = Math.round(width * ratio)

                    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)

                    this.fileLoadEnd(_resource, canvas)
                })

                image.addEventListener('error', () =>
                {
                    console.warn(`Could not load ${_resource.source}`)
                    this.fileLoadEnd(_resource, document.createElement('canvas'))
                })

                image.src = _resource.source
            }
        })

        // Draco
        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('draco/')
        dracoLoader.setDecoderConfig({ type: 'js' })

        this.loaders.push({
            extensions: ['drc'],
            action: (_resource) =>
            {
                dracoLoader.load(_resource.source, (_data) =>
                {
                    this.fileLoadEnd(_resource, _data)

                    DRACOLoader.releaseDecoderModule()
                })
            }
        })

        // GLTF
        const gltfLoader = new GLTFLoader()
        gltfLoader.setDRACOLoader(dracoLoader)

        this.loaders.push({
            extensions: ['glb', 'gltf'],
            action: (_resource) =>
            {
                gltfLoader.load(_resource.source, (_data) =>
                {
                    this.fileLoadEnd(_resource, _data)
                })
            }
        })

        // FBX
        const fbxLoader = new FBXLoader()

        this.loaders.push({
            extensions: ['fbx'],
            action: (_resource) =>
            {
                fbxLoader.load(_resource.source, (_data) =>
                {
                    this.fileLoadEnd(_resource, _data)
                })
            }
        })
    }

    /**
     * Load
     */
    load(_resources = [])
    {
        for(const _resource of _resources)
        {
            this.toLoad++
            const extensionMatch = _resource.source.match(/\.([a-z]+)$/)

            if(typeof extensionMatch[1] !== 'undefined')
            {
                const extension = extensionMatch[1]
                const loader = this.loaders.find((_loader) => _loader.extensions.find((_extension) => _extension === extension))

                if(loader)
                {
                    loader.action(_resource)
                }
                else
                {
                    console.warn(`Cannot found loader for ${_resource}`)
                }
            }
            else
            {
                console.warn(`Cannot found extension of ${_resource}`)
            }
        }
    }

    /**
     * File load end
     */
    fileLoadEnd(_resource, _data)
    {
        this.loaded++
        this.items[_resource.name] = _data

        this.trigger('fileEnd', [_resource, _data])

        if(this.loaded === this.toLoad)
        {
            this.trigger('end')
        }
    }
}

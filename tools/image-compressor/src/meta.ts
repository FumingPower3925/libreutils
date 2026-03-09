export default {
    id: 'image-compressor',
    name: 'Image Compressor',
    description: 'Compress, resize, crop, and convert images with side-by-side preview. Supports JPEG, PNG, WebP, AVIF, GIF, BMP, and TIFF.',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
    category: 'image',
    tags: ['image', 'compress', 'resize', 'crop', 'jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'tiff', 'optimize', 'convert'],
    route: '/tools/image-compressor',
    standalone: true,
    attribution: {
        libraries: [],
        note: 'Uses built-in browser Canvas API for image processing.'
    }
};

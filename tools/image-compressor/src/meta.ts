export default {
    id: 'image-compressor',
    name: 'Image Compressor',
    description: 'Compress and resize images with quality control and side-by-side preview. Supports JPEG, PNG, and WebP.',
    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
    category: 'image',
    tags: ['image', 'compress', 'resize', 'jpeg', 'png', 'webp', 'optimize'],
    route: '/tools/image-compressor',
    standalone: true,
    attribution: {
        libraries: [],
        note: 'Uses built-in browser Canvas API for image processing.'
    }
};

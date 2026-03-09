import type { ToolMeta } from '@libreutils/shared';

export const meta: ToolMeta & { libraries: { name: string; url: string; license: string; description: string }[] } = {
    id: 'metadata-scrubber',
    name: 'Metadata Scrubber',
    description: 'Remove hidden metadata from images, PDFs, and documents to protect your privacy before sharing.',
    category: 'file',
    icon: 'shield',
    keywords: ['metadata', 'exif', 'scrub', 'strip', 'privacy', 'image', 'pdf', 'gps', 'location', 'iptc', 'xmp'],
    libraries: [
        {
            name: 'exifreader',
            url: 'https://github.com/mattiasw/exifreader',
            license: 'MIT',
            description: 'EXIF metadata parser',
        },
        {
            name: 'pdf-lib',
            url: 'https://github.com/Hopding/pdf-lib',
            license: 'MIT',
            description: 'PDF document manipulation',
        },
    ],
};

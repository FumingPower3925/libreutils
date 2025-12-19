export interface ToolMeta {
    id: string;
    name: string;
    description: string;
    category: 'encryption' | 'compression' | 'text' | 'image' | 'file' | 'conversion' | 'other';
    keywords?: string[];
    icon?: string;
}

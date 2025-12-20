/**
 * Component Registration Utility
 */

import { LuLayout } from '../components/Layout';
import { LuHeader } from '../components/Header';
import { LuFooter } from '../components/Footer';
import { LuCard } from '../components/Card';
import { LuCopyToClipboard } from '../components/CopyToClipboard';

interface ComponentClass {
    tagName: string;
    new(): HTMLElement;
}

const components: ComponentClass[] = [
    LuLayout,
    LuHeader,
    LuFooter,
    LuCard,
    LuCopyToClipboard,
];

export function registerComponents(): void {
    for (const Component of components) {
        if (!customElements.get(Component.tagName)) {
            customElements.define(Component.tagName, Component);
        }
    }
}

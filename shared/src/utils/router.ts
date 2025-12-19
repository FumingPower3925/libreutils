export interface Route {
    path: string;
    title: string;
    render: () => HTMLElement | Promise<HTMLElement>;
}

interface RouterOptions {
    routes: Route[];
    container: HTMLElement;
    notFound?: () => HTMLElement;
}

interface Router {
    navigate: (path: string) => void;
    destroy: () => void;
}

export function createRouter(options: RouterOptions): Router {
    const { routes, container, notFound } = options;

    async function handleRoute(): Promise<void> {
        const hash = window.location.hash.slice(1) || '/';
        const path = hash.split('?')[0];
        const route = routes.find(r => r.path === path);

        container.innerHTML = '';

        try {
            if (route) {
                document.title = `${route.title} | LibreUtils`;
                const element = await route.render();
                container.appendChild(element);
            } else if (notFound) {
                document.title = 'Not Found | LibreUtils';
                container.appendChild(notFound());
            } else {
                container.innerHTML = '<h1>Page not found</h1>';
            }
        } catch (error) {
            console.error('Route render error:', error);
            container.innerHTML = '<h1>Something went wrong</h1><p>Please try refreshing the page.</p>';
        }
    }

    handleRoute();
    window.addEventListener('hashchange', handleRoute);

    return {
        navigate(path: string): void {
            window.location.hash = path;
        },
        destroy(): void {
            window.removeEventListener('hashchange', handleRoute);
        },
    };
}

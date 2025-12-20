export interface Route {
    path: string;
    title: string;
    render: () => HTMLElement | Promise<HTMLElement>;
    onLeave?: () => void;
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
    let currentRoute: Route | null = null;

    async function handleRoute(): Promise<void> {
        const hash = window.location.hash.slice(1) || '/';
        const path = hash.split('?')[0];

        // Find new route
        const route = routes.find(r => r.path === path);

        // Execute cleanup for previous route if it exists and differs from new route (or even if same to be safe?)
        // Usually onLeave is strict transition.
        if (currentRoute && currentRoute.onLeave && currentRoute !== route) {
            try {
                currentRoute.onLeave();
            } catch (error) {
                console.error('Error in route cleanup:', error);
            }
        }

        currentRoute = route || null;

        container.innerHTML = '';
        window.scrollTo(0, 0);

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
            if (currentRoute && currentRoute.onLeave) {
                currentRoute.onLeave();
            }
            window.removeEventListener('hashchange', handleRoute);
        },
    };
}

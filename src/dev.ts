/**
 * Development Server
 */

const PORT = parseInt(process.env.PORT || '3000', 10);

console.log('Starting LibreUtils development server...');
console.log(`  Local: http://localhost:${PORT}`);

const server = Bun.serve({
    port: PORT,
    async fetch(req: Request) {
        const url = new URL(req.url);
        let pathname = url.pathname;

        if (pathname === '/' || !pathname.includes('.')) {
            pathname = '/index.html';
        }

        const srcPath = `./src${pathname}`;
        const srcFile = Bun.file(srcPath);

        if (await srcFile.exists()) {
            if (pathname.endsWith('.ts')) {
                try {
                    const result = await Bun.build({
                        entrypoints: [srcPath],
                        target: 'browser',
                        sourcemap: 'inline',
                    });

                    if (result.success && result.outputs[0]) {
                        return new Response(await result.outputs[0].text(), {
                            headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache' },
                        });
                    }
                } catch (error) {
                    console.error('Build error:', error);
                    return new Response(`console.error(${JSON.stringify(String(error))})`, {
                        headers: { 'Content-Type': 'application/javascript' },
                    });
                }
            }

            if (pathname === '/index.html') {
                let html = await srcFile.text();
                html = html.replace('./index.js', '/index.ts');
                html = html.replace('</head>', `<link rel="stylesheet" href="/styles.css">\n</head>`);
                return new Response(html, {
                    headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' },
                });
            }

            return new Response(srcFile, { headers: { 'Cache-Control': 'no-cache' } });
        }

        if (pathname === '/styles.css') {
            const cssFiles = [
                './shared/src/styles/variables.css',
                './shared/src/styles/base.css',
                './shared/src/styles/components.css',
            ];

            let combinedCss = '';
            for (const cssPath of cssFiles) {
                const file = Bun.file(cssPath);
                if (await file.exists()) {
                    combinedCss += await file.text() + '\n';
                }
            }

            return new Response(combinedCss, {
                headers: { 'Content-Type': 'text/css', 'Cache-Control': 'no-cache' },
            });
        }

        const publicPath = `./public${pathname}`;
        const publicFile = Bun.file(publicPath);

        if (await publicFile.exists()) {
            return new Response(publicFile);
        }

        return new Response('Not Found', { status: 404 });
    },
});

console.log(`Server running at http://localhost:${server.port}`);

export { };

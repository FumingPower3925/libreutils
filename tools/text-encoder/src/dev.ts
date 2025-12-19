/**
 * Development Server for Text Encoder Tool
 * 
 * A simple Bun-based development server for standalone tool development.
 */

const PORT = parseInt(process.env.PORT || '3001', 10);

console.log(`[*] Starting Text Encoder development server...`);
console.log(`   Local: http://localhost:${PORT}`);
console.log('');

const server = Bun.serve({
    port: PORT,
    async fetch(req: Request) {
        const url = new URL(req.url);
        let pathname = url.pathname;

        // Serve index.html for root
        if (pathname === '/' || !pathname.includes('.')) {
            pathname = '/index.html';
        }

        // Try to serve from src directory first
        const srcPath = `./src${pathname}`;
        const srcFile = Bun.file(srcPath);

        if (await srcFile.exists()) {
            // If it's a TypeScript file, bundle it on the fly
            if (pathname.endsWith('.ts')) {
                try {
                    const result = await Bun.build({
                        entrypoints: [srcPath],
                        target: 'browser',
                        sourcemap: 'inline',
                    });

                    if (result.success && result.outputs[0]) {
                        const text = await result.outputs[0].text();
                        return new Response(text, {
                            headers: {
                                'Content-Type': 'application/javascript',
                                'Cache-Control': 'no-cache',
                            },
                        });
                    }
                } catch (error) {
                    console.error('Build error:', error);
                    return new Response(`console.error(${JSON.stringify(String(error))})`, {
                        headers: { 'Content-Type': 'application/javascript' },
                    });
                }
            }

            // Handle index.html specially
            if (pathname === '/index.html') {
                let html = await srcFile.text();

                // Replace the JS reference
                html = html.replace('./standalone.js', '/standalone.ts');

                // Inject CSS
                const cssLink = `<link rel="stylesheet" href="/styles.css">`;
                html = html.replace('</head>', `${cssLink}\n</head>`);

                return new Response(html, {
                    headers: {
                        'Content-Type': 'text/html',
                        'Cache-Control': 'no-cache',
                    },
                });
            }

            return new Response(srcFile, {
                headers: { 'Cache-Control': 'no-cache' },
            });
        }

        // Serve CSS from shared package
        if (pathname === '/styles.css') {
            try {
                const cssFiles = [
                    '../../shared/src/styles/variables.css',
                    '../../shared/src/styles/base.css',
                    '../../shared/src/styles/components.css',
                ];

                let combinedCss = '';
                for (const cssPath of cssFiles) {
                    const file = Bun.file(cssPath);
                    if (await file.exists()) {
                        combinedCss += await file.text() + '\n';
                    }
                }

                return new Response(combinedCss, {
                    headers: {
                        'Content-Type': 'text/css',
                        'Cache-Control': 'no-cache',
                    },
                });
            } catch {
                return new Response('/* CSS not found */', {
                    headers: { 'Content-Type': 'text/css' },
                });
            }
        }

        // 404
        return new Response('Not Found', { status: 404 });
    },
});

console.log(`[OK] Server running at http://localhost:${server.port}`);
console.log('   Press Ctrl+C to stop');

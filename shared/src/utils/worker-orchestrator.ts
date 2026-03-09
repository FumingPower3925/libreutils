/**
 * Web Worker Orchestrator
 *
 * Manages Web Workers for heavy processing tasks across LibreUtils tools.
 * Provides standardized messaging, idle timeouts, and WASM worker support.
 *
 * @license AGPL-3.0-or-later
 */

/** Progress update sent from a worker during long-running operations. */
export interface WorkerProgress {
    type: 'progress';
    percent: number;
    stage?: string;
}

/** Standardized message protocol for worker communication. */
export interface WorkerMessage {
    id: string;
    type: string;
    payload: unknown;
}

/** Default idle timeout in milliseconds (5 minutes). */
const DEFAULT_IDLE_TIMEOUT = 5 * 60 * 1000;

interface TrackedWorker {
    worker: Worker;
    idleTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * Orchestrates Web Worker lifecycle, messaging, and WASM loading.
 *
 * Workers are tracked by name and automatically terminated after a
 * configurable idle period.
 */
export class WorkerOrchestrator {
    private workers: Map<string, TrackedWorker> = new Map();
    private idleTimeout: number;

    constructor(idleTimeout: number = DEFAULT_IDLE_TIMEOUT) {
        this.idleTimeout = idleTimeout;
    }

    /**
     * Creates a named worker from a script URL and begins tracking it.
     * Throws if a worker with the same name already exists.
     */
    createWorker(name: string, scriptUrl: string): Worker {
        if (this.workers.has(name)) {
            throw new Error(`Worker "${name}" already exists. Terminate it first.`);
        }

        const worker = new Worker(scriptUrl);
        const tracked: TrackedWorker = {
            worker,
            idleTimer: null,
        };

        this.workers.set(name, tracked);
        this.resetIdleTimer(name);

        return worker;
    }

    /** Terminates a specific worker by name and removes it from tracking. */
    terminateWorker(name: string): void {
        const tracked = this.workers.get(name);
        if (!tracked) {
            return;
        }

        if (tracked.idleTimer !== null) {
            clearTimeout(tracked.idleTimer);
        }

        tracked.worker.terminate();
        this.workers.delete(name);
    }

    /** Terminates all tracked workers. */
    terminateAll(): void {
        for (const name of [...this.workers.keys()]) {
            this.terminateWorker(name);
        }
    }

    /**
     * Creates a worker that loads a WASM module lazily.
     *
     * The provided `workerScript` string is converted into a Blob URL so
     * no separate file needs to be served. The WASM URL is posted to the
     * worker immediately so it can begin loading.
     */
    async loadWasmWorker(
        name: string,
        wasmUrl: string,
        workerScript: string,
    ): Promise<Worker> {
        if (this.workers.has(name)) {
            throw new Error(`Worker "${name}" already exists. Terminate it first.`);
        }

        const blob = new Blob([workerScript], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);

        let worker: Worker;
        try {
            worker = new Worker(blobUrl);
        } catch (err) {
            URL.revokeObjectURL(blobUrl);
            throw err;
        }

        const tracked: TrackedWorker = {
            worker,
            idleTimer: null,
        };

        this.workers.set(name, tracked);
        this.resetIdleTimer(name);

        // Send the WASM URL to the worker so it can fetch and instantiate it.
        worker.postMessage({ type: 'load-wasm', wasmUrl });

        return worker;
    }

    /**
     * Sends a message to a named worker and returns a promise that resolves
     * when a response with a matching `id` arrives.
     */
    sendWorkerMessage(name: string, message: WorkerMessage): Promise<unknown> {
        const tracked = this.workers.get(name);
        if (!tracked) {
            return Promise.reject(new Error(`Worker "${name}" not found.`));
        }

        this.resetIdleTimer(name);

        return new Promise((resolve, reject) => {
            const handler = (event: MessageEvent) => {
                const data = event.data as Record<string, unknown>;
                if (data && data.id === message.id) {
                    tracked.worker.removeEventListener('message', handler as EventListener);
                    this.resetIdleTimer(name);

                    if (data.type === 'error') {
                        reject(new Error(String(data.payload ?? 'Worker error')));
                    } else {
                        resolve(data.payload);
                    }
                }
            };

            const errorHandler = (event: Event) => {
                tracked.worker.removeEventListener('message', handler as EventListener);
                tracked.worker.removeEventListener('error', errorHandler);
                reject(event instanceof ErrorEvent ? event.error ?? new Error(event.message) : new Error('Worker error'));
            };

            tracked.worker.addEventListener('message', handler as EventListener);
            tracked.worker.addEventListener('error', errorHandler);
            tracked.worker.postMessage(message);
        });
    }

    /** Returns true if a worker with the given name is currently tracked. */
    hasWorker(name: string): boolean {
        return this.workers.has(name);
    }

    /** Returns the number of currently tracked workers. */
    get workerCount(): number {
        return this.workers.size;
    }

    // ---- private ----

    /** Resets the idle auto-terminate timer for a named worker. */
    private resetIdleTimer(name: string): void {
        const tracked = this.workers.get(name);
        if (!tracked) {
            return;
        }

        if (tracked.idleTimer !== null) {
            clearTimeout(tracked.idleTimer);
        }

        tracked.idleTimer = setTimeout(() => {
            this.terminateWorker(name);
        }, this.idleTimeout);
    }
}

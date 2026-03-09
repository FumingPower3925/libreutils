import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import type { WorkerMessage, WorkerProgress } from '../src/utils/worker-orchestrator';

// ---------------------------------------------------------------------------
// Mock Worker – simulates the browser Worker API for testing
// ---------------------------------------------------------------------------
class MockWorker {
    url: string;
    onmessage: ((e: MessageEvent) => void) | null = null;
    onerror: ((e: ErrorEvent) => void) | null = null;
    terminated = false;
    lastPostedMessage: unknown = null;

    private listeners: Map<string, Function[]> = new Map();

    constructor(url: string | URL) {
        this.url = typeof url === 'string' ? url : url.toString();
    }

    postMessage(data: unknown): void {
        this.lastPostedMessage = data;
    }

    terminate(): void {
        this.terminated = true;
    }

    addEventListener(type: string, listener: Function): void {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type)!.push(listener);
    }

    removeEventListener(type: string, listener: Function): void {
        const arr = this.listeners.get(type);
        if (arr) this.listeners.set(type, arr.filter(l => l !== listener));
    }

    /** Test helper: simulate the worker posting a message back. */
    simulateMessage(data: unknown): void {
        const event = new MessageEvent('message', { data });
        if (this.onmessage) this.onmessage(event);
        const listeners = this.listeners.get('message') || [];
        for (const fn of listeners) fn(event);
    }

    /** Test helper: simulate a worker error. */
    simulateError(message: string): void {
        const event = new ErrorEvent('error', { message });
        if (this.onerror) this.onerror(event);
        const listeners = this.listeners.get('error') || [];
        for (const fn of listeners) fn(event);
    }
}

// Install mock globally before importing the module under test.
const OriginalWorker = (globalThis as any).Worker;
(globalThis as any).Worker = MockWorker;

// Mock URL.createObjectURL / revokeObjectURL
const OriginalCreateObjectURL = URL.createObjectURL;
const OriginalRevokeObjectURL = URL.revokeObjectURL;
let blobUrlCounter = 0;
URL.createObjectURL = (_blob: Blob) => `blob:mock-${++blobUrlCounter}`;
URL.revokeObjectURL = (_url: string) => {};

// Now import the orchestrator (it will use the mocked Worker).
const { WorkerOrchestrator } = await import('../src/utils/worker-orchestrator');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('WorkerOrchestrator', () => {
    let orchestrator: InstanceType<typeof WorkerOrchestrator>;

    beforeEach(() => {
        orchestrator = new WorkerOrchestrator(1000); // 1-second idle timeout for tests
    });

    afterEach(() => {
        orchestrator.terminateAll();
    });

    // ---- Creating and tracking workers ----

    describe('createWorker', () => {
        it('should create and track a named worker', () => {
            const worker = orchestrator.createWorker('test', '/worker.js');
            expect(worker).toBeDefined();
            expect(orchestrator.hasWorker('test')).toBe(true);
            expect(orchestrator.workerCount).toBe(1);
        });

        it('should throw if a worker with the same name already exists', () => {
            orchestrator.createWorker('dup', '/worker.js');
            expect(() => orchestrator.createWorker('dup', '/worker.js')).toThrow(
                'Worker "dup" already exists',
            );
        });

        it('should track multiple workers independently', () => {
            orchestrator.createWorker('a', '/a.js');
            orchestrator.createWorker('b', '/b.js');
            expect(orchestrator.workerCount).toBe(2);
            expect(orchestrator.hasWorker('a')).toBe(true);
            expect(orchestrator.hasWorker('b')).toBe(true);
        });
    });

    // ---- Termination ----

    describe('terminateWorker', () => {
        it('should terminate and remove a specific worker', () => {
            const worker = orchestrator.createWorker('term', '/worker.js') as unknown as MockWorker;
            expect(orchestrator.hasWorker('term')).toBe(true);

            orchestrator.terminateWorker('term');
            expect(worker.terminated).toBe(true);
            expect(orchestrator.hasWorker('term')).toBe(false);
            expect(orchestrator.workerCount).toBe(0);
        });

        it('should be a no-op for non-existent workers', () => {
            expect(() => orchestrator.terminateWorker('nope')).not.toThrow();
        });
    });

    describe('terminateAll', () => {
        it('should terminate all tracked workers', () => {
            const w1 = orchestrator.createWorker('x', '/x.js') as unknown as MockWorker;
            const w2 = orchestrator.createWorker('y', '/y.js') as unknown as MockWorker;

            orchestrator.terminateAll();

            expect(w1.terminated).toBe(true);
            expect(w2.terminated).toBe(true);
            expect(orchestrator.workerCount).toBe(0);
        });

        it('should be safe to call when no workers exist', () => {
            expect(() => orchestrator.terminateAll()).not.toThrow();
        });
    });

    // ---- Message protocol ----

    describe('WorkerMessage protocol', () => {
        it('should conform to the WorkerMessage interface', () => {
            const msg: WorkerMessage = {
                id: 'abc-123',
                type: 'process',
                payload: { data: [1, 2, 3] },
            };

            expect(msg.id).toBe('abc-123');
            expect(msg.type).toBe('process');
            expect(msg.payload).toEqual({ data: [1, 2, 3] });
        });

        it('should allow unknown payload types', () => {
            const msgNull: WorkerMessage = { id: '1', type: 't', payload: null };
            const msgStr: WorkerMessage = { id: '2', type: 't', payload: 'hello' };
            const msgArr: WorkerMessage = { id: '3', type: 't', payload: [1, 2] };

            expect(msgNull.payload).toBeNull();
            expect(msgStr.payload).toBe('hello');
            expect(msgArr.payload).toEqual([1, 2]);
        });
    });

    // ---- WorkerProgress type ----

    describe('WorkerProgress type', () => {
        it('should conform to the WorkerProgress interface', () => {
            const progress: WorkerProgress = {
                type: 'progress',
                percent: 50,
                stage: 'Hashing',
            };

            expect(progress.type).toBe('progress');
            expect(progress.percent).toBe(50);
            expect(progress.stage).toBe('Hashing');
        });

        it('should allow omitting the optional stage field', () => {
            const progress: WorkerProgress = {
                type: 'progress',
                percent: 100,
            };

            expect(progress.stage).toBeUndefined();
        });
    });

    // ---- sendWorkerMessage ----

    describe('sendWorkerMessage', () => {
        it('should send a message and resolve with the matching response payload', async () => {
            const worker = orchestrator.createWorker('msg', '/worker.js') as unknown as MockWorker;
            const msg: WorkerMessage = { id: 'r1', type: 'compute', payload: 42 };

            const promise = orchestrator.sendWorkerMessage('msg', msg);

            // Simulate the worker responding
            worker.simulateMessage({ id: 'r1', type: 'result', payload: 84 });

            const result = await promise;
            expect(result).toBe(84);
        });

        it('should ignore messages with non-matching ids', async () => {
            const worker = orchestrator.createWorker('msg2', '/worker.js') as unknown as MockWorker;
            const msg: WorkerMessage = { id: 'target', type: 'x', payload: null };

            const promise = orchestrator.sendWorkerMessage('msg2', msg);

            // Non-matching message should be ignored
            worker.simulateMessage({ id: 'other', type: 'x', payload: 'nope' });

            // Matching message resolves the promise
            worker.simulateMessage({ id: 'target', type: 'x', payload: 'yes' });

            expect(await promise).toBe('yes');
        });

        it('should reject when the worker responds with an error type', async () => {
            const worker = orchestrator.createWorker('err', '/worker.js') as unknown as MockWorker;
            const msg: WorkerMessage = { id: 'e1', type: 'x', payload: null };

            const promise = orchestrator.sendWorkerMessage('err', msg);
            worker.simulateMessage({ id: 'e1', type: 'error', payload: 'Something broke' });

            await expect(promise).rejects.toThrow('Something broke');
        });

        it('should reject if the worker does not exist', async () => {
            const msg: WorkerMessage = { id: 'x', type: 'x', payload: null };
            await expect(orchestrator.sendWorkerMessage('ghost', msg)).rejects.toThrow(
                'Worker "ghost" not found',
            );
        });

        it('should post the message to the worker', () => {
            const worker = orchestrator.createWorker('post', '/worker.js') as unknown as MockWorker;
            const msg: WorkerMessage = { id: 'p1', type: 'ping', payload: 'hello' };

            orchestrator.sendWorkerMessage('post', msg);
            expect(worker.lastPostedMessage).toEqual(msg);
        });
    });

    // ---- WASM worker creation ----

    describe('loadWasmWorker', () => {
        it('should create a worker from a blob URL', async () => {
            const script = 'self.onmessage = (e) => { postMessage(e.data); };';
            const worker = (await orchestrator.loadWasmWorker(
                'wasm',
                '/module.wasm',
                script,
            )) as unknown as MockWorker;

            expect(worker).toBeDefined();
            expect(worker.url).toMatch(/^blob:mock-/);
            expect(orchestrator.hasWorker('wasm')).toBe(true);
        });

        it('should immediately send the WASM URL to the worker', async () => {
            const worker = (await orchestrator.loadWasmWorker(
                'wasm2',
                '/my.wasm',
                'console.log("worker")',
            )) as unknown as MockWorker;

            expect(worker.lastPostedMessage).toEqual({
                type: 'load-wasm',
                wasmUrl: '/my.wasm',
            });
        });

        it('should throw if a worker with the same name already exists', async () => {
            await orchestrator.loadWasmWorker('dup-wasm', '/a.wasm', '');
            await expect(
                orchestrator.loadWasmWorker('dup-wasm', '/b.wasm', ''),
            ).rejects.toThrow('Worker "dup-wasm" already exists');
        });
    });

    // ---- Idle timeout ----

    describe('idle timeout', () => {
        it('should auto-terminate a worker after the idle period', async () => {
            const shortOrchestrator = new WorkerOrchestrator(100); // 100ms
            const worker = shortOrchestrator.createWorker(
                'idle',
                '/worker.js',
            ) as unknown as MockWorker;

            expect(shortOrchestrator.hasWorker('idle')).toBe(true);

            // Wait for the idle timeout to fire
            await new Promise(resolve => setTimeout(resolve, 200));

            expect(worker.terminated).toBe(true);
            expect(shortOrchestrator.hasWorker('idle')).toBe(false);
        });

        it('should reset the idle timer when a message is sent', async () => {
            const shortOrchestrator = new WorkerOrchestrator(150);
            const worker = shortOrchestrator.createWorker(
                'busy',
                '/worker.js',
            ) as unknown as MockWorker;

            // Wait 100ms then send a message to reset the timer
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(shortOrchestrator.hasWorker('busy')).toBe(true);

            const msg: WorkerMessage = { id: 'k', type: 'keep-alive', payload: null };
            shortOrchestrator.sendWorkerMessage('busy', msg);

            // Wait another 100ms — worker should still be alive because timer was reset
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(shortOrchestrator.hasWorker('busy')).toBe(true);

            // Wait for the full idle period to pass
            await new Promise(resolve => setTimeout(resolve, 200));
            expect(worker.terminated).toBe(true);
            expect(shortOrchestrator.hasWorker('busy')).toBe(false);
        });

        it('should not fire idle timeout after manual termination', async () => {
            const shortOrchestrator = new WorkerOrchestrator(100);
            const worker = shortOrchestrator.createWorker(
                'manual',
                '/worker.js',
            ) as unknown as MockWorker;

            shortOrchestrator.terminateWorker('manual');
            expect(worker.terminated).toBe(true);

            // The timeout should have been cleared and not cause issues
            await new Promise(resolve => setTimeout(resolve, 200));
            expect(shortOrchestrator.workerCount).toBe(0);
        });
    });
});

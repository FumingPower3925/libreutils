
import { ChecksumTool, type ChecksumAlgorithm, CHECKSUM_ALGORITHMS } from './tool';
import { LuCopyToClipboard } from '@libreutils/shared';

// Register components
if (!customElements.get('lu-copy-to-clipboard')) {
    customElements.define('lu-copy-to-clipboard', LuCopyToClipboard);
}

// Icons
const ICONS = {
    hash: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`,
    file: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`,
    check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    x: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    upload: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    alert: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
};

export function renderChecksumPage(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'tool-page';

    container.innerHTML = `
    <style>
      .tool-page { max-width: 800px; margin: 0 auto; padding: 1.5rem; }
      .header { text-align: center; margin-bottom: 2rem; }
      .title { font-size: 1.875rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
      .subtitle { color: var(--lu-text-secondary, #6b7280); }
      
      .card { background: var(--lu-bg-card, white); border: 1px solid var(--lu-border, #e5e7eb); border-radius: 0.75rem; padding: 1.5rem; }
      
      .tabs { display: flex; border-bottom: 1px solid var(--lu-border, #e5e7eb); margin-bottom: 1.5rem; }
      .tab { padding: 0.75rem 1.5rem; cursor: pointer; border-bottom: 2px solid transparent; font-weight: 500; color: var(--lu-text-secondary); }
      .tab.active { border-color: var(--lu-primary-500, #613E9C); color: var(--lu-primary-500, #613E9C); }
      
      .mode-section { display: none; }
      .mode-section.active { display: block; }

      .input-group { margin-bottom: 1.5rem; }
      .label { display: block; font-weight: 500; margin-bottom: 0.5rem; color: var(--lu-text-primary); }
      
      .drop-zone { border: 2px dashed var(--lu-border, #e5e7eb); border-radius: 0.5rem; padding: 2rem; text-align: center; cursor: pointer; transition: all 0.2s; }
      .drop-zone:hover, .drop-zone.dragover { border-color: var(--lu-primary-500); background: var(--lu-bg-secondary); }
      .drop-zone.has-file { border-color: var(--lu-success, #10b981); background: var(--lu-success-light, #ecfdf5); }
      
      .textarea { width: 100%; min-height: 100px; padding: 0.75rem; border: 1px solid var(--lu-border); border-radius: 0.5rem; background: var(--lu-bg-card); color: var(--lu-text-primary); }
      
      /* Fixed: Pointer cursor and padding for chevron */
      .select { 
          width: 100%; 
          padding: 0.75rem; 
          padding-right: 2.5rem; /* Space for chevron */
          border: 1px solid var(--lu-border); 
          border-radius: 0.5rem; 
          background: var(--lu-bg-card); 
          color: var(--lu-text-primary); 
          cursor: pointer;
      }
      
      .btn { width: 100%; padding: 0.75rem; background: var(--lu-primary-500); color: white; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
      .btn:hover { background: var(--lu-primary-600); }
      .btn:disabled { background: var(--lu-text-muted); cursor: not-allowed; }
      
      .result-box { margin-top: 1.5rem; padding: 1rem; background: var(--lu-bg-secondary); border-radius: 0.5rem; display: none; }
      .result-box.visible { display: block; }
      
      .verification-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; }
      .badge-success { background: var(--lu-success-light); color: var(--lu-success); }
      .badge-error { background: var(--lu-error-light); color: var(--lu-error); }
      .badge-insecure { 
          font-size: 0.7rem; 
          background: #ffe4e6; 
          color: #be123c; 
          padding: 2px 6px; 
          border-radius: 4px; 
          margin-left: 0.5rem;
          display: inline-flex;
          align-items: center;
          gap: 2px;
      }
      
      .progress-bar { height: 4px; background: var(--lu-bg-secondary); border-radius: 2px; overflow: hidden; margin-top: 0.5rem; display: none; }
      .progress-fill { height: 100%; background: var(--lu-primary-500); width: 0%; transition: width 0.1s; }
      
      .algo-result-item { display: flex; flex-direction: column; padding: 0.75rem; border-bottom: 1px solid var(--lu-border); gap: 0.25rem; }
      .algo-result-item:last-child { border-bottom: none; }
      
      .algo-header { display: flex; justify-content: space-between; align-items: center; }
      .algo-name { font-weight: 600; display: flex; align-items: center; }
      
      /* Fixed: Smaller font and word break for hashes */
      .algo-hash { 
          font-family: monospace; 
          font-size: 0.85rem; 
          word-break: break-all;
          color: var(--lu-text-secondary);
      }
    </style>

    <header class="header">
      <h1 class="title">${ICONS.hash} Checksum Generator</h1>
      <p class="subtitle">Generate and verify file hashes</p>
      <div style="font-size: 0.8rem; color: var(--lu-text-muted); margin-top: 0.5rem;">
        Powered by <a href="https://github.com/paulmillr/noble-hashes" target="_blank" style="color:inherit; text-decoration:underline;">noble-hashes</a>.
        <br>
        100% Local Execution (Zero External Dependencies).
      </div>
    </header>

    <div class="card">
      <div class="tabs">
        <div class="tab active" data-tab="generate">Generate Hash</div>
        <div class="tab" data-tab="verify">Verify Hash</div>
      </div>

      <!-- GENERATE TAB -->
      <div class="mode-section active" id="section-generate">
        <div class="input-group">
          <label class="label">Input Source</label>
          <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
             <button class="btn" style="flex:1" id="btn-mode-file">File</button>
             <button class="btn" style="flex:1; background: var(--lu-bg-secondary); color: var(--lu-text-primary); border: 1px solid var(--lu-border);" id="btn-mode-text">Text</button>
          </div>
          
          <div id="input-file-area">
             <div class="drop-zone" id="gen-drop-zone">
               <div style="margin-bottom:0.5rem; color: var(--lu-text-muted);">${ICONS.upload}</div>
               <div id="gen-file-label">Drop file here or click to browse</div>
               <input type="file" id="gen-file-input" hidden>
             </div>
             <div class="progress-bar" id="gen-progress"><div class="progress-fill" id="gen-progress-fill"></div></div>
          </div>
          
          <div id="input-text-area" style="display:none;">
             <textarea class="textarea" id="gen-text-input" placeholder="Enter text to hash..."></textarea>
          </div>
        </div>

        <div class="input-group">
          <label class="label">Algorithm</label>
          <select class="select" id="gen-algo">
             ${CHECKSUM_ALGORITHMS.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
             <option value="ALL">Calculate ALL Algorithms</option>
          </select>
        </div>

        <button class="btn" id="gen-btn">Generate Hash</button>

        <div class="result-box" id="gen-result">
           <!-- Results go here -->
        </div>
      </div>

      <!-- VERIFY TAB -->
      <div class="mode-section" id="section-verify">
        <div class="input-group">
           <label class="label">File to Verify</label>
           <div class="drop-zone" id="ver-drop-zone">
               <div style="margin-bottom:0.5rem; color: var(--lu-text-muted);">${ICONS.upload}</div>
               <div id="ver-file-label">Drop file here or click to browse</div>
               <input type="file" id="ver-file-input" hidden>
           </div>
           <div class="progress-bar" id="ver-progress"><div class="progress-fill" id="ver-progress-fill"></div></div>
        </div>

        <div class="input-group">
           <label class="label">Expected Hash</label>
           <input type="text" class="select" id="ver-hash-input" placeholder="Paste hash here (we'll auto-detect the algorithm)">
        </div>

        <button class="btn" id="ver-btn">Verify Integrity</button>

        <div class="result-box" id="ver-result"></div>
      </div>
    </div>
    `;

    setupEventListeners(container);
    return container;
}

function setupEventListeners(container: HTMLElement) {
    // Tabs
    const tabs = container.querySelectorAll('.tab');
    const sections = container.querySelectorAll('.mode-section');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            container.querySelector(`#section-${target}`)?.classList.add('active');
        });
    });

    // Generate Mode Switch (File/Text)
    const btnFile = container.querySelector('#btn-mode-file') as HTMLButtonElement;
    const btnText = container.querySelector('#btn-mode-text') as HTMLButtonElement;
    const areaFile = container.querySelector('#input-file-area') as HTMLElement;
    const areaText = container.querySelector('#input-text-area') as HTMLElement;
    let isFileMode = true;

    function toggleMode(file: boolean) {
        isFileMode = file;
        btnFile.style.background = file ? 'var(--lu-primary-500)' : 'var(--lu-bg-secondary)';
        btnFile.style.color = file ? 'white' : 'var(--lu-text-primary)';
        btnText.style.background = !file ? 'var(--lu-primary-500)' : 'var(--lu-bg-secondary)';
        btnText.style.color = !file ? 'white' : 'var(--lu-text-primary)';
        areaFile.style.display = file ? 'block' : 'none';
        areaText.style.display = file ? 'none' : 'block';
    }

    btnFile.addEventListener('click', () => toggleMode(true));
    btnText.addEventListener('click', () => toggleMode(false));

    // File Drop Logic
    function setupDropZone(zoneId: string, inputId: string, labelId: string) {
        const zone = container.querySelector(`#${zoneId}`) as HTMLElement;
        const input = container.querySelector(`#${inputId}`) as HTMLInputElement;
        const label = container.querySelector(`#${labelId}`) as HTMLElement;

        zone.addEventListener('click', () => input.click());
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            if (e.dataTransfer?.files.length) {
                input.files = e.dataTransfer.files;
                handleFileSelect(input.files[0]);
            }
        });
        input.addEventListener('change', () => {
            if (input.files?.length) handleFileSelect(input.files[0]);
        });

        function handleFileSelect(file: File) {
            label.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            zone.classList.add('has-file');
        }
    }

    setupDropZone('gen-drop-zone', 'gen-file-input', 'gen-file-label');
    setupDropZone('ver-drop-zone', 'ver-file-input', 'ver-file-label');

    // Generate Action
    const genBtn = container.querySelector('#gen-btn') as HTMLButtonElement;
    const genResult = container.querySelector('#gen-result') as HTMLElement;
    const genProgress = container.querySelector('#gen-progress') as HTMLElement;
    const genFill = container.querySelector('#gen-progress-fill') as HTMLElement;

    genBtn.addEventListener('click', async () => {
        const algo = (container.querySelector('#gen-algo') as HTMLSelectElement).value;
        const isAll = algo === 'ALL';

        // Get input
        let textInput = '';
        let fileInput: File | null = null;

        if (isFileMode) {
            const input = container.querySelector('#gen-file-input') as HTMLInputElement;
            if (!input.files?.length) return alert('Please select a file');
            fileInput = input.files[0];
        } else {
            textInput = (container.querySelector('#gen-text-input') as HTMLTextAreaElement).value;
            if (!textInput) return alert('Please enter text');
        }

        genBtn.disabled = true;
        genResult.classList.remove('visible');
        genResult.innerHTML = '';
        if (isFileMode) genProgress.style.display = 'block';

        try {
            const algorithms = isAll ? CHECKSUM_ALGORITHMS.map(a => a.id) : [algo as ChecksumAlgorithm];
            const results: { algo: string, hash: string, insecure?: boolean }[] = [];

            for (const alg of algorithms) {
                const algoDef = CHECKSUM_ALGORITHMS.find(a => a.id === alg);
                let hash = '';
                if (isFileMode && fileInput) {
                    hash = await ChecksumTool.calculateFile(fileInput, alg as ChecksumAlgorithm, (p) => {
                        genFill.style.width = `${p}%`;
                    });
                } else {
                    hash = await ChecksumTool.calculateText(textInput, alg as ChecksumAlgorithm);
                }
                results.push({ algo: alg, hash, insecure: algoDef?.insecure });
            }

            // Render results
            genResult.classList.add('visible');
            genResult.innerHTML = results.map(r => `
                <div class="algo-result-item">
                    <div class="algo-header">
                        <span class="algo-name">
                            ${r.algo}
                            ${r.insecure ? `<span class="badge-insecure" title="This algorithm is considered securely broken">${ICONS.alert} Insecure</span>` : ''}
                        </span>
                        <lu-copy-to-clipboard label="Copy" content="${r.hash}"></lu-copy-to-clipboard>
                    </div>
                    <div class="algo-hash">${r.hash}</div>
                </div>
            `).join('');

        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            genBtn.disabled = false;
            genProgress.style.display = 'none';
        }
    });

    // Verify Action
    const verBtn = container.querySelector('#ver-btn') as HTMLButtonElement;
    const verResult = container.querySelector('#ver-result') as HTMLElement;
    const verProgress = container.querySelector('#ver-progress') as HTMLElement;
    const verFill = container.querySelector('#ver-progress-fill') as HTMLElement;

    verBtn.addEventListener('click', async () => {
        const input = container.querySelector('#ver-file-input') as HTMLInputElement;
        const expected = (container.querySelector('#ver-hash-input') as HTMLInputElement).value.trim().toLowerCase();

        if (!input.files?.length) return alert('Please select a file');
        if (!expected) return alert('Please enter expected hash');

        const file = input.files[0];
        verBtn.disabled = true;
        verResult.classList.remove('visible');
        verProgress.style.display = 'block';

        try {
            // Check all algorithms
            let match: { algo: string, hash: string } | null = null;

            for (const algOpt of CHECKSUM_ALGORITHMS) {
                const hash = await ChecksumTool.calculateFile(file, algOpt.id, (p) => {
                    verFill.style.width = `${p}%`;
                });
                if (hash.toLowerCase() === expected) {
                    match = { algo: algOpt.id, hash };
                    break; // Found it!
                }
            }

            verResult.classList.add('visible');
            if (match) {
                verResult.innerHTML = `
                    <div style="text-align:center; padding: 1rem;">
                        <div style="color: var(--lu-success); margin-bottom: 0.5rem; font-size: 1.25rem; font-weight:bold;">
                            ${ICONS.check} Verified!
                        </div>
                        <div>Matches <strong>${match.algo}</strong> hash.</div>
                        <div style="margin-top:0.5rem; font-family:monospace; word-break:break-all;">${match.hash}</div>
                    </div>
                 `;
            } else {
                verResult.innerHTML = `
                    <div style="text-align:center; padding: 1rem;">
                        <div style="color: var(--lu-error); margin-bottom: 0.5rem; font-size: 1.25rem; font-weight:bold;">
                            ${ICONS.x} Mismatch
                        </div>
                        <div>The file does not match the provided hash with any supported algorithm.</div>
                    </div>
                 `;
            }

        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            verBtn.disabled = false;
            verProgress.style.display = 'none';
        }
    });
}

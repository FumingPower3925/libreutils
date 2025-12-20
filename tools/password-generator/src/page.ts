/**
 * Password Generator Page Component
 */

import { PasswordGenerator, type PasswordOptions, type PasswordStrength } from './tool';

export function renderPasswordGeneratorPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'password-generator-page';

  container.innerHTML = `
    <style>
      .password-generator-page {
        max-width: 800px;
        margin: 0 auto;
        padding: var(--lu-space-8, 2rem) var(--lu-space-6, 1.5rem);
      }

      .page-header {
        margin-bottom: var(--lu-space-8, 2rem);
      }

      .page-title {
        font-size: var(--lu-text-3xl, 1.875rem);
        font-weight: 700;
        margin-bottom: var(--lu-space-2, 0.5rem);
        display: flex;
        align-items: center;
        gap: var(--lu-space-3, 0.75rem);
      }

      .page-description {
        color: var(--lu-text-secondary, #6b7280);
      }

      .privacy-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--lu-space-2, 0.5rem);
        padding: var(--lu-space-1, 0.25rem) var(--lu-space-3, 0.75rem);
        background: var(--lu-success-light, #dcfce7);
        color: var(--lu-success, #22c55e);
        font-size: var(--lu-text-xs, 0.75rem);
        font-weight: 500;
        border-radius: var(--lu-radius-full, 9999px);
        margin-top: var(--lu-space-3, 0.75rem);
      }

      @media (prefers-color-scheme: dark) {
        .privacy-badge {
          background: rgba(34, 197, 94, 0.2);
        }
      }

      .password-display {
        background: var(--lu-bg-card, white);
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-lg, 0.75rem);
        padding: var(--lu-space-6, 1.5rem);
        margin-bottom: var(--lu-space-6, 1.5rem);
      }

      .password-output {
        display: flex;
        align-items: center;
        gap: var(--lu-space-3, 0.75rem);
        background: var(--lu-bg-secondary, #f3f4f6);
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-md, 0.5rem);
        padding: var(--lu-space-4, 1rem);
        margin-bottom: var(--lu-space-4, 1rem);
      }

      .password-text {
        flex: 1;
        font-family: var(--lu-font-mono, monospace);
        font-size: var(--lu-text-lg, 1.125rem);
        word-break: break-all;
        color: var(--lu-text-primary, #111827);
        user-select: all;
      }

      .copy-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--lu-space-2, 0.5rem);
        background: transparent;
        border: none;
        border-radius: var(--lu-radius-md, 0.5rem);
        cursor: pointer;
        color: var(--lu-text-secondary, #6b7280);
        transition: all var(--lu-transition-fast, 150ms ease);
      }

      .copy-btn:hover {
        background: var(--lu-bg-card, white);
        color: var(--lu-primary-500, #7c3aed);
      }

      .copy-btn svg {
        width: 20px;
        height: 20px;
      }

      .strength-bar {
        height: 6px;
        background: var(--lu-bg-secondary, #f3f4f6);
        border-radius: var(--lu-radius-full, 9999px);
        overflow: hidden;
        margin-bottom: var(--lu-space-2, 0.5rem);
      }

      .strength-fill {
        height: 100%;
        border-radius: var(--lu-radius-full, 9999px);
        transition: all var(--lu-transition-normal, 250ms ease);
      }

      .strength-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: var(--lu-text-sm, 0.875rem);
      }

      .strength-label-container {
         display: flex;
         align-items: center;
         gap: 8px;
      }

      .strength-label {
        font-weight: 600;
      }
      
      .quantum-badge {
        display: none;
        padding: 2px 6px;
        background: linear-gradient(135deg, #7c3aed, #ec4899);
        color: white;
        font-size: 0.65rem;
        font-weight: 700;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .quantum-badge.visible {
        display: inline-block;
      }

      .strength-entropy {
        color: var(--lu-text-muted, #9ca3af);
      }

      .generate-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--lu-space-2, 0.5rem);
        padding: var(--lu-space-4, 1rem);
        font-family: inherit;
        font-size: var(--lu-text-base, 1rem);
        font-weight: 600;
        background: linear-gradient(135deg, var(--lu-primary-500, #7c3aed), var(--lu-primary-600, #6d28d9));
        color: white;
        border: none;
        border-radius: var(--lu-radius-md, 0.5rem);
        cursor: pointer;
        transition: all var(--lu-transition-fast, 150ms ease);
        margin-top: var(--lu-space-4, 1rem);
      }

      .generate-btn:hover {
        transform: translateY(-2px);
        box-shadow: var(--lu-shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1));
      }

      .generate-btn svg {
        width: 20px;
        height: 20px;
      }
      
      /* History Section */
      .history-section {
        margin-top: var(--lu-space-6, 1.5rem);
        padding-top: var(--lu-space-4, 1rem);
        border-top: 1px solid var(--lu-border, #e5e7eb);
        display: none; /* Hidden when empty */
      }
      
      .history-section.visible {
        display: block;
      }
      
      .history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        margin-bottom: var(--lu-space-3, 0.75rem);
        user-select: none;
      }
      
      .history-title {
         font-size: var(--lu-text-xs, 0.75rem);
         text-transform: uppercase;
         letter-spacing: 0.05em;
         font-weight: 600;
         color: var(--lu-text-muted, #9ca3af);
         margin: 0;
      }
      
      .history-toggle-icon {
        width: 16px;
        height: 16px;
        color: var(--lu-text-muted, #9ca3af);
        transition: transform 0.2s ease;
      }
      
      /* Rotated state for expanded (pointing up) */
      .history-header[aria-expanded="true"] .history-toggle-icon {
        transform: rotate(180deg);
      }
      
      .history-list {
        display: none;
        flex-direction: column;
        gap: var(--lu-space-2, 0.5rem);
      }
      
      .history-list.expanded {
        display: flex;
      }
      
      .history-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--lu-bg-secondary, #f3f4f6);
        padding: 8px 12px;
        border-radius: 6px;
        font-family: var(--lu-font-mono, monospace);
        font-size: 0.85rem;
        color: var(--lu-text-secondary, #6b7280);
      }
      
      .history-item .hist-pass {
         overflow: hidden;
         text-overflow: ellipsis;
         white-space: nowrap;
         max-width: 80%;
      }
      
      .history-copy {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--lu-primary-500, #7c3aed);
        font-size: 0.75rem;
        font-weight: 500;
        opacity: 0.7;
      }
      .history-copy:hover {
        opacity: 1;
        text-decoration: underline;
      }

      /* ... rest of styles ... */
      .options-panel {
        background: var(--lu-bg-card, white);
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-lg, 0.75rem);
        padding: var(--lu-space-6, 1.5rem);
      }

      .options-title-row {
         display: flex;
         justify-content: space-between;
         align-items: center;
         margin-bottom: var(--lu-space-4, 1rem);
      }

      .options-title {
        font-size: var(--lu-text-lg, 1.125rem);
        font-weight: 600;
        margin: 0;
      }
      
      /* Presets */
      .presets {
        display: flex;
        gap: 8px;
      }
      
      .preset-btn {
        background: var(--lu-bg-secondary, #f3f4f6);
        border: 1px solid transparent;
        border-radius: 4px;
        padding: 4px 10px;
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--lu-text-secondary, #6b7280);
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .preset-btn:hover {
         background: var(--lu-primary-50, #f5f3ff);
         color: var(--lu-primary-600, #6d28d9);
      }

      .option-group {
        margin-bottom: var(--lu-space-6, 1.5rem);
      }

      .option-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--lu-space-2, 0.5rem);
      }

      .option-label-text {
        font-size: var(--lu-text-sm, 0.875rem);
        font-weight: 500;
        color: var(--lu-text-secondary, #6b7280);
      }

      .option-value {
        font-size: var(--lu-text-sm, 0.875rem);
        font-weight: 600;
        color: var(--lu-primary-500, #7c3aed);
      }

      .length-slider {
        width: 100%;
        height: 8px;
        border-radius: var(--lu-radius-full, 9999px);
        background: var(--lu-bg-secondary, #f3f4f6);
        appearance: none;
        cursor: pointer;
      }

      .length-slider::-webkit-slider-thumb {
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--lu-primary-500, #7c3aed);
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }
      
      /* Separator Select */
      .separator-select {
        width: 100%;
        padding: 8px;
        border-radius: var(--lu-radius-md, 0.5rem);
        border: 1px solid var(--lu-border, #e5e7eb);
        background: var(--lu-bg-secondary, #f3f4f6);
        color: var(--lu-text-primary, #111827); /* Explicit color for dark mode */
        font-size: 0.9rem;
        margin-top: 8px;
      }
      
      .static-input,
      .static-select {
        padding: 8px;
        border-radius: var(--lu-radius-md, 0.5rem);
        border: 1px solid var(--lu-border, #e5e7eb);
        background: var(--lu-bg-secondary, #f3f4f6);
        color: var(--lu-text-primary, #111827);
        font-size: 0.85rem;
      }
      
      .static-input {
         flex: 2;
         min-width: 0; /* Allow shrinking */
      }
      
      .static-select {
         flex: 1;
      }

      .checkboxes {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--lu-space-3, 0.75rem);
      }

      @media (max-width: 480px) {
        .checkboxes {
          grid-template-columns: 1fr;
        }
      }

      .checkbox-item {
        display: flex;
        align-items: center;
        gap: var(--lu-space-3, 0.75rem);
        padding: var(--lu-space-3, 0.75rem);
        background: var(--lu-bg-secondary, #f3f4f6);
        border-radius: var(--lu-radius-md, 0.5rem);
        cursor: pointer;
        transition: all var(--lu-transition-fast, 150ms ease);
      }

      .checkbox-item:hover {
        background: var(--lu-primary-50, #f5f3ff);
      }

      @media (prefers-color-scheme: dark) {
        .checkbox-item:hover {
          background: var(--lu-bg-card-hover, rgba(255, 255, 255, 0.1));
        }
      }

      .checkbox-item input {
        width: 18px;
        height: 18px;
        accent-color: var(--lu-primary-500, #7c3aed);
        cursor: pointer;
      }

      .checkbox-label {
        font-size: var(--lu-text-sm, 0.875rem);
        color: var(--lu-text-primary, #111827);
        user-select: none;
      }

      .copy-feedback {
        position: fixed;
        bottom: var(--lu-space-6, 1.5rem);
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: var(--lu-gray-900, #171717);
        color: white;
        padding: var(--lu-space-3, 0.75rem) var(--lu-space-6, 1.5rem);
        border-radius: var(--lu-radius-full, 9999px);
        font-size: var(--lu-text-sm, 0.875rem);
        font-weight: 500;
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 1000;
      }

      .copy-feedback.visible {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    </style>
    
    <header class="page-header">
      <h1 class="page-title">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--lu-primary-500, #7c3aed);">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        Password Generator
      </h1>
      <p class="page-description">
        Generate secure, cryptographically random passwords instantly.
      </p>
      <div class="privacy-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Generated locally in your browser
      </div>
    </header>

    <div class="password-display">
      <div class="password-output">
        <span class="password-text" id="password-text">Click Generate to create a password</span>
        <button class="copy-btn" id="copy-btn" title="Copy to clipboard" aria-label="Copy password to clipboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
        </button>
      </div>
      
      <div class="strength-bar">
        <div class="strength-fill" id="strength-fill" role="progressbar" aria-valuemin="0" aria-valuemax="6" aria-valuenow="0" style="width: 0%; background: #dc2626;"></div>
      </div>
      <div class="strength-info">
        <div class="strength-label-container">
           <span class="strength-label" id="strength-label">-</span>
           <span class="quantum-badge" id="quantum-badge" title="Entropy > 256 bits. Resistant to future quantum computing attacks.">Quantum Safe</span>
        </div>
        <span class="strength-entropy" id="strength-entropy">0 bits entropy</span>
      </div>
      
      <button class="generate-btn" id="generate-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
        Generate Password
      </button>

      <div class="history-section" id="history-section">
         <button class="history-header" id="history-header" aria-expanded="false" aria-controls="history-list">
             <span class="history-title">Recent Passwords</span>
             <svg class="history-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M6 9l6 6 6-6"/>
             </svg>
         </button>
         <div class="history-list" id="history-list">
             <!-- History Items -->
         </div>
      </div>
    </div>

    <div class="options-panel">
      <!-- Options content remains same -->
      <div class="options-title-row">
         <h2 class="options-title">Options</h2>
         <div class="presets">
             <button class="preset-btn" id="preset-all">All</button>
             <button class="preset-btn" id="preset-easy">Easy</button>
             <button class="preset-btn" id="preset-pin">PIN</button>
         </div>
      </div>
      
      <div class="option-group">
        <div class="option-label">
          <span class="option-label-text">Password Length</span>
          <span class="option-value" id="length-value">16</span>
        </div>
        <input type="range" class="length-slider" id="length-slider" min="4" max="128" value="16" aria-label="Password length" aria-valuemin="4" aria-valuemax="128" aria-valuenow="16">
      </div>
      
      <div class="option-group">
        <div class="option-label">
          <span class="option-label-text">Password Type</span>
        </div>
        <div class="checkboxes">
           <label class="checkbox-item" style="grid-column: 1 / -1; display:flex; flex-direction: column; align-items: flex-start;">
            <div style="display:flex; align-items:center; gap: 0.75rem; width:100%;">
                <input type="checkbox" id="opt-memorable">
                <span class="checkbox-label">Memorable (Words)</span>
            </div>
            
            <select id="opt-separator" class="separator-select" style="display:none;">
                <option value="random">Random Separator</option>
                <option value="-">Hyphen (-)</option>
                <option value="_">Underscore (_)</option>
                <option value=" ">Space ( )</option>
                <option value=".">Period (.)</option>
            </select>
          </label>
        </div>
      </div>

      <div class="option-group" id="char-options">
        <div class="option-label">
          <span class="option-label-text">Character Types</span>
        </div>
        <div class="checkboxes">
          <label class="checkbox-item">
            <input type="checkbox" id="opt-uppercase" checked>
            <span class="checkbox-label">Uppercase (A-Z)</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" id="opt-lowercase" checked>
            <span class="checkbox-label">Lowercase (a-z)</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" id="opt-numbers" checked>
            <span class="checkbox-label">Numbers (0-9)</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" id="opt-symbols" checked>
            <span class="checkbox-label">Symbols (!@#$...)</span>
          </label>
        </div>
      </div>
      
      <div class="option-group" style="margin-bottom: 0;" id="exclude-options">
        <div class="checkboxes">
          <label class="checkbox-item">
            <input type="checkbox" id="opt-ambiguous">
            <span class="checkbox-label">Exclude Ambiguous (Il1O0)</span>
          </label>
          
          <div style="display: flex; gap: 8px; align-items: center;">
             <input type="text" id="opt-static-string" class="static-input" placeholder="Static text..." aria-label="Static text to include">
             <select id="opt-static-pos" class="static-select" aria-label="Static text position">
                 <option value="start">Start</option>
                 <option value="middle">Middle</option>
                 <option value="end" selected>End</option>
             </select>
          </div>
        </div>
      </div>
    </div>
    
    <div class="copy-feedback" id="copy-feedback" role="status" aria-live="polite">Copied to clipboard!</div>
  `;

  setupEventListeners(container);
  return container;
}

function setupEventListeners(container: HTMLElement): void {
  const passwordText = container.querySelector('#password-text') as HTMLSpanElement;
  const copyBtn = container.querySelector('#copy-btn') as HTMLButtonElement;
  const generateBtn = container.querySelector('#generate-btn') as HTMLButtonElement;
  const lengthSlider = container.querySelector('#length-slider') as HTMLInputElement;
  const lengthValue = container.querySelector('#length-value') as HTMLSpanElement;
  const strengthFill = container.querySelector('#strength-fill') as HTMLDivElement;
  const strengthLabel = container.querySelector('#strength-label') as HTMLSpanElement;
  const strengthEntropy = container.querySelector('#strength-entropy') as HTMLSpanElement;
  const quantumBadge = container.querySelector('#quantum-badge') as HTMLSpanElement;
  const copyFeedback = container.querySelector('#copy-feedback') as HTMLDivElement;

  const optUppercase = container.querySelector('#opt-uppercase') as HTMLInputElement;
  const optLowercase = container.querySelector('#opt-lowercase') as HTMLInputElement;
  const optNumbers = container.querySelector('#opt-numbers') as HTMLInputElement;
  const optSymbols = container.querySelector('#opt-symbols') as HTMLInputElement;
  const optAmbiguous = container.querySelector('#opt-ambiguous') as HTMLInputElement;

  const optMemorable = container.querySelector('#opt-memorable') as HTMLInputElement;
  const optSeparator = container.querySelector('#opt-separator') as HTMLSelectElement;

  const optStaticString = container.querySelector('#opt-static-string') as HTMLInputElement;
  const optStaticPos = container.querySelector('#opt-static-pos') as HTMLSelectElement;

  const charOptions = container.querySelector('#char-options') as HTMLElement;
  const excludeOptions = container.querySelector('#exclude-options') as HTMLElement;

  const presetAll = container.querySelector('#preset-all') as HTMLButtonElement;
  const presetEasy = container.querySelector('#preset-easy') as HTMLButtonElement;
  const presetPin = container.querySelector('#preset-pin') as HTMLButtonElement;

  const historySection = container.querySelector('#history-section') as HTMLDivElement;
  const historyList = container.querySelector('#history-list') as HTMLDivElement;
  const historyHeader = container.querySelector('#history-header') as HTMLButtonElement;

  // State
  let passwordHistory: string[] = [];
  const MAX_HISTORY = 5;

  const getOptions = (): PasswordOptions => ({
    length: parseInt(lengthSlider.value, 10),
    uppercase: optUppercase.checked,
    lowercase: optLowercase.checked,
    numbers: optNumbers.checked,
    symbols: optSymbols.checked,
    excludeAmbiguous: optAmbiguous.checked,
    excludeChars: '',
    memorable: optMemorable.checked,
    separator: optSeparator.value as any, // Cast to match stricter type if needed
    staticString: optStaticString.value ? {
      value: optStaticString.value,
      position: optStaticPos.value as any
    } : undefined
  });

  const updateStrengthDisplay = (strength: PasswordStrength): void => {
    strengthFill.style.width = `${Math.min(100, (strength.score / 5) * 100)}%`;
    strengthFill.style.background = strength.color;
    strengthFill.setAttribute('aria-valuenow', strength.score.toString());
    strengthLabel.textContent = strength.label;
    strengthLabel.style.color = strength.color;
    strengthEntropy.textContent = `${strength.entropy} bits entropy`;

    if (strength.isQuantumSafe) {
      quantumBadge.classList.add('visible');
    } else {
      quantumBadge.classList.remove('visible');
    }
  };

  const addToHistory = (pwd: string) => {
    // Don't add duplicates consecutively
    if (passwordHistory.length > 0 && passwordHistory[0] === pwd) return;

    passwordHistory.unshift(pwd);
    if (passwordHistory.length > MAX_HISTORY) {
      passwordHistory.pop();
    }
    renderHistory();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      copyFeedback.classList.add('visible');
      setTimeout(() => copyFeedback.classList.remove('visible'), 2000);
    } catch {
      // fallback not essential for history demo but good practice
    }
  };

  const renderHistory = () => {
    if (passwordHistory.length === 0) {
      historySection.classList.remove('visible');
      return;
    }
    historySection.classList.add('visible');
    historyList.innerHTML = '';

    passwordHistory.forEach(pwd => {
      const item = document.createElement('div');
      item.className = 'history-item';

      const passSpan = document.createElement('span');
      passSpan.className = 'hist-pass';
      passSpan.textContent = pwd;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'history-copy';
      copyBtn.textContent = 'Copy';
      copyBtn.onclick = () => copyToClipboard(pwd);

      item.appendChild(passSpan);
      item.appendChild(copyBtn);
      historyList.appendChild(item);
    });
  };

  // Toggle History Logic
  historyHeader.addEventListener('click', () => {
    const isExpanded = historyHeader.getAttribute('aria-expanded') === 'true';
    const newState = !isExpanded;

    historyHeader.setAttribute('aria-expanded', String(newState));

    if (newState) {
      historyList.classList.add('expanded');
    } else {
      historyList.classList.remove('expanded');
    }
  });

  const generatePassword = (): void => {
    try {
      const options = getOptions();
      const password = PasswordGenerator.generate(options);
      // Adjust strength calculation by passing static string length 
      const staticLen = options.staticString ? options.staticString.value.length : 0;
      const strength = PasswordGenerator.calculateStrength(password, options.memorable, staticLen);

      passwordText.textContent = password;
      updateStrengthDisplay(strength);
      addToHistory(password);
    } catch (error) {
      passwordText.textContent = error instanceof Error ? error.message : 'Generation failed';
      updateStrengthDisplay({ score: 0, label: 'Very Weak', color: '#dc2626', entropy: 0, isQuantumSafe: false });
    }
  };

  optMemorable.addEventListener('change', () => {
    const isMemorable = optMemorable.checked;

    charOptions.style.display = isMemorable ? 'none' : 'block';
    excludeOptions.style.display = isMemorable ? 'none' : 'block';
    optSeparator.style.display = isMemorable ? 'block' : 'none';

    // Disable inputs when hidden to prevent interaction/reading
    const inputs = [optUppercase, optLowercase, optNumbers, optSymbols, optAmbiguous];
    inputs.forEach(input => {
      input.disabled = isMemorable;
    });

    generatePassword();
  });

  // Preset Handlers
  const applyPreset = (len: number, mem: boolean, upper: boolean, lower: boolean, nums: boolean, syms: boolean, ambig: boolean) => {
    lengthSlider.value = len.toString();
    lengthValue.textContent = len.toString();
    optMemorable.checked = mem;
    optUppercase.checked = upper;
    optLowercase.checked = lower;
    optNumbers.checked = nums;
    optSymbols.checked = syms;
    optAmbiguous.checked = ambig;

    // Trigger update logic
    optMemorable.dispatchEvent(new Event('change'));
  };

  presetAll.addEventListener('click', () => applyPreset(16, false, true, true, true, true, false));
  presetEasy.addEventListener('click', () => applyPreset(16, false, true, true, true, false, true));
  presetPin.addEventListener('click', () => applyPreset(6, false, false, false, true, false, false));

  generateBtn.addEventListener('click', generatePassword);

  lengthSlider.addEventListener('input', () => {
    lengthValue.textContent = lengthSlider.value;
    lengthSlider.setAttribute('aria-valuenow', lengthSlider.value);
    generatePassword();
  });

  optStaticString.addEventListener('input', generatePassword);
  optStaticPos.addEventListener('change', generatePassword);

  const optionInputs = [optUppercase, optLowercase, optNumbers, optSymbols, optAmbiguous, optSeparator];
  optionInputs.forEach(input => {
    input.addEventListener('change', generatePassword);
  });

  copyBtn.addEventListener('click', async () => {
    const text = (passwordText.textContent || '').trim();
    const isErrorLike = /error|invalid|failed|unable to generate/i.test(text);
    if (!text || text.includes('Click Generate') || isErrorLike) return;

    copyToClipboard(text);
  });

  // Initial call
  try {
    const options = getOptions();
    const password = PasswordGenerator.generate(options);
    const staticLen = options.staticString ? options.staticString.value.length : 0;
    const strength = PasswordGenerator.calculateStrength(password, options.memorable, staticLen);
    passwordText.textContent = password;
    updateStrengthDisplay(strength);
    // Don't add initial to history
  } catch (e) { }
}

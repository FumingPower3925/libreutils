/**
 * Legal Page Component
 * 
 * Displays legal information, licenses, and attributions.
 */

export function renderLegalPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'legal-page';

  container.innerHTML = `
    <style>
      .legal-page {
        max-width: 1000px;
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

      .legal-section {
        margin-bottom: var(--lu-space-8, 2rem);
      }

      .section-title {
        font-size: var(--lu-text-2xl, 1.5rem);
        font-weight: 600;
        color: var(--lu-text-primary, #111827);
        margin-bottom: var(--lu-space-4, 1rem);
        padding-bottom: var(--lu-space-2, 0.5rem);
        border-bottom: 2px solid var(--lu-primary-500, #7c3aed);
      }

      .section-content {
        font-size: var(--lu-text-base, 1rem);
        color: var(--lu-text-primary, #111827);
        line-height: 1.6;
      }

      .license-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .license-item {
        background: var(--lu-bg-card, white);
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-md, 0.5rem);
        padding: var(--lu-space-4, 1rem);
        margin-bottom: var(--lu-space-4, 1rem);
      }

      .license-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--lu-space-3, 0.75rem);
      }

      .license-name {
        font-size: var(--lu-text-lg, 1.125rem);
        font-weight: 600;
        color: var(--lu-text-primary, #111827);
      }

      .license-badge {
        padding: var(--lu-space-1, 0.25rem) var(--lu-space-3, 0.75rem);
        background: var(--lu-info-light, #dbeafe);
        color: var(--lu-info, #3b82f6);
        font-size: var(--lu-text-xs, 0.75rem);
        font-weight: 500;
        border-radius: var(--lu-radius-full, 9999px);
      }

      .license-description {
        font-size: var(--lu-text-sm, 0.875rem);
        color: var(--lu-text-muted, #9ca3af);
        margin-bottom: var(--lu-space-3, 0.75rem);
      }

      .license-details {
        font-size: var(--lu-text-sm, 0.875rem);
        color: var(--lu-text-primary, #111827);
        white-space: pre-wrap;
      }

      .attribution-link {
        color: var(--lu-primary-500, #7c3aed);
        text-decoration: none;
      }

      .attribution-link:hover {
        text-decoration: underline;
      }

      .tool-attribution {
        background: var(--lu-bg-secondary, #f3f4f6);
        border: 1px solid var(--lu-border, #e5e7eb);
        border-radius: var(--lu-radius-md, 0.5rem);
        padding: var(--lu-space-4, 1rem);
        margin-bottom: var(--lu-space-4, 1rem);
      }

      .tool-attribution-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--lu-space-3, 0.75rem);
      }

      .tool-name {
        font-size: var(--lu-text-lg, 1.125rem);
        font-weight: 600;
        color: var(--lu-text-primary, #111827);
      }

      .tool-dependencies {
        margin-top: var(--lu-space-3, 0.75rem);
      }

      .dependency-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--lu-space-2, 0.5rem) 0;
        border-bottom: 1px solid var(--lu-border, #e5e7eb);
      }

      .dependency-item:last-child {
        border-bottom: none;
      }

      .dependency-name {
        font-size: var(--lu-text-base, 1rem);
        color: var(--lu-text-primary, #111827);
      }

      .dependency-license {
        font-size: var(--lu-text-sm, 0.875rem);
        color: var(--lu-text-muted, #9ca3af);
      }

      .disclaimer {
        background: var(--lu-warning-light, #fef3c7);
        color: var(--lu-warning, #92400e);
        padding: var(--lu-space-4, 1rem);
        border-radius: var(--lu-radius-md, 0.5rem);
        font-size: var(--lu-text-sm, 0.875rem);
        margin-top: var(--lu-space-4, 1rem);
      }

      .disclaimer-title {
        font-weight: 600;
        margin-bottom: var(--lu-space-2, 0.5rem);
      }

      @media (max-width: 768px) {
        .legal-page {
          padding: var(--lu-space-6, 1.5rem) var(--lu-space-4, 1rem);
        }
      }
    </style>
    
    <header class="page-header">
      <h1 class="page-title">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--lu-primary-500, #7c3aed);">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Legal Information
      </h1>
      <p class="page-description">
        Licenses, attributions, and legal disclaimers for LibreUtils
      </p>
    </header>

    <div class="legal-section">
      <h2 class="section-title">Introduction</h2>
      <div class="section-content">
        <p>LibreUtils is committed to transparency and compliance with all applicable laws and regulations. This page provides information about the licenses used in our project and the third-party libraries we depend on.</p>
      </div>
    </div>

    <div class="legal-section">
      <h2 class="section-title">LibreUtils License</h2>
      <div class="section-content">
        <p>LibreUtils is licensed under the <strong>GNU Affero General Public License v3.0 (AGPL-3.0)</strong>. This is a strong copyleft license that requires:</p>
        <ul class="section-content">
          <li>Source code availability for all modifications</li>
          <li>Network use provisions (users can download source code)</li>
          <li>Preservation of copyright notices and license terms</li>
        </ul>
        <p>You can view the full license text in our <a href="https://github.com/FumingPower3925/libreutils/blob/main/LICENSE" class="attribution-link" target="_blank" rel="noopener noreferrer">LICENSE file</a>.</p>
      </div>
    </div>

    <div class="legal-section">
      <h2 class="section-title">Third-Party Libraries</h2>
      <div class="section-content">
        <p>LibreUtils uses various third-party libraries and tools. Below is a comprehensive list of all dependencies and their respective licenses.</p>
      </div>

      <div class="license-list">
        <div class="license-item">
          <div class="license-header">
            <div class="license-name">exifreader</div>
            <div class="license-badge">MIT</div>
          </div>
          <div class="license-description">
            EXIF metadata parser used in the Metadata Scrubber tool
          </div>
          <div class="license-details">
            <strong>Repository:</strong> <a href="https://github.com/mattiasw/exifreader" class="attribution-link" target="_blank" rel="noopener noreferrer">https://github.com/mattiasw/exifreader</a><br>
            <strong>License:</strong> MIT License<br>
            <strong>Copyright:</strong> © Mattias Wallin and contributors
          </div>
        </div>

        <div class="license-item">
          <div class="license-header">
            <div class="license-name">@noble/hashes</div>
            <div class="license-badge">MIT</div>
          </div>
          <div class="license-description">
            Cryptographic hash functions used in the Checksum Generator tool
          </div>
          <div class="license-details">
            <strong>Repository:</strong> <a href="https://github.com/paulmillr/noble-hashes" class="attribution-link" target="_blank" rel="noopener noreferrer">https://github.com/paulmillr/noble-hashes</a><br>
            <strong>License:</strong> MIT License<br>
            <strong>Copyright:</strong> © Paul Miller and contributors<br>
            <strong>Note:</strong> This library is vendored in our codebase at <code>tools/checksum-generator/src/lib/noble/</code>
          </div>
        </div>

        <div class="license-item">
          <div class="license-header">
            <div class="license-name">pdf-lib</div>
            <div class="license-badge">MIT</div>
          </div>
          <div class="license-description">
            PDF document manipulation used in the Metadata Scrubber tool
          </div>
          <div class="license-details">
            <strong>Repository:</strong> <a href="https://github.com/Hopding/pdf-lib" class="attribution-link" target="_blank" rel="noopener noreferrer">https://github.com/Hopding/pdf-lib</a><br>
            <strong>License:</strong> MIT License<br>
            <strong>Copyright:</strong> © Andrew Dillon and contributors
          </div>
        </div>

        <div class="license-item">
          <div class="license-header">
            <div class="license-name">Bun</div>
            <div class="license-badge">MIT</div>
          </div>
          <div class="license-description">
            JavaScript runtime and toolkit
          </div>
          <div class="license-details">
            <strong>Website:</strong> <a href="https://bun.sh" class="attribution-link" target="_blank" rel="noopener noreferrer">https://bun.sh</a><br>
            <strong>License:</strong> MIT License<br>
            <strong>Copyright:</strong> © Jarred Sumner and contributors
          </div>
        </div>

        <div class="license-item">
          <div class="license-header">
            <div class="license-name">TypeScript</div>
            <div class="license-badge">Apache-2.0</div>
          </div>
          <div class="license-description">
            Programming language and toolset
          </div>
          <div class="license-details">
            <strong>Website:</strong> <a href="https://www.typescriptlang.org" class="attribution-link" target="_blank" rel="noopener noreferrer">https://www.typescriptlang.org</a><br>
            <strong>License:</strong> Apache License 2.0<br>
            <strong>Copyright:</strong> © Microsoft Corporation
          </div>
        </div>
      </div>
    </div>

    <div class="legal-section">
      <h2 class="section-title">Tool-Specific Attributions</h2>
      <div class="section-content">
        <p>Each tool may have additional dependencies and attributions.</p>
      </div>

      <div class="tool-attribution">
        <div class="tool-attribution-header">
          <div class="tool-name">Metadata Scrubber</div>
        </div>
        <div class="tool-dependencies">
          <div class="dependency-item">
            <div class="dependency-name">pdf-lib</div>
            <div class="dependency-license">MIT License</div>
          </div>
        </div>
      </div>

      <div class="tool-attribution">
        <div class="tool-attribution-header">
          <div class="tool-name">Checksum Generator</div>
        </div>
        <div class="tool-dependencies">
          <div class="dependency-item">
            <div class="dependency-name">@noble/hashes (vendored)</div>
            <div class="dependency-license">MIT License</div>
          </div>
        </div>
      </div>

      <div class="tool-attribution">
        <div class="tool-attribution-header">
          <div class="tool-name">Archive Manager</div>
        </div>
        <div class="tool-dependencies">
          <div class="dependency-item">
            <div class="dependency-name">Built-in browser APIs</div>
            <div class="dependency-license">No external dependencies</div>
          </div>
        </div>
      </div>

      <div class="tool-attribution">
        <div class="tool-attribution-header">
          <div class="tool-name">Image Compressor</div>
        </div>
        <div class="tool-dependencies">
          <div class="dependency-item">
            <div class="dependency-name">Built-in Canvas API</div>
            <div class="dependency-license">No external dependencies</div>
          </div>
        </div>
      </div>
    </div>

    <div class="legal-section">
      <h2 class="section-title">Privacy Policy</h2>
      <div class="section-content">
        <p>LibreUtils is designed with privacy as a core principle:</p>
        <ul class="section-content">
          <li><strong>No Server Processing:</strong> All tools run 100% in your browser</li>
          <li><strong>No Data Collection:</strong> We don't track or store any user data</li>
          <li><strong>No Analytics:</strong> No tracking pixels, cookies, or analytics services</li>
          <li><strong>No Third-Party Requests:</strong> All processing happens locally</li>
        </ul>
        <p>Your files never leave your device. All metadata scrubbing, encryption, and other operations are performed entirely within your browser.</p>
      </div>
    </div>

    <div class="legal-section">
      <h2 class="section-title">Disclaimer</h2>
      <div class="disclaimer">
        <div class="disclaimer-title">Important Notice:</div>
        <div class="section-content">
          <p>While LibreUtils makes every effort to remove metadata from files, we cannot guarantee 100% removal of all metadata in all cases. The effectiveness of metadata removal depends on:</p>
          <ul class="section-content">
            <li>File format and structure</li>
            <li>Browser capabilities and limitations</li>
            <li>WASM module functionality</li>
            <li>Potential proprietary or non-standard metadata formats</li>
          </ul>
          <p><strong>You are solely responsible for verifying that metadata has been adequately removed before sharing files.</strong> LibreUtils and its contributors are not liable for any consequences resulting from incomplete metadata removal.</p>
        </div>
      </div>
    </div>

    <div class="legal-section">
      <h2 class="section-title">Contact Information</h2>
      <div class="section-content">
        <p>For legal inquiries or questions about licensing, please contact us through our GitHub repository:</p>
        <p><a href="https://github.com/FumingPower3925/libreutils" class="attribution-link" target="_blank" rel="noopener noreferrer">https://github.com/FumingPower3925/libreutils</a></p>
      </div>
    </div>
  `;

  return container;
}
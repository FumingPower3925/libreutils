export default {
  id: 'archive-manager',
  name: 'Archive Manager',
  description: 'Create and extract ZIP, TAR, GZ, RAR, 7Z, BZ2, and XZ archive files entirely in your browser.',
  icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><rect x="10" y="5" width="4" height="2"/><rect x="10" y="9" width="4" height="2"/><rect x="10" y="13" width="4" height="2"/></svg>',
  category: 'compression',
  tags: ['archive', 'zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz', 'extract', 'compress'],
  route: '/tools/archive-manager',
  standalone: true,
  attribution: {
    libraries: [{ name: 'libarchive.js', license: 'MIT' }, { name: 'fflate', license: 'MIT' }],
    note: 'Uses libarchive.js (WASM) for RAR, 7Z, BZ2, and XZ formats. Uses fflate for fast ZIP creation. TAR and GZ use built-in browser APIs.'
  }
};

export default {
  id: 'archive-manager',
  name: 'Archive Manager',
  description: 'View and extract ZIP, TAR, and GZ archive files entirely in your browser.',
  icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><rect x="10" y="5" width="4" height="2"/><rect x="10" y="9" width="4" height="2"/><rect x="10" y="13" width="4" height="2"/></svg>',
  category: 'file',
  tags: ['archive', 'zip', 'tar', 'gz', 'extract', 'compress'],
  route: '/tools/archive-manager',
  standalone: true,
  attribution: {
    libraries: [],
    note: 'Uses built-in browser APIs (DecompressionStream, ArrayBuffer manipulation) for archive processing.'
  }
};

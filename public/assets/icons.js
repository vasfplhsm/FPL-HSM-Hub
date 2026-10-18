const paths = {
  announcement: '<path d="m3 10 17-6v16L3 14v-4Zm4 6 2 5h3l-2-6M20 9h2m-2 6h2"/>',
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  planner: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-14 5 3 3 6-6"/>',
  myubat: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5M8 10.5h5m-2.5-2.5v5"/>',
  katalog: '<path d="m9 15 6-6M5 19a5.7 5.7 0 0 1 0-8l6-6a5.7 5.7 0 0 1 8 8l-6 6a5.7 5.7 0 0 1-8 0Z"/>',
  formulary: '<path d="M12 5v16M3 3c4 0 7 1 9 3 2-2 5-3 9-3v16c-4 0-7 0-9 2-2-2-5-2-9-2V3Z"/>',
  farmasi: '<path d="M4 21V5h16v16M2 21h20M10 21v-5h4v5M9 9h6m-3-3v6"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  book: '<path d="M12 5v16M3 3c4 0 7 1 9 3 2-2 5-3 9-3v16c-4 0-7 0-9 2-2-2-5-2-9-2V3Z"/>'
};
export function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`; }

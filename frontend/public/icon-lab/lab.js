const O = 'class="outline"'
const S = 'class="soft"'
const A = 'class="accent"'
const F = 'class="fill"'

const motion = (className, content) => `<g data-motion-part class="motion-node ${className}">${content}</g>`
const svg = (body, className = 'mark motion') => `
  <svg class="${className}" viewBox="0 0 96 96" role="img" aria-hidden="true">
    <rect class="icon-plane" x="1" y="1" width="94" height="94" rx="16" />
    <g class="icon-art">${body}</g>
  </svg>`

const templates = {
  ledger: () => svg(`
    <path ${O} d="M24 19h42a8 8 0 0 1 8 8v50H30a6 6 0 0 1-6-6V19Z"/><path ${S} d="M32 19v58M41 34h24M41 46h18M41 58h23"/>
    ${motion('file-tab', '<path class="accent" d="M62 19v15l6-4 6 4V19Z"/>')}`),
  catalogue: () => svg(`
    <rect ${O} x="19" y="18" width="58" height="60" rx="5"/><path ${S} d="M19 38h58M19 58h58"/><path ${S} d="M38 29h20M38 49h20M38 69h20"/>
    ${motion('drawer', '<rect class="accent" x="26" y="43" width="44" height="10" rx="2"/><path class="cut" d="M43 48h10"/>')}`),
  stamp: () => svg(`
    <path ${O} d="M27 69h42l5 9H22l5-9ZM35 49h26l3 20H32l3-20Z"/><path ${S} d="M38 49c0-8 3-12 10-12s10 4 10 12"/>
    ${motion('stamp', '<path class="accent" d="M39 38V24c0-5 4-8 9-8s9 3 9 8v14"/>')}`),
  binder: () => svg(`
    <path ${O} d="M18 23h27c5 0 8 3 8 8v47H26c-5 0-8-3-8-8V23Zm60 0H51v55h27V23Z"/>
    ${motion('rings', '<g class="accent"><circle cx="51" cy="34" r="5"/><circle cx="51" cy="50" r="5"/><circle cx="51" cy="66" r="5"/></g>')}`),
  cabinet: () => svg(`
    <rect ${O} x="20" y="17" width="56" height="62" rx="5"/><rect ${S} x="27" y="25" width="42" height="14" rx="2"/><rect ${S} x="27" y="57" width="42" height="14" rx="2"/>
    ${motion('drawer', '<rect class="accent" x="24" y="41" width="48" height="15" rx="2"/><path class="cut" d="M42 48h12"/>')}`),
  indexWheel: () => svg(`
    <circle ${O} cx="48" cy="48" r="31"/><circle ${S} cx="48" cy="48" r="12"/><path ${S} d="M48 17v9M48 70v9M17 48h9M70 48h9M26 26l7 7M63 63l7 7"/>
    ${motion('rotate', '<path class="accent" d="M48 17a31 31 0 0 1 25 13l-10 7a19 19 0 0 0-15-8V17Z"/>')}`),
  folio: () => svg(`
    <path ${O} d="M18 30h25l7 7h28v39H18V30Z"/><path ${S} d="M25 45h46M25 56h34M25 67h39"/>
    ${motion('file-tab', '<path class="accent" d="M31 20h28l7 10H38l-7-10Z"/>')}`),
  sleeve: () => svg(`
    <rect ${O} x="18" y="18" width="60" height="60" rx="4"/><path ${S} d="M18 60l18-18 12 12 10-10 20 20"/>
    ${motion('disc', '<circle class="accent" cx="56" cy="38" r="18"/><circle class="cut" cx="56" cy="38" r="5"/>')}`),
  margin: () => svg(`
    <path ${O} d="M25 17h39l9 9v53H25V17Z"/><path ${S} d="M35 33h27M35 45h22M35 57h27M35 69h16"/>
    ${motion('bracket', '<path class="accent" d="M19 33h8v31h-8M69 42h8v22h-8"/>')}`),
  atlas: () => svg(`
    <path ${O} d="M17 24l20-7 22 7 20-7v55l-20 7-22-7-20 7V24Z"/><path ${S} d="M37 17v55M59 24v55"/>
    ${motion('route', '<path class="accent" d="M25 60c8-24 20 4 30-19 5-11 11-8 17-13"/><circle class="accent-fill" cx="25" cy="60" r="4"/><circle class="accent-fill" cx="72" cy="28" r="4"/>')}`),

  tapLedger: () => svg(`
    <rect ${O} x="49" y="17" width="29" height="62" rx="5"/><path ${S} d="M57 31h13M57 43h13M57 55h13M57 67h9"/><circle ${S} cx="29" cy="48" r="4"/>
    ${motion('signal', '<path class="accent" d="M23 38a14 14 0 0 1 0 20M16 31a24 24 0 0 1 0 34M31 43a7 7 0 0 1 0 10"/>')}`),
  receiptSlot: () => svg(`
    <path ${O} d="M18 61h60v17H18V61Z"/><path ${S} d="M27 69h42"/>
    ${motion('receipt', '<path class="accent" d="M29 17h38v49l-6-4-7 4-7-4-6 4-6-4-6 4V17Z"/><path class="cut" d="M38 29h20M38 39h20M38 49h13"/>')}`),
  notificationMatch: () => svg(`
    <rect ${O} x="47" y="24" width="32" height="52" rx="4"/><path ${S} d="M55 37h16M55 49h16M55 61h11"/>
    ${motion('handoff', '<path class="accent" d="M18 29h22v18H29l-6 6v-6h-5V29Z"/><circle class="cut-fill" cx="29" cy="38" r="3"/><path class="accent" d="M36 56h17"/>')}`),
  merchantStamp: () => svg(`
    <path ${O} d="M20 42h56v35H20V42ZM17 31h62l-7-13H24l-7 13Z"/><path ${S} d="M29 54h18v23M55 54h12M55 64h12"/>
    ${motion('stamp', '<circle class="accent" cx="66" cy="32" r="13"/><path class="cut" d="m60 32 4 4 8-9"/>')}`),
  amountImprint: () => svg(`
    <rect ${O} x="19" y="22" width="58" height="55" rx="5"/><path ${S} d="M29 34h15M29 65h38"/><path ${F} d="M34 44h6v12h-6zM45 41h6v15h-6zM56 46h6v10h-6z"/>
    ${motion('scan', '<path class="accent" d="M24 19v8M72 19v8M24 72v8M72 72v8M20 48h56"/>')}`),
  walletAssign: () => svg(`
    <path ${O} d="M18 30h59v44H18V30Zm44 13h20v18H62a9 9 0 0 1 0-18Z"/><circle ${S} cx="66" cy="52" r="3"/>
    ${motion('card', '<rect class="accent" x="28" y="17" width="34" height="23" rx="3"/><path class="cut" d="M34 25h18"/>')}`),
  sourceTrace: () => svg(`
    <rect ${O} x="54" y="22" width="25" height="55" rx="4"/><path ${S} d="M61 35h11M61 47h11M61 59h11"/><circle ${S} cx="18" cy="29" r="7"/>
    ${motion('route', '<path class="accent" d="M24 32c13 3 9 19 21 21 7 1 8-4 16-4"/><circle class="accent-fill" cx="45" cy="53" r="4"/>')}`),
  reviewLens: () => svg(`
    <path ${O} d="M19 20h42v58H19V20Z"/><path ${S} d="M28 33h24M28 44h19M28 55h23"/>
    ${motion('lens', '<circle class="accent" cx="61" cy="57" r="17"/><path class="accent" d="m73 69 11 11"/><path class="cut" d="M54 57h14"/>')}`),
  categoryFile: () => svg(`
    <path ${O} d="M18 31h25l6 7h29v39H18V31Z"/><path ${S} d="M28 50h39M28 61h29"/>
    ${motion('sort', '<g class="accent-fill"><circle cx="28" cy="19" r="5"/><rect x="42" y="14" width="10" height="10" rx="2"/><path d="M64 14l6 10H58l6-10Z"/></g>')}`),
  confirmedEntry: () => svg(`
    <rect ${O} x="20" y="18" width="56" height="60" rx="5"/><path ${S} d="M30 32h36M30 46h28M30 60h36"/>
    ${motion('confirm', '<circle class="accent" cx="65" cy="64" r="15"/><path class="cut" d="m58 64 5 5 9-11"/>')}`),
  matchCard: () => svg(`
    <rect ${O} x="18" y="22" width="27" height="52" rx="4"/><rect ${O} x="53" y="22" width="25" height="52" rx="4"/><path ${S} d="M25 36h13M25 48h13M60 36h11M60 48h11"/>
    ${motion('handoff', '<path class="accent" d="M40 59h18M53 54l5 5-5 5"/>')}`),

  seasonBridge: () => svg(`
    <rect ${O} x="14" y="23" width="28" height="49" rx="4"/><rect ${O} x="54" y="23" width="28" height="49" rx="4"/><path ${S} d="M21 36h14M61 36h14M21 48h14M61 48h14"/>
    ${motion('bridge', '<path class="accent" d="M38 58c7-12 13-12 20 0"/><circle class="accent-fill" cx="38" cy="58" r="3"/><circle class="accent-fill" cx="58" cy="58" r="3"/>')}`),
  episodeStrip: () => svg(`
    <path ${O} d="M12 29h72v38H12V29Z"/><path ${S} d="M24 29v38M42 29v38M60 29v38M12 38h72M12 58h72"/>
    ${motion('frame-step', '<rect class="accent" x="43" y="39" width="16" height="18" rx="2"/>')}`),
  animeLineage: () => svg(`
    <rect ${O} x="35" y="14" width="26" height="22" rx="3"/><rect ${O} x="12" y="61" width="26" height="22" rx="3"/><rect ${O} x="58" y="61" width="26" height="22" rx="3"/><path ${S} d="M48 36v13M25 61V49h46v12"/>
    ${motion('branch', '<circle class="accent" cx="48" cy="49" r="6"/>')}`),
  chapterThread: () => svg(`
    <path ${O} d="M15 24h27c5 0 7 3 7 8v46H22c-4 0-7-3-7-7V24Zm66 0H54c-4 0-7 3-7 8v46h27c4 0 7-3 7-7V24Z"/>
    ${motion('thread', '<path class="accent" d="M30 36c24 0 11 26 36 26"/><circle class="accent-fill" cx="30" cy="36" r="4"/><circle class="accent-fill" cx="66" cy="62" r="4"/>')}`),
  timelineFold: () => svg(`
    <path ${O} d="M15 28h26l7 8 7-8h26v44H55l-7-8-7 8H15V28Z"/><path ${S} d="M48 36v28"/>
    ${motion('fold', '<path class="accent" d="M23 51h16l9-8 9 8h16"/><circle class="accent-fill" cx="23" cy="51" r="4"/><circle class="accent-fill" cx="73" cy="51" r="4"/>')}`),
  releaseTree: () => svg(`
    <path ${O} d="M48 17v19M48 36H25v16M48 36h23v16M25 52v17M71 52v17"/><rect ${S} x="37" y="12" width="22" height="15" rx="3"/><rect ${S} x="14" y="64" width="22" height="15" rx="3"/><rect ${S} x="60" y="64" width="22" height="15" rx="3"/>
    ${motion('branch', '<rect class="accent" x="37" y="43" width="22" height="15" rx="3"/>')}`),
  pausedStory: () => svg(`
    <path ${O} d="M16 24h26c5 0 7 3 7 8v46H23c-4 0-7-3-7-7V24Zm64 0H54c-4 0-7 3-7 8v46h26c4 0 7-3 7-7V24Z"/>
    ${motion('pause-story', '<rect class="accent-fill" x="39" y="42" width="6" height="21" rx="2"/><rect class="accent-fill" x="52" y="42" width="6" height="21" rx="2"/>')}`),
  nextEpisode: () => svg(`
    <rect ${O} x="17" y="22" width="49" height="52" rx="5"/><path ${S} d="M28 35h27M28 47h20M28 59h27"/>
    ${motion('next', '<path class="accent" d="M58 41h21v23H58l11-12-11-11Z"/>')}`),
  parallelSeasons: () => svg(`
    <path ${O} d="M20 17v62M76 17v62"/><path ${S} d="M20 28h20M20 43h26M20 58h18M56 28h20M50 43h26M58 58h18"/>
    ${motion('bridge', '<path class="accent" d="M38 68h20M48 58v20"/>')}`),
  completeArc: () => svg(`
    <path ${S} d="M20 63a31 31 0 0 1 56 0"/><g ${F}><rect x="16" y="57" width="9" height="9" rx="2"/><rect x="25" y="36" width="9" height="9" rx="2"/><rect x="44" y="22" width="9" height="9" rx="2"/><rect x="63" y="36" width="9" height="9" rx="2"/></g>
    ${motion('arc-complete', '<rect class="accent-fill" x="71" y="57" width="9" height="9" rx="2"/><path class="accent" d="M28 75h40"/>')}`),
  currentThread: () => svg(`
    <path ${O} d="M16 23h64v50H16V23Z"/><path ${S} d="M26 35h44M26 47h34M26 59h44"/>
    ${motion('thread', '<path class="accent" d="M23 35c16 0 8 24 27 24s13-19 27-19"/>')}`),

  fiveRecords: () => svg(`
    <rect ${O} x="34" y="34" width="28" height="28" rx="5"/><path ${S} d="M42 43h12M42 51h12"/><circle ${S} cx="48" cy="16" r="8"/><path ${S} d="M15 43h16M18 37v12M28 37v12"/><path ${S} d="M67 40c8 0 9 12 0 12"/><path ${S} d="M27 68l7 9M69 68l-7 9"/>
    ${motion('assemble', '<circle class="accent" cx="48" cy="48" r="20"/>')}`),
  dailyStack: () => svg(`
    <rect ${S} x="27" y="14" width="47" height="55" rx="4"/><rect ${S} x="21" y="21" width="47" height="55" rx="4"/>
    ${motion('page', '<rect class="accent" x="15" y="28" width="47" height="55" rx="4"/><path class="cut" d="M25 42h27M25 53h20M25 64h27"/>')}`),
  habitRhythm: () => svg(`
    <path ${O} d="M18 25h60v48H18V25Z"/><path ${S} d="M31 25v48M46 25v48M61 25v48M18 41h60M18 57h60"/>
    ${motion('habit', '<g class="accent-fill"><circle cx="24" cy="33" r="4"/><circle cx="39" cy="49" r="4"/><circle cx="54" cy="65" r="4"/><circle cx="69" cy="49" r="4"/></g>')}`),
  trainingLog: () => svg(`
    <rect ${O} x="26" y="18" width="44" height="60" rx="4"/><path ${S} d="M35 32h26M35 64h26"/><path ${O} d="M19 43v12M27 39v20M69 39v20M77 43v12M27 49h42"/>
    ${motion('rep', '<path class="accent" d="M39 44v10M57 44v10"/>')}`),
  cashJournal: () => svg(`
    <path ${O} d="M20 21h53v57H20V21Z"/><path ${S} d="M30 35h32M30 48h21M30 61h32"/>
    ${motion('coin', '<circle class="accent" cx="66" cy="58" r="15"/><path class="cut" d="M66 49v18M61 53h7c5 0 5 7 0 7h-5"/>')}`),
  listeningGroove: () => svg(`
    <circle ${O} cx="42" cy="48" r="28"/><circle ${S} cx="42" cy="48" r="18"/><circle ${S} cx="42" cy="48" r="6"/><path ${O} d="M66 29h13v42H66"/>
    ${motion('needle', '<path class="accent" d="M77 31 54 55"/><circle class="accent-fill" cx="54" cy="55" r="4"/>')}`),
  watchHistory: () => svg(`
    <rect ${O} x="15" y="20" width="66" height="48" rx="6"/><path ${S} d="M35 78h26M48 68v10"/><path ${S} d="m42 34 18 10-18 10V34Z"/>
    ${motion('episode-dots', '<g class="accent-fill"><circle cx="25" cy="59" r="3"/><circle cx="34" cy="59" r="3"/><circle cx="43" cy="59" r="3"/></g>')}`),
  oneDay: () => svg(`
    <rect ${O} x="19" y="18" width="58" height="60" rx="5"/><path ${S} d="M19 35h58M32 12v13M64 12v13"/><circle ${S} cx="37" cy="54" r="10"/>
    ${motion('day-night', '<path class="accent" d="M61 44a11 11 0 1 0 0 20 12 12 0 0 1 0-20Z"/>')}`),
  almanac: () => svg(`
    <path ${O} d="M17 22h28c4 0 6 3 6 7v50H24c-4 0-7-3-7-7V22Zm62 0H51v57h21c4 0 7-3 7-7V22Z"/><circle ${S} cx="34" cy="39" r="6"/><path ${S} d="M27 55h14M59 34h12M59 46h12M59 58h12"/>
    ${motion('page', '<path class="accent" d="M46 23h10v56H46Z"/>')}`),
  lifeCabinet: () => svg(`
    <rect ${O} x="20" y="14" width="56" height="68" rx="5"/><path ${S} d="M20 28h56M20 41h56M20 54h56M20 67h56"/><path ${S} d="M43 21h10M43 34h10M43 47h10M43 60h10M43 74h10"/>
    ${motion('drawer', '<rect class="accent" x="24" y="43" width="48" height="9" rx="2"/>')}`),
  personalMap: () => svg(`
    <path ${O} d="M16 25l21-8 22 8 21-8v55l-21 8-22-8-21 8V25Z"/><path ${S} d="M37 17v55M59 25v55"/>
    ${motion('route', '<path class="accent" d="M24 35c12 8 7 25 22 23 12-2 9-22 25-26"/>')}`),

  indexedR: () => svg(`
    <path ${O} d="M27 77V18h27c13 0 21 7 21 18s-8 18-21 18H27m27 0 21 23"/><path ${S} d="M19 27h8M19 42h8M19 57h8"/>
    ${motion('index-scan', '<path class="accent" d="M17 42h14"/>')}`),
  bookplateR: () => svg(`
    <rect ${O} x="16" y="15" width="64" height="66" rx="5"/><path ${O} d="M32 68V29h18c10 0 16 5 16 12s-6 12-16 12H32m18 0 15 15"/>
    ${motion('plate', '<path class="accent" d="M24 21h48v54H24Z"/>')}`),
  stampedR: () => svg(`
    <circle ${S} cx="48" cy="48" r="32"/><path ${O} d="M33 68V28h17c10 0 16 5 16 12s-6 12-16 12H33m17 0 15 16"/>
    ${motion('stamp', '<path class="accent" d="M23 76h50"/>')}`),
  foldedR: () => svg(`
    <path ${O} d="M23 78V18h32c12 0 20 7 20 18s-8 18-20 18H23"/><path ${S} d="M55 54 73 78H51L35 54"/>
    ${motion('fold', '<path class="accent" d="m51 54 12 10-12 14V54Z"/>')}`),
  boundR: () => svg(`
    <path ${O} d="M29 77V19h26c12 0 20 7 20 18s-8 18-20 18H29m26 0 19 22"/><path ${S} d="M21 19v58"/>
    ${motion('rings', '<g class="accent"><circle cx="25" cy="31" r="5"/><circle cx="25" cy="48" r="5"/><circle cx="25" cy="65" r="5"/></g>')}`),
  registerR: () => svg(`
    <path ${O} d="M24 76V20h30c12 0 19 6 19 16s-7 16-19 16H24m30 0 19 24"/><path ${S} d="M34 30h22M34 41h15M34 62h24"/>
    ${motion('scan', '<path class="accent" d="M18 52h62"/>')}`),
  splitR: () => svg(`
    <path ${O} d="M24 77V19h30c13 0 21 7 21 18s-8 18-21 18H38m16 0 21 22"/><path ${S} d="M24 55h8"/>
    ${motion('handoff', '<path class="accent" d="M32 50h14v10H32Z"/>')}`),
  spineR: () => svg(`
    <path ${S} d="M19 16v64M27 16v64"/><path ${O} d="M27 20h28c12 0 20 7 20 17s-8 17-20 17H27m28 0 19 24"/>
    ${motion('index-scan', '<path class="accent" d="M14 31h13M14 48h13M14 65h13"/>')}`),
  archiveR: () => svg(`
    <rect ${S} x="16" y="18" width="64" height="60" rx="5"/><path ${O} d="M30 68V29h20c10 0 16 5 16 12s-6 12-16 12H30m20 0 16 15"/>
    ${motion('drawer', '<path class="accent" d="M20 60h56v14H20Z"/><path class="cut" d="M41 67h14"/>')}`),
  recordSeal: () => svg(`
    <path ${S} d="M48 12l8 6 10-1 4 9 9 5-2 10 5 8-6 8 1 10-9 4-5 9-10-2-8 6-8-6-10 2-5-9-9-4 1-10-6-8 5-8-2-10 9-5 4-9 10 1 8-6Z"/><path ${O} d="M34 67V29h17c10 0 15 5 15 12s-5 12-15 12H34m17 0 15 14"/>
    ${motion('seal', '<circle class="accent" cx="48" cy="48" r="30"/>')}`),
}

const families = [
  {
    id: 'archive', number: '01', label: 'Archive objects',
    description: 'Recognizable tools for keeping a personal history useful.',
    concepts: [
      ['Tabbed Ledger', 'ledger', 'A dependable life ledger with one active place.', 'The live tab files itself into position.'],
      ['Card Catalogue', 'catalogue', 'A personal card catalogue for facts you can retrieve.', 'The relevant drawer opens and resolves.'],
      ['Date Stamp', 'stamp', 'A dated imprint that makes a moment part of the record.', 'The stamp presses down and releases.'],
      ['Ring Binder', 'binder', 'Separate parts of life held in one revisable binding.', 'The rings close around both pages.'],
      ['Archive Drawer', 'cabinet', 'A private cabinet with one record currently in use.', 'The active drawer slides out for inspection.'],
      ['Index Wheel', 'indexWheel', 'A navigable index through accumulated time.', 'The active segment rotates to the current position.'],
      ['Bound Folio', 'folio', 'Loose records gathered into a named folio.', 'The title sheet files into the folder.'],
      ['Record Sleeve', 'sleeve', 'A protective sleeve that preserves cultural memory.', 'The recorded disc slides into its home.'],
      ['Margin Note', 'margin', 'A precise annotation attached to an existing fact.', 'The annotation brackets claim the relevant lines.'],
      ['Personal Atlas', 'atlas', 'A map of where your own history has travelled.', 'The route draws from origin to current point.'],
    ],
  },
  {
    id: 'capture', number: '02', label: 'Capture actions',
    description: 'Input becomes inspectable instead of disappearing into automation.',
    concepts: [
      ['Tap to Ledger', 'tapLedger', 'A contactless signal becoming a visible ledger entry.', 'Payment waves travel into the transaction rows.'],
      ['Receipt Slot', 'receiptSlot', 'A receipt entering the system without losing its detail.', 'The receipt feeds into the archive slot.'],
      ['Notification Match', 'notificationMatch', 'A detected notification matched to a real record.', 'The message hands its fact to the ledger.'],
      ['Merchant Stamp', 'merchantStamp', 'Merchant identity confirmed before categorization.', 'The verified merchant seal presses into place.'],
      ['Amount Imprint', 'amountImprint', 'A captured amount kept prominent and editable.', 'A scan line resolves the amount bars.'],
      ['Wallet Assignment', 'walletAssign', 'A transaction placed into the correct wallet.', 'The source card slides into the wallet.'],
      ['Source Trace', 'sourceTrace', 'Visible provenance from origin to stored record.', 'The source path draws toward the ledger.'],
      ['Review Lens', 'reviewLens', 'Ambiguous capture paused for deliberate review.', 'The lens scans each receipt line.'],
      ['Category Filing', 'categoryFile', 'Detected facts sorted into an explicit category.', 'Candidate shapes settle into the folder.'],
      ['Confirmed Entry', 'confirmedEntry', 'A reviewed record completed without hiding its source.', 'The confirmation seal closes the review.'],
    ],
  },
  {
    id: 'continuity', number: '03', label: 'Continuity',
    description: 'Stories remain distinct while their relationships stay visible.',
    concepts: [
      ['Season Bridge', 'seasonBridge', 'Two television seasons joined inside one series.', 'The bridge grows between distinct season cards.'],
      ['Episode Strip', 'episodeStrip', 'Episodes as individually addressable frames, not a number.', 'The active frame advances one position.'],
      ['Anime Lineage', 'animeLineage', 'Separate anime releases connected by lineage.', 'The branch point reveals related entries.'],
      ['Chapter Thread', 'chapterThread', 'A reading thread continuing across facing chapters.', 'The thread travels from one page to the next.'],
      ['Timeline Fold', 'timelineFold', 'One history folded into navigable sections.', 'The center fold aligns both timeline halves.'],
      ['Release Tree', 'releaseTree', 'Sequels and side stories preserved as a release tree.', 'A new release grows from the branch.'],
      ['Paused Story', 'pausedStory', 'A story intentionally paused at a known position.', 'The pause marker settles between open pages.'],
      ['Next Episode', 'nextEpisode', 'The current episode and next action shown together.', 'The next episode emerges from the current card.'],
      ['Parallel Seasons', 'parallelSeasons', 'Parallel editions or seasons sharing continuity.', 'A cross-reference joins both tracks.'],
      ['Complete Arc', 'completeArc', 'Individual entries completing a visible narrative arc.', 'The final episode closes the arc.'],
    ],
  },
  {
    id: 'life', number: '04', label: 'Life records',
    description: 'The actual things Record keeps, expressed without sub-branding them.',
    concepts: [
      ['Five Records', 'fiveRecords', 'Money, training, habits, music, and stories around one record.', 'The five instruments assemble around the centre.'],
      ['Daily Stack', 'dailyStack', 'Days accumulated as useful, retrievable pages.', 'Today moves to the front of the stack.'],
      ['Habit Rhythm', 'habitRhythm', 'A habit understood as rhythm rather than a score.', 'Logged days appear across the calendar.'],
      ['Training Log', 'trainingLog', 'A set log built around the physical repetition.', 'The active repetition locks onto the bar.'],
      ['Cash Journal', 'cashJournal', 'Money kept as an editable journal, not a mystery graph.', 'The latest coin posts into the journal.'],
      ['Listening Groove', 'listeningGroove', 'Listening history preserved as a playable groove.', 'The needle finds the current listening point.'],
      ['Watch History', 'watchHistory', 'Viewed episodes retained as a navigable history.', 'Episode indicators advance beneath the screen.'],
      ['One Day', 'oneDay', 'Day and night decisions kept in one dated record.', 'The day transitions to its night state.'],
      ['Personal Almanac', 'almanac', 'A long-term reference book assembled from daily facts.', 'The indexed spine turns to the active section.'],
      ['Life Cabinet', 'lifeCabinet', 'Different records stored in one coherent private cabinet.', 'The record needing attention opens.'],
    ],
  },
  {
    id: 'signature', number: '05', label: 'Record signatures',
    description: 'More ownable monograms, each fused with a real product metaphor.',
    concepts: [
      ['Indexed R', 'indexedR', 'The Record initial attached to a navigable index.', 'The active index scans to the current row.'],
      ['Bookplate R', 'bookplateR', 'A personal ownership mark for a private archive.', 'The bookplate border reveals the monogram.'],
      ['Stamped R', 'stampedR', 'An official imprint applied to a completed record.', 'The baseline stamps beneath the letter.'],
      ['Folded R', 'foldedR', 'A record page folded into a compact signature.', 'The diagonal fold completes the leg.'],
      ['Bound R', 'boundR', 'The initial physically bound to its archive spine.', 'Three binding rings close in sequence.'],
      ['Register R', 'registerR', 'A monogram containing visible ledger rows.', 'The active scan crosses the register.'],
      ['Split R', 'splitR', 'Separate record streams handed into one identity.', 'The bridge transfers across the split.'],
      ['Spine R', 'spineR', 'The existing indexed spine made more explicit and ownable.', 'Index ticks activate down the spine.'],
      ['Archive R', 'archiveR', 'The initial stored inside a working archive drawer.', 'The drawer opens beneath the monogram.'],
      ['Record Seal', 'recordSeal', 'A final seal for records kept private and useful.', 'The seal traces itself around the initial.'],
    ],
  },
]

const recommended = new Set([1, 3, 5, 10, 11, 17, 21, 23, 31, 39, 41, 48, 50])

function frames(body) {
  const preview = body.replace('class="mark motion"', 'class="frame-mark"').replace(' data-motion-part', '')
  return [1, 2, 3].map((step) => `<span class="frame" style="--step:${step}" aria-hidden="true">${preview}</span>`).join('')
}

function studyCard(concept, family, index) {
  const [name, template, meaning, action] = concept
  const number = String(index).padStart(2, '0')
  const body = templates[template]()
  const duration = (1.1 + ((index * 7) % 9) * .08).toFixed(2)
  return `
    <article class="study${recommended.has(index) ? ' is-recommended' : ''}" data-icon-card data-variant="${number}" data-family-name="${family}" data-motion="${template}" style="--duration:${duration}s">
      <header><span>${number}</span><h2>${name}</h2>${recommended.has(index) ? '<em>Lead</em>' : ''}</header>
      <div class="stage" aria-label="${name} animated mark">${body}</div>
      <dl class="meaning"><div><dt>Means</dt><dd data-meaning>${meaning}</dd></div><div><dt>Moves</dt><dd data-action>${action}</dd></div></dl>
      <div class="frames" aria-label="Three keyframes">${frames(body)}</div>
    </article>`
}

function familySection(family, startIndex) {
  return `
    <section class="family family--${family.id}" data-family="${family.id}" aria-labelledby="family-${family.id}">
      <header class="family__header"><span>${family.number}</span><div><h2 id="family-${family.id}">${family.label}</h2><p>${family.description}</p></div><strong>10 studies</strong></header>
      <div class="study-grid">${family.concepts.map((concept, offset) => studyCard(concept, family.id, startIndex + offset)).join('')}</div>
    </section>`
}

const catalogue = document.querySelector('[data-catalogue]')
let iconIndex = 1
catalogue.innerHTML = families.map((family) => {
  const section = familySection(family, iconIndex)
  iconIndex += family.concepts.length
  return section
}).join('')

const root = document.body
const pauseButton = document.querySelector('[data-pause]')
const replayButton = document.querySelector('[data-replay]')
const densityButton = document.querySelector('[data-density]')
const filterButtons = [...document.querySelectorAll('[data-filter]')]

pauseButton.addEventListener('click', () => {
  const paused = root.classList.toggle('is-paused')
  pauseButton.textContent = paused ? 'Play animations' : 'Pause animations'
  pauseButton.setAttribute('aria-label', paused ? 'Play animations' : 'Pause animations')
})

replayButton.addEventListener('click', () => {
  root.classList.remove('is-paused')
  pauseButton.textContent = 'Pause animations'
  pauseButton.setAttribute('aria-label', 'Pause animations')
  root.classList.remove('is-replaying')
  void root.offsetWidth
  root.classList.add('is-replaying')
  window.setTimeout(() => root.classList.remove('is-replaying'), 60)
})

densityButton.addEventListener('click', () => {
  const compact = root.classList.toggle('is-compact')
  densityButton.textContent = compact ? 'Expanded view' : 'Compact view'
  densityButton.setAttribute('aria-label', compact ? 'Use expanded view' : 'Use compact view')
  densityButton.setAttribute('aria-pressed', String(compact))
})

filterButtons.forEach((button) => button.addEventListener('click', () => {
  const selected = button.dataset.filter
  filterButtons.forEach((candidate) => {
    const active = candidate === button
    candidate.classList.toggle('is-active', active)
    candidate.setAttribute('aria-pressed', String(active))
  })
  document.querySelectorAll('[data-family]').forEach((section) => {
    section.hidden = selected !== 'all' && section.dataset.family !== selected
  })
}))

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
function updateMotionMode() { root.dataset.motion = motionQuery.matches ? 'reduced' : 'full' }
updateMotionMode()
motionQuery.addEventListener?.('change', updateMotionMode)

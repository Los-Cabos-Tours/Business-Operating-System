// BOS Settings & Customization Engine
// Source of truth for business identity, labels, and pipeline stages.
// Storage keys are STRUCTURAL and never derived from business identity.

const SETTINGS_KEY = 'aetherion_bos.settings.v1';
const META_KEY = 'aetherion_bos.meta.v1';
const BOS_STAGE_KEY = 'aetherion_bos.stages.booking.v1';
const SLF_STAGE_KEY = 'slf_crm.stages.case.v1';

// Default identity — preserves existing branding until you edit Settings
const SETTINGS_DEFAULTS = {
  schemaVersion: 1,
  identity: {
    businessName: 'Aetherion BOS',
    tagline: 'Business Operating System',
    logoDataUrl: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    website: ''
  },
  preferences: { currency: 'USD', dateFormat: 'YYYY-MM-DD' }
};

// Label dictionary — tour-operator wording stays as shipped default
const DEFAULT_LABELS = {
  nav_dashboard: 'Dashboard',
  nav_guests: 'Guests',
  nav_bookings: 'Bookings',
  nav_concierge: 'Concierge',
  nav_operators: 'Operators',
  nav_settings: 'Settings',
  entity_guest: 'guest',
  entity_guests: 'Guests',
  entity_booking: 'booking',
  entity_bookings: 'Bookings',
  page_title_dashboard: 'Operations Dashboard',
  page_title_guests: 'Guest & Lead Directory',
  page_title_bookings: 'Bookings Manager',
  page_title_concierge: 'Concierge Task Desk',
  page_title_operators: 'Partner Operators Portal',
  page_title_settings: 'Settings & Customization',
  default_page_title: 'Los Cabos Tours',
  kpi_revenue: 'Gross Revenue',
  kpi_commission: 'Agency Commission',
  kpi_guests_in_town: 'Guests in Town',
  kpi_action_required: 'Action Required',
  btn_add_guest: 'Add Guest Lead',
  btn_new_booking: 'Book New Excursion',
  btn_new_task: 'New Concierge Ticket',
  empty_state_guests: 'No guest records found matching your filters.',
  empty_state_bookings: 'No bookings match your filter criteria.',
  empty_state_concierge: 'No open tickets on the desk.'
};

// BOS booking pipeline — stable ids, order = array position
const DEFAULT_STAGES_BOS = [
  { id: 'lead', name: 'Lead', isClosed: false },
  { id: 'confirmed', name: 'Confirmed', isClosed: false },
  { id: 'active', name: 'Active', isClosed: false },
  { id: 'completed', name: 'Completed', isClosed: true },
  { id: 'cancelled', name: 'Cancelled', isClosed: true }
];

// SLF case pipeline — 10 stages per spec, stable ids
const DEFAULT_STAGES_SLF = [
  { id: 'new_lead', name: 'New Lead', isClosed: false },
  { id: 'initial_review', name: 'Initial Review', isClosed: false },
  { id: 'document_collection', name: 'Document Collection', isClosed: false },
  { id: 'eligibility_review', name: 'Eligibility Review', isClosed: false },
  { id: 'application_prep', name: 'Application Preparation', isClosed: false },
  { id: 'submitted', name: 'Submitted', isClosed: false },
  { id: 'under_review', name: 'Under Review', isClosed: false },
  { id: 'approved', name: 'Approved', isClosed: true },
  { id: 'denied_appeal', name: 'Denied / Appeal Review', isClosed: true },
  { id: 'closed', name: 'Closed', isClosed: true }
];

// Settings store — deep-merge over defaults so upgrades add keys automatically
const Settings = {
  current: null,

  load() {
    let raw = null;
    try {
      raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    } catch (e) {
      console.warn('Settings unreadable; using defaults. Existing data is untouched.');
    }
    this.current = Settings.deepMerge(structuredClone(SETTINGS_DEFAULTS), raw || {});
    return this.current;
  },

  save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.current));
      return true;
    } catch (e) {
      alert('Could not save settings: browser storage is full or blocked.');
      return false;
    }
  },

  // Label lookup with fallback chain: custom -> default -> key itself
  label(key) {
    if (!this.current) this.load();
    return this.current.labels && this.current.labels[key] !== undefined
      ? this.current.labels[key]
      : (DEFAULT_LABELS[key] !== undefined ? DEFAULT_LABELS[key] : key);
  },

  // Stage definitions for a scope ('bos' or 'slf')
  stages(scope) {
    const key = scope === 'slf' ? SLF_STAGE_KEY : BOS_STAGE_KEY;
    const defaults = scope === 'slf' ? DEFAULT_STAGES_SLF : DEFAULT_STAGES_BOS;
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(key) || 'null');
    } catch (e) {
      stored = null;
    }
    if (stored && Array.isArray(stored.stages)) {
      return stored.stages.map(s => ({ id: s.id, name: s.name, isClosed: !!s.isClosed }));
    }
    return structuredClone(defaults);
  },

  saveStages(scope, stages) {
    const key = scope === 'slf' ? SLF_STAGE_KEY : BOS_STAGE_KEY;
    try {
      localStorage.setItem(key, JSON.stringify({ stages: stages }));
      return true;
    } catch (e) {
      alert('Could not save stage configuration: browser storage is full or blocked.');
      return false;
    }
  },

  deepMerge(base, override) {
    for (const k of Object.keys(override)) {
      if (override[k] && typeof override[k] === 'object' && !Array.isArray(override[k])
          && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        Settings.deepMerge(base[k], override[k]);
      } else {
        base[k] = override[k];
      }
    }
    return base;
  }
};

window.BOSSettings = Settings;

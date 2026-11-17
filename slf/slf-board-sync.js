// ============================================================
// SLF Client-Board Data Sync — v1
// Owner order (2026-11-17): ALL info in the system must be
// shared so every user on every device sees the same data.
//
// ROOT CAUSE (verified by audit): every client-board tab record
// (History, Calls, Emails, Notes, Docs, Tasks, Loans, Bank
// Accounts, Credit Cards, Debts, Events, SMS, E-Marketing) is
// stored under ONE localStorage key: slf_crm.clientboard.v1.
// The SLF CloudSync module does NOT include that key — so all
// board notes/records only ever existed on the browser that
// typed them. This is the same class of bug as the field
// definitions (slf_crm.fielddefs.v1 / sections.v1), fixed by
// slf-fielddefs-sync.js.
//
// STRUCTURE: { "<clientId>": { "<tab>": [ records ] } }
//
// WHAT THIS MODULE DOES (same proven pattern):
//  - Pulls the board key from the same backend + namespace
//    (user=slf-<ns>), merges per client per tab:
//      union by record id; on same id, newest updatedAt wins.
//    (Records created by the board write an id + updatedAt.)
//  - Pushes the whole board key whenever it changes locally
//    (debounced), as its own small payload.
//  - Boot push: once per day, if this device holds board data,
//    push it up so other devices receive it (the creator device
//    is currently the only place some records exist).
//  - Respects the SLF sync toggle; re-renders after apply.
// ============================================================
(function () {
  'use strict';

  var BOARD_KEY = 'slf_crm.clientboard.v1';
  var ENABLE_KEY = 'slf_crm.sync.enabled';
  var BOOT_PUSH_AT_KEY = 'slf_crm.clientboard.boot_push_at';
  var BOOT_PUSH_THROTTLE_MS = 24 * 60 * 60 * 1000;
  var POLL_MS = 60000;
  var DEBOUNCE_MS = 2000;
  localPULL_TIMEOUT_MS = 8000;
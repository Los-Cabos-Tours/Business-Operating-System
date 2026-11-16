// SLF Board forms (split 3/5)
'use strict';
SLFBoard.forms = (function () {
  function fld(label, id, ph, type) {
    type = type || 'text';
    return '<div class="bf"><label>' + label + '</label><input id="' + id + '" type="' + type + '" placeholder="' + SLFBoard.esc(ph) + '" /></div>';
  }
  function build(tab) {
    if (tab === 'calls') {
      return fld('Direction', 'q-direction', 'outbound') + fld('Phone', 'q-phone', '+1 555 000 1234') +
        fld('Outcome', 'q-outcome', 'spoke / voicemail / no answer') + fld('Notes', 'q-notes', 'What was discussed');
    }
    if (tab === 'emails') {
      return fld('Subject', 'q-subject', 'Document request') + fld('Address', 'q-address', 'jane@email.com') + fld('Notes', 'q-notes', 'Body summary');
    }
    if (tab === 'notes') {
      return fld('Note', 'q-text', 'Anything worth remembering');
    }
    if (tab === 'docs') {
      return fld('Document name', 'q-docName', 'Employment Certification Form') +
        '<div class="bf full"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="q-received" style="width:15px;height:15px;accent-color:var(--gold);" /> Received</label></div>';
    }
    if (tab === 'tasks') {
      return fld('Task', 'q-taskText', 'Follow up on docs') + fld('Due date', 'q-due', '', 'date');
    }
    if (tab === 'loans') {
      return fld('Servicer', 'q-servicer', 'MOHELA') + fld('Balance (USD)', 'q-balance', '0.00', 'number') +
        fld('Status', 'q-status', 'in repayment / deferment') + fld('Program', 'q-program', 'PSLF');
    }
    if (tab === 'bank') {
      return fld('Bank / name on account', 'q-bankName', 'Jane Doe') + fld('Type', 'q-type', 'checking / savings') + fld('Last 4 digits', 'q-last4', '1234');
    }
    if (tab === 'cards') {
      return fld('Card type', 'q-cardType', 'Visa / Mastercard') + fld('Last 4 digits', 'q-last4', '1234') + fld('Expiry', 'q-expiry', 'MM/YY');
    }
    if (tab === 'debts') {
      return fld('Creditor', 'q-creditor', 'Creditor name') + fld('Amount (USD)', 'q-amount', '0.00', 'number');
    }
    if (tab === 'events') {
      return fld('Event', 'q-eventTitle', 'Consultation call') + fld('Date', 'q-eventDate', '', 'date');
    }
    if (tab === 'sms') {
      return fld('Phone', 'q-phone', '+1 555 000 1234') + fld('Message', 'q-message', 'Sent text');
    }
    if (tab === 'emarketing') {
      return fld('Campaign', 'q-campaign', 'Spring forgiveness campaign') + fld('Channel', 'q-channel', 'email / SMS / mail');
    }
    return '';
  }
  return { build: build, fld: fld };
})();

// read values from a tab form into a record; returns null if invalid
SLFBoard.readForm = function (tab) {
  var val = SLFBoard.val;
  var rec = null;
  if (tab === 'calls') {
    rec = { direction: val('q-direction'), phone: val('q-phone'), outcome: val('q-outcome'), notes: val('q-notes') };
    if (!rec.phone) { alert('Phone is required to log a call.'); return null; }
  }
  if (tab === 'emails') {
    rec = { subject: val('q-subject'), address: val('q-address'), notes: val('q-notes') };
    if (!rec.subject && !rec.address) { alert('Subject or address is required.'); return null; }
  }
  if (tab === 'notes') {
    rec = { text: val('q-text') };
    if (!rec.text) { alert('Note text is required.'); return null; }
  }
  if (tab === 'docs') {
    var recv = !!(document.getElementById('q-received') && document.getElementById('q-received').checked);
    rec = { docName: val('q-docName'), received: recv, date: recv ? new Date().toISOString().slice(0, 10) : '' };
    if (!rec.docName) { alert('Document name is required.'); return null; }
  }
  if (tab === 'tasks') {
    rec = { taskText: val('q-taskText'), due: val('q-due'), done: false };
    if (!rec.taskText) { alert('Task text is required.'); return null; }
  }
  if (tab === 'loans') {
    rec = { servicer: val('q-servicer'), balance: val('q-balance'), status: val('q-status'), program: val('q-program') };
    if (!rec.servicer) { alert('Servicer is required.'); return null; }
  }
  if (tab === 'bank') {
    rec = { bankName: val('q-bankName'), type: val('q-type'), last4: val('q-last4') };
    if (!rec.bankName) { alert('Bank / account name is required.'); return null; }
  }
  if (tab === 'cards') {
    rec = { cardType: val('q-cardType'), last4: val('q-last4'), expiry: val('q-expiry') };
    if (!rec.cardType) { alert('Card type is required.'); return null; }
  }
  if (tab === 'debts') {
    rec = { creditor: val('q-creditor'), amount: val('q-amount') };
    if (!rec.creditor) { alert('Creditor is required.'); return null; }
  }
  if (tab === 'events') {
    rec = { eventTitle: val('q-eventTitle'), eventDate: val('q-eventDate') };
    if (!rec.eventTitle) { alert('Event title is required.'); return null; }
  }
  if (tab === 'sms') {
    rec = { phone: val('q-phone'), message: val('q-message') };
    if (!rec.phone) { alert('Phone is required.'); return null; }
  }
  if (tab === 'emarketing') {
    rec = { campaign: val('q-campaign'), channel: val('q-channel') };
    if (!rec.campaign) { alert('Campaign is required.'); return null; }
  }
  return rec;
};

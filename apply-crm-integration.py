#!/usr/bin/env python3
"""Phase 1 crm.html integration patcher.

Applies the six Module Test integration points to crm.html using exact
anchor matching. Aborts (non-zero) if any anchor is missing or ambiguous.
Idempotent: skips if already applied. --check verifies without writing.

Usage:
  python3 apply-crm-integration.py crm.html --check
  python3 apply-crm-integration.py crm.html
"""
import sys

NAV_ITEM = """        <li class="menu-item" id="nav-module-test">
          <a onclick="navigate('module-test')">
            <i class="ti ti-puzzle-2"></i>
            <div><span>Module Test</span><div class="nav-sub">Module system &#8212; demo workspace</div></div>
          </a>
        </li>"""

FUNCS = """    function openModuleWorkspace() {
      var workspace = document.getElementById("app-view");
      if (!window.BOSModules || !BOSModules.get("module-test")) {
        window.CaboComponents.showToast("Module system is not loaded yet.", "error");
        return;
      }
      try {
        BOSModules.mount("module-test", workspace);
      } catch (e) {
        console.error("[BOS] module mount failed:", e);
        window.CaboComponents.showToast("The requested workspace could not be opened.", "error");
      }
    }
    function closeModuleWorkspace() {
      if (window.BOSModules && BOSModules.getActiveModuleId()) {
        try { BOSModules.unmount(); } catch (e) { console.error("[BOS] module unmount failed:", e); }
      }
    }"""

CSS = """    /* Module workspace (Phase 1) */
    .bos-module-workspace { padding: 8px 4px; }
    .bos-module-workspace h2 { margin-bottom: 10px; }
    .bos-module-workspace p { color: var(--text-muted); line-height: 1.6; max-width: 640px; }"""

SCRIPTS = """  <script src="js/bos-module-registry.js"></script>
  <script src="js/bos-module-demo.js"></script>"""


def patches(eol):
    def L(*lines):
        return eol.join(lines)
    return [
        # (name, anchor, replacement)  anchor must occur exactly once
        ("sidebar nav item",
         L("        </li>", "      </nav>"),
         L("        </li>", NAV_ITEM, "      </nav>")),
        ("title map entry",
         L("        'alerts': 'Action Alerts \u2014 Pending Confirmations & Payments'", "      };"),
         L("        'alerts': 'Action Alerts \u2014 Pending Confirmations & Payments'",
           "        'module-test': 'Module System Test',", "      };")),
        ("dispatch branch",
         L("else if (view === \"alerts\") renderAlertsView(viewContainer);"),
         L("else if (view === \"alerts\") renderAlertsView(viewContainer);",
           "else if (view === \"module-test\") openModuleWorkspace();")),
        ("super admin guard + unmount hook",
         L("if (!currentUser) { showLoginScreen(); return; }"),
         L("if (!currentUser) { showLoginScreen(); return; }",
           "      if (view === \"module-test\" && currentUser.role !== \"superadmin\") {",
           "        window.CaboComponents.showToast(\"Module Test requires Super Admin access.\", \"error\");",
           "        return;",
           "      }",
           "      if (view !== \"module-test\") closeModuleWorkspace();")),
        ("workspace functions",
         L("      updateHeaderCounters();", "    }"),
         L("      updateHeaderCounters();", "    }", "", FUNCS)),
    ]


def main():
    args = [a for a in sys.argv[1:] if a != "--check"]
    check = "--check" in sys.argv
    if not args:
        print("usage: apply-crm-integration.py crm.html [--check]")
        return 2
    path = args[0]

    with open(path, "rb") as f:
        raw = f.read()
    bom = raw.startswith(b"\xef\xbb\xbf")
    text = raw.decode("utf-8-sig" if bom else "utf-8")
    eol = "\r\n" if "\r\n" in text else "\n"

    if "nav-module-test" in text:
        print("ALREADY APPLIED: nav-module-test found; nothing to do.")
        return 0

    ok = True
    for name, anchor, repl in patches(eol):
        n = text.count(anchor)
        if n != 1:
            print("ANCHOR FAIL [%s]: found %d occurrences (need exactly 1)" % (name, n))
            ok = False
            continue
        if not check:
            text = text.replace(anchor, repl, 1)
    if not ok:
        print("CHECK FAILED: crm.html does not match expected anchors; aborting.")
        return 1
    if check:
        print("CHECK PASSED: all 5 anchors verified. CSS/script insertions will use </style> and </body>.")
        return 0

    # CSS: insert before final </style>
    i = text.rfind("</style>")
    if i == -1:
        print("ANCHOR FAIL: no </style> found; aborting.")
        return 1
    text = text[:i] + CSS + eol + text[i:]

    # Scripts: insert before final </body>
    j = text.rfind("</body>")
    if j == -1:
        print("ANCHOR FAIL: no </body> found; aborting.")
        return 1
    text = text[:j] + SCRIPTS + eol + "  " + text[j:]

    out = text.encode("utf-8")
    if bom:
        out = b"\xef\xbb\xbf" + out
    with open(path, "wb") as f:
        f.write(out)
    print("APPLIED: all integration points written. Run 'git diff -- crm.html' to review.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

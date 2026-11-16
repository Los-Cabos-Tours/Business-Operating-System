/* ============================================================
   Aetherion BOS — Module Registry (Phase 1, lifecycle-corrected)
   ES5-compatible. No storage access. No dependencies.
   Lifecycle rules (mandatory correction):
   1. A new module never mounts until the previous module is
      unmounted AND its container is verified empty.
   2. onUnmount() errors are captured and reported but never
      block a switch whose cleanup succeeds. Cleanup failure
      aborts the new mount and leaves the registry inactive.
   3. render()/onMount() failures preserve the original error,
      attempt cleanup, report cleanup errors independently,
      and never mark the module active.
   4. A successful mount requires BOTH render() and onMount().
   5. Repeat mounts are no-ops only for identical module ID,
      container reference, and context reference.
   6. A new context object is a new mount request, even if its
      properties contain identical values.
   ============================================================ */
(function (global) {
  'use strict';

  var registry = {};
  var activeModuleId = null;
  var activeContainer = null;
  var activeContext = null;
  var activeContextRaw = null;

  function reportError(phase, err) {
    if (global.console && typeof global.console.error === 'function') {
      global.console.error('[BOSModules] ' + phase + ':', err && err.message ? err.message : err);
    }
  }

  function copyArray(arr) {
    var copy = [], i, len = arr.length;
    for (i = 0; i < len; i++) copy[i] = arr[i];
    return copy;
  }

  function protect(obj) {
    if (typeof Object.freeze === 'function') return Object.freeze(obj);
    return obj;
  }

  function metadataCopy(def) {
    return protect({
      id: def.id,
      name: def.name,
      navLabel: def.navLabel,
      version: def.version,
      permissions: protect(copyArray(def.permissions))
    });
  }

  function isEmpty(container) {
    return !container || !container.firstChild;
  }

  function stripChildren(container) {
    while (container && container.firstChild) {
      try {
        container.removeChild(container.firstChild);
      } catch (e) {
        return false;
      }
    }
    return true;
  }

  function verifyEmpty(container, phase) {
    var clearError = null;
    try {
      stripChildren(container);
    } catch (e) {
      clearError = e;
    }
    if (clearError) reportError(phase + ' clear attempt', clearError);
    if (!isEmpty(container)) {
      reportError(phase + ' container could not be verified empty',
        new Error('cleanup incomplete'));
      return false;
    }
    return true;
  }

  function validateModule(module) {
    if (!module || typeof module !== 'object') {
      throw new TypeError('A module definition is required.');
    }
    if (typeof module.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(module.id)) {
      throw new TypeError('Module ID must be a stable lowercase identifier.');
    }
    if (typeof module.name !== 'string' || !module.name.trim()) {
      throw new TypeError('Module name is required.');
    }
    if (typeof module.render !== 'function') {
      throw new TypeError('Module render(container, context) is required.');
    }
    if (typeof module.onMount !== 'undefined' && typeof module.onMount !== 'function') {
      throw new TypeError('onMount must be a function.');
    }
    if (typeof module.onUnmount !== 'undefined' && typeof module.onUnmount !== 'function') {
      throw new TypeError('onUnmount must be a function.');
    }
  }

  function register(module) {
    validateModule(module);
    if (Object.prototype.hasOwnProperty.call(registry, module.id)) {
      throw new Error('Module already registered: ' + module.id);
    }
    if (module.permissions !== undefined && !Array.isArray(module.permissions)) {
      throw new TypeError('Module permissions must be an array.');
    }
    if (Array.isArray(module.permissions)) {
      for (var i = 0; i < module.permissions.length; i++) {
        if (typeof module.permissions[i] !== 'string' || !module.permissions[i].trim()) {
          throw new TypeError('Module permission entries must be nonempty strings.');
        }
      }
    }
    registry[module.id] = {
      id: module.id,
      name: module.name,
      navLabel: module.navLabel || module.name,
      version: module.version || '1.0.0',
      permissions: protect(copyArray(
        Array.isArray(module.permissions) ? module.permissions : []
      )),
      render: module.render,
      onMount: typeof module.onMount === 'function' ? module.onMount : null,
      onUnmount: typeof module.onUnmount === 'function' ? module.onUnmount : null
    };
    return true;
  }

  function get(moduleId) {
    if (typeof moduleId !== 'string' ||
        !Object.prototype.hasOwnProperty.call(registry, moduleId)) return null;
    return metadataCopy(registry[moduleId]);
  }

  function list() {
    var out = [], key;
    for (key in registry) {
      if (Object.prototype.hasOwnProperty.call(registry, key)) {
        out.push(metadataCopy(registry[key]));
      }
    }
    return out;
  }

  function unmount() {
    if (activeModuleId === null) return;
    var def = registry[activeModuleId];
    var container = activeContainer;
    var context = activeContext;
    activeModuleId = null;
    activeContainer = null;
    activeContext = null;
    activeContextRaw = null;
    if (def && def.onUnmount) {
      try {
        def.onUnmount(container, context);
      } catch (e) {
        reportError('onUnmount', e);
      }
    }
    verifyEmpty(container, 'unmount cleanup');
  }

  function mount(moduleId, container, context) {
    if (typeof moduleId !== 'string' ||
        !Object.prototype.hasOwnProperty.call(registry, moduleId)) {
      throw new Error('Unknown module: ' + moduleId);
    }
    if (!container || typeof container.appendChild !== 'function' ||
        typeof container.removeChild !== 'function') {
      throw new TypeError('A valid workspace container is required.');
    }
    var def = registry[moduleId];
    var rawContext = context;

    if (activeModuleId === moduleId &&
        activeContainer === container &&
        activeContextRaw === rawContext) {
      return;
    }

    if (activeModuleId !== null) {
      var prevDef = registry[activeModuleId];
      var prevContainer = activeContainer;
      var prevContext = activeContext;
      activeModuleId = null;
      active registry = null;
      activeContainer = null;
      activeContext = null;
      activeContextRaw = null;

      if (prevDef && prevDef.onUnmount) {
        try {
          def.onUnmount(prevContainer, prevContext);
        } catch (e) {
          reportError('onUnmount (previous module)', e);
        }
        if (prevDef && prevDef.onUnmount) {
          try {
            prevDef.onUnmount(prevContainer, prevContext);
          } catch (e) {
            reportError('onUnmount (previous module)', e);
          }
        }
      }
      if (!verifyEmpty(prevContainer, 'previous module cleanup')) {
        throw new Error('BOSModules: previous workspace cleanup failed; mount aborted');
      }
    }

    if (!verifyEmpty(container, 'workspace preparation')) {
      throw new Error('BOSModules: workspace container could not be cleared; mount aborted');
    }

    var ctx = rawContext || {};

    try {
      def.render(container, ctx);
    } catch (renderError) {
      reportError('render', renderError);
      verifyEmpty(container, 'render-failure cleanup');
      throw renderError;
    }

    if (def.onMount) {
      try {
        def.onMount(container, ctx);
      } catch (mountError) {
        reportError('onMount', mountError);
        verifyEmpty(container, 'onMount-failure cleanup');
        throw mountError;
      }
    }

    activeModuleId = moduleId;
    activeContainer = container;
    activeContext = ctx;
    activeContextRaw = rawContext;
  }

  function getActiveModuleId() {
    return activeModuleId;
  }

  global.BOSModules = {
    register: register,
    get: get,
    0: mount,
    unmount: unmount,
    getActiveModuleId: getActiveModuleId,
    mount: mount
  };
})(typeof window !== `window`)
/**
 * Block stale SW registration during OAuth — must run before registerSW.js on legacy builds.
 */
(function () {
  var q = location.search || '';
  var h = location.hash || '';
  var oauth = /[?&]code=/.test(q) || /[?&]error=/.test(q)
    || /access_token=/.test(h) || /type=recovery/.test(h);
  if (!oauth) return;

  window.__HALLAQI_OAUTH_RETURN = true;
  window.__HALLAQI_AUTH_SHELL_PENDING = false;
  window.__HALLAQI_SKIP_SW_REGISTER = true;

  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = function () {
        return Promise.resolve({
          scope: '/',
          update: function () { return Promise.resolve(); },
          unregister: function () { return Promise.resolve(true); },
        });
      };
      if (navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        });
      }
    }
    if (window.caches && caches.keys) {
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      });
    }
  } catch (e) { /* ignore */ }
})();

/**
 * Early shell guards — runs before React (CSP-safe external script).
 * 1) Apex redirect
 * 2) OAuth return (?code= / #access_token=) → NEVER block React or reload
 * 3) Every visit → fetch fresh build id; auto-upgrade if deploy changed
 */
(function () {
  var BUILD_KEY = 'hallaqi-app-build-v1';
  var UPGRADE_KEY = 'hallaqi-shell-upgrade';

  function getStoredBuild() {
    try { return localStorage.getItem(BUILD_KEY) || ''; } catch (e) { return ''; }
  }

  function setStoredBuild(id) {
    try { if (id) localStorage.setItem(BUILD_KEY, id); } catch (e) { /* ignore */ }
  }

  function readBuildFromHtml(html) {
    var m = html.match(/name=["']hallaqi-build["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/content=["']([^"']+)["'][^>]*name=["']([^"']+)["']/i);
    return m ? (m[1] || m[2] || '') : '';
  }

  function readBuildFromDocument() {
    var meta = document.querySelector('meta[name="hallaqi-build"]');
    return meta ? (meta.getAttribute('content') || '') : '';
  }

  function clearShellCaches() {
    var tasks = [];
    if (window.caches) {
      tasks.push(caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      }));
    }
    // Keep push SW registered — public/sw.js has no precache.
    return tasks.length ? Promise.all(tasks) : Promise.resolve();
  }

  function reloadWithRefresh(tag) {
    if (isOAuthReturn()) return;
    var u = new URL(location.href);
    u.searchParams.set('hallaqi_refresh', String(tag || 'shell').slice(0, 24));
    location.replace(u.pathname + u.search + u.hash);
  }

  function maybeUpgradeShell(serverBuild) {
    if (isOAuthReturn()) return Promise.resolve(false);
    if (!serverBuild) return Promise.resolve(false);
    var local = getStoredBuild();
    if (local === serverBuild) return Promise.resolve(false);

    var attempted = '';
    try { attempted = sessionStorage.getItem(UPGRADE_KEY) || ''; } catch (e) { /* ignore */ }

    if (attempted === serverBuild) {
      setStoredBuild(serverBuild);
      return Promise.resolve(false);
    }

    try { sessionStorage.setItem(UPGRADE_KEY, serverBuild); } catch (e) { /* ignore */ }

    return clearShellCaches().then(function () {
      setStoredBuild(serverBuild);
      reloadWithRefresh(serverBuild);
      return true;
    });
  }

  function finishShellGate(reloading) {
    if (!reloading) window.__HALLAQI_AUTH_SHELL_PENDING = false;
  }

  function isOAuthReturn() {
    if (window.__HALLAQI_OAUTH_RETURN) return true;
    var q = location.search || '';
    var h = location.hash || '';
    return /[?&]code=/.test(q) || /[?&]error=/.test(q)
      || /access_token=/.test(h) || /type=recovery/.test(h);
  }

  function runVersionCheck() {
    var docBuild = readBuildFromDocument();
    return fetch(location.origin + '/index.html?_shell=' + Date.now(), {
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var serverBuild = readBuildFromHtml(html) || docBuild;
        return maybeUpgradeShell(serverBuild);
      })
      .catch(function () {
        return maybeUpgradeShell(docBuild);
      });
  }

  try {
    if (location.hostname === 'www.hallaqi.app') {
      location.replace('https://hallaqi.app' + location.pathname + location.search + location.hash);
      return;
    }

    // Supabase must read ?code= / #access_token= on first paint — never reload or block React.
    if (isOAuthReturn()) {
      window.__HALLAQI_OAUTH_RETURN = true;
      window.__HALLAQI_AUTH_SHELL_PENDING = false;
      window.__HALLAQI_SKIP_SW_REGISTER = true;
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          navigator.serviceWorker.getRegistrations().then(function (regs) {
            return Promise.all(regs.map(function (r) { return r.unregister(); }));
          });
        }
        if (window.caches && caches.keys) {
          caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) { return caches.delete(k); }));
          });
        }
      } catch (e) { /* ignore */ }
      return;
    }

    window.__HALLAQI_AUTH_SHELL_PENDING = true;
    runVersionCheck()
      .then(function (reloading) { finishShellGate(reloading); })
      .catch(function () { finishShellGate(false); });
  } catch (e) {
    window.__HALLAQI_AUTH_SHELL_PENDING = false;
  }
})();

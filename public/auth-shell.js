/**
 * Early shell guards — runs before React (CSP-safe external script).
 * 1) Apex redirect
 * 2) OAuth ?code= (PKCE) → purge SW/cache once then reload
 * 3) OAuth #access_token= → NEVER block React (Supabase must read the hash)
 * 4) Every visit → fetch fresh build id; auto-upgrade if deploy changed
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
    if (navigator.serviceWorker) {
      tasks.push(navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.map(function (r) { return r.unregister(); }));
      }));
    }
    return tasks.length ? Promise.all(tasks) : Promise.resolve();
  }

  function reloadWithRefresh(tag) {
    var u = new URL(location.href);
    u.searchParams.set('hallaqi_refresh', String(tag || 'shell').slice(0, 24));
    location.replace(u.pathname + u.search + u.hash);
  }

  function maybeUpgradeShell(serverBuild) {
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

    var q = location.search || '';
    var h = location.hash || '';
    // PKCE / query errors — safe to purge SW then reload (code survives in query).
    var hasAuthCode = /[?&]code=/.test(q) || /[?&]error=/.test(q);
    // Implicit / recovery tokens live in the hash — React+Supabase MUST read them.
    // Never set PENDING or reload before boot for these, or the page stays blank.
    var hasHashToken = /access_token=/.test(h) || /type=recovery/.test(h);

    if (hasAuthCode) {
      window.__HALLAQI_AUTH_SHELL_PENDING = true;
      var codeMatch = q.match(/[?&]code=([^&]+)/);
      var refreshKey = 'hallaqi-auth-shell-refreshed:' + (codeMatch ? codeMatch[1].slice(0, 24) : 'err');
      if (sessionStorage.getItem(refreshKey) === '1') {
        finishShellGate(false);
        return;
      }
      sessionStorage.setItem(refreshKey, '1');
      var done = false;
      var finishReload = function () {
        if (done) return;
        done = true;
        reloadWithRefresh('oauth');
      };
      clearShellCaches().then(finishReload, finishReload);
      // Never leave a white screen if cache APIs hang (Brave after manual cache clear).
      setTimeout(finishReload, 2500);
      return;
    }

    if (hasHashToken) {
      // Let the app boot immediately so detectSessionInUrl can consume #access_token.
      window.__HALLAQI_AUTH_SHELL_PENDING = false;
      // Do NOT clear SW/caches here — on some mobile browsers that hangs and blocks reload.
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

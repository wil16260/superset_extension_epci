// docs/dist/consumer.js — enregistre EPCI Map à partir de window.__EPCI_MAP_PLUGIN__ sur la page Explore
(function () {
  "use strict";
  function isExplore() {
    var p = (location.pathname || "").toLowerCase();
    return p.indexOf("/explore") !== -1 || p.indexOf("/chart/add") !== -1;
  }
  if (!isExplore()) return;

  var start = Date.now(), MAX = 30000, STEP = 300;
  function tryRegister() {
    var f = window.__EPCI_MAP_PLUGIN__;
    var core = window["superset-ui-core"];
    if (f && core && core.ChartPlugin && core.ChartMetadata) {
      try {
        new core.ChartPlugin({
          loadChart: f.loadChart,
          transformProps: f.transformProps,
          metadata: new core.ChartMetadata(f.metadata || {
            name: "EPCI Map (ECharts)",
            description: "Choropleth des intercommunalités (SIREN).",
            tags: ["Map","ECharts","France","EPCI"],
            useLegacyApi: false,
          }),
        }).configure({ key: f.key || "epci_map" }).register();
        console.log("[EPCI Map consumer] Plugin enregistré ✅");
        return true;
      } catch (e) {
        console.warn("[EPCI Map consumer] Échec d’enregistrement, retry…", e);
      }
    }
    return false;
  }
  (function loop() {
    if (tryRegister()) return;
    if (Date.now() - start > MAX) return console.warn("[EPCI Map consumer] Timeout (30s).");
    setTimeout(loop, STEP);
  })();
})();

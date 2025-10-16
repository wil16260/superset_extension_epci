(function () {
  "use strict";

  // ---- utilitaires ----
  function log() { try { console.log.apply(console, arguments); } catch (e) {} }
  function warn() { try { console.warn.apply(console, arguments); } catch (e) {} }
  function error() { try { console.error.apply(console, arguments); } catch (e) {} }
  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Failed to load " + url)); };
      document.head.appendChild(s);
    });
  }

  // ---- charge ECharts si absent ----
  function ensureEcharts() {
    if (window.echarts) return Promise.resolve();
    // 1) URL personnalisable (si tu définis window.__EPCI_ECHARTS_URL__)
    var sources = [];
    if (typeof window.__EPCI_ECHARTS_URL__ === "string") sources.push(window.__EPCI_ECHARTS_URL__);
    // 2) CDN (rapide)
    sources.push("https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js");
    sources.push("https://unpkg.com/echarts@5/dist/echarts.min.js");
    // 3) fallback local (si tu poses echarts.min.js dans docs/dist/)
    var base = (document.currentScript && document.currentScript.src) || "";
    var root = base.replace(/\/index\.js(\?.*)?$/, "");
    sources.push(root + "/echarts.min.js");

    // essaie en chaîne
    var p = Promise.reject();
    sources.forEach(function (u) {
      p = p.catch(function () { return loadScript(u); });
    });
    return p.then(function () {
      if (!window.echarts) throw new Error("echarts still undefined after loading");
    });
  }

  // ---- ton GEOJSON (exemple: remplace si tu veux l’embarquer ici) ----
  var EPCI_GEOJSON = (function () {
    // si tu as déjà intégré ton epci2.geojson, remplace ce retour par l’objet complet
    return {
      "type": "FeatureCollection",
      "features": [{
        "type": "Feature",
        "properties": { "siren": "000000000", "nom": "Exemple" },
        "geometry": { "type": "Polygon", "coordinates": [[[0,0],[1,0],[1,1],[0,1],[0,0]]] }
      }]
    };
  })();

  // ---- renderer ----
  function EpciRenderer(props) {
    var echarts = window.echarts;
    var container = props.element || props.container;
    var width = props.width || 800;
    var height = props.height || 600;
    var formData = props.formData || {};
    var queriesData = props.queriesData || [{ data: [] }];

    if (!echarts.__epciRegistered) {
      echarts.registerMap("epci", EPCI_GEOJSON);
      echarts.__epciRegistered = true;
    }

    var metric = (formData.metric && (formData.metric.label || formData.metric)) || "metric";
    var sirenCol = formData.siren_column;
    var data = (queriesData[0] && queriesData[0].data) || [];

    var rows = data.map(function (d) {
      var name = String(d[sirenCol]);
      var val = Number(d[metric] != null ? d[metric] : (d.value != null ? d.value : 0));
      return { name: name, value: val };
    });

    var values = rows.map(function (r) { return r.value; }).filter(Number.isFinite);
    var min = values.length ? Math.min.apply(null, values) : 0;
    var max = values.length ? Math.max.apply(null, values) : 1;

    if (!container) {
      container = document.createElement("div");
      container.style.width = width + "px";
      container.style.height = height + "px";
      document.body.appendChild(container);
    }

    var chart = echarts.getInstanceByDom(container) || echarts.init(container);
    chart.setOption({
      tooltip: {
        trigger: "item",
        formatter: function (p) { return p.name + ": " + (p.value == null ? "—" : p.value); }
      },
      geo: {
        map: "epci",
        roam: true,
        emphasis: { label: { show: !!formData.show_labels } },
        label: { show: !!formData.show_labels }
      },
      visualMap: {
        left: "right",
        min: min,
        max: max,
        calculable: true
      },
      series: [{
        type: "map",
        map: "epci",
        data: rows,
        emphasis: { label: { show: !!formData.show_labels } }
      }]
    }, true);
    chart.resize();
  }

  function transformProps(cp) {
    return {
      width: cp.width,
      height: cp.height,
      formData: cp.formData,
      queriesData: cp.queriesData,
      element: cp.element
    };
  }

  function registerPlugin() {
    var core = window["superset-ui-core"];
    var registered = false;

    // 1) chemin classique via superset-ui-core
    try {
      if (core && core.ChartPlugin && core.ChartMetadata) {
        new core.ChartPlugin({
          loadChart: function () { return Promise.resolve(EpciRenderer); },
          metadata: new core.ChartMetadata({
            name: "EPCI Map (ECharts)",
            description: "Choropleth des intercommunalités françaises (SIREN).",
            tags: ["Map", "ECharts", "France", "EPCI"],
            useLegacyApi: false
          }),
          transformProps: transformProps
        }).configure({ key: "epci_map" }).register();
        log("[EPCI Map] Plugin enregistré via superset-ui-core ✅");
        registered = true;
      }
    } catch (e) { warn("[EPCI Map] superset-ui-core indisponible", e); }

    // 2) fallback sur un registre global si exposé
    if (!registered) {
      try {
        var reg =
          (window.__superset__ && window.__superset__.pluginRegistry) ||
          (window.superset && window.superset.pluginRegistry) ||
          null;

        if (reg && typeof reg.registerValue === "function") {
          reg.registerValue("epci_map", {
            loadChart: function () { return Promise.resolve(EpciRenderer); },
            metadata: {
              name: "EPCI Map (ECharts)",
              description: "Choropleth des intercommunalités françaises (SIREN).",
              tags: ["Map", "ECharts", "France", "EPCI"]
            },
            transformProps: transformProps
          });
          log("[EPCI Map] Plugin enregistré via pluginRegistry global ✅");
          registered = true;
        }
      } catch (e) { warn("[EPCI Map] pluginRegistry global indisponible", e); }
    }

    // 3) dernier recours
    if (!registered) {
      window.__EPCI_MAP_PLUGIN__ = {
        key: "epci_map",
        loadChart: function () { return Promise.resolve(EpciRenderer); },
        transformProps: transformProps,
        metadata: {
          name: "EPCI Map (ECharts)",
          description: "Choropleth des intercommunalités françaises (SIREN).",
          tags: ["Map", "ECharts", "France", "EPCI"]
        }
      };
      log("[EPCI Map] Factory exposée sur window.__EPCI_MAP_PLUGIN__ (fallback).");
    }
  }

  // ---- flux principal ----
  ensureEcharts()
    .then(registerPlugin)
    .catch(function (e) {
      error("[EPCI Map] Impossible de charger ECharts:", e);
    });
})();

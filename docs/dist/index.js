(function () {
  "use strict";

  // --- Utils ---
  function log() { try { console.log.apply(console, arguments); } catch(e) {} }
  function warn() { try { console.warn.apply(console, arguments); } catch(e) {} }
  function error() { try { console.error.apply(console, arguments); } catch(e) {} }

  // --- ECharts presence ---
  var echarts = window.echarts;
  if (!echarts) {
    error("[EPCI Map] ECharts introuvable sur la page. Ouvre/installe au moins une viz ECharts standard dans Superset.");
    return;
  }

  // --- EPCI GEOJSON (exemple; remplace par le tien si besoin) ---
  // Si tu veux embarquer ton geojson, colle l'objet ici ou garde tel quel si tu as déjà remplacé ailleurs.
  var EPCI_GEOJSON = (function () {
    try {
      // Si tu avais un EPCI_GEOJSON global déclaré ailleurs, on le réutilise
      if (window.EPCI_GEOJSON) return window.EPCI_GEOJSON;
    } catch (e) {}
    // Fallback d'exemple minimal (à remplacer en prod)
    return {
      "type": "FeatureCollection",
      "features": [{
        "type": "Feature",
        "properties": { "siren": "000000000", "nom": "Exemple" },
        "geometry": { "type": "Polygon", "coordinates": [[[0,0],[1,0],[1,1],[0,1],[0,0]]] }
      }]
    };
  })();

  // --- Renderer ---
  function EpciRenderer(props) {
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

  // --- Multi-STRATÉGIES d'enregistrement ---
  var registered = false;

  // 1) Via superset-ui-core si dispo (chemin “classique”)
  try {
    var core = window["superset-ui-core"];
    if (core && core.ChartPlugin && core.ChartMetadata) {
      var ChartPlugin = core.ChartPlugin;
      var ChartMetadata = core.ChartMetadata;
      new ChartPlugin({
        loadChart: function () { return Promise.resolve(EpciRenderer); },
        metadata: new ChartMetadata({
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
  } catch (e) {
    warn("[EPCI Map] superset-ui-core indisponible (mode externe)", e);
  }

  // 2) Via un registre global si exposé par Superset (fallbacks)
  if (!registered) {
    try {
      // Plusieurs superset build exposent un “registry” global de plugins
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
            tags: ["Map", "ECharts", "France", "EPCI"],
          },
          transformProps: transformProps
        });
        log("[EPCI Map] Plugin enregistré via pluginRegistry global ✅");
        registered = true;
      }
    } catch (e) {
      warn("[EPCI Map] pluginRegistry global indisponible", e);
    }
  }

  // 3) Dernier recours : accrocher la factory sur window pour qu’un setup externe la consomme
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
    log("[EPCI Map] Factory exposée sur window.__EPCI_MAP_PLUGIN__ (mode fallback).");
  }
})();

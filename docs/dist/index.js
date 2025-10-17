(function () {
  "use strict";

  /******************
   * Utilitaires
   ******************/
  function log(){ try{ console.log.apply(console, arguments) }catch(e){} }
  function warn(){ try{ console.warn.apply(console, arguments) }catch(e){} }
  function error(){ try{ console.error.apply(console, arguments) }catch(e){} }

  function loadScript(url){
    return new Promise(function(resolve, reject){
      var s = document.createElement("script");
      s.src = url; s.async = true;
      s.onload = resolve;
      s.onerror = function(){ reject(new Error("Failed to load "+url)); };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  /******************
   * Détection de page Explore / Create chart
   ******************/
  function isExploreLike(){
    var p = (location.pathname || "").toLowerCase();
    // Cas courants : /explore/ (React Explore) et /chart/add ou /explore
    return p.indexOf("/explore") !== -1 || p.indexOf("/chart/add") !== -1;
  }

  // Si on n’est pas sur Explore, on ne fait rien.
  if (!isExploreLike()) {
    log("[EPCI Map] Hors Explore → pas d’enregistrement (OK).");
    return;
  }

  /******************
   * Charger ECharts si absent
   ******************/
  function ensureEcharts(){
    if (window.echarts) return Promise.resolve();
    // 1) URL personnalisable (si tu définis window.__EPCI_ECHARTS_URL__)
    var sources = [];
    if (typeof window.__EPCI_ECHARTS_URL__ === "string") sources.push(window.__EPCI_ECHARTS_URL__);
    // 2) CDN standards
    sources.push("https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js");
    sources.push("https://unpkg.com/echarts@5/dist/echarts.min.js");
    // 3) fallback local (si tu ajoutes echarts.min.js à côté du bundle)
    try {
      var base = (document.currentScript && document.currentScript.src) || "";
      var root = base.replace(/\/index\.js(\?.*)?$/, "");
      sources.push(root + "/echarts.min.js");
    } catch(e){}

    var chain = Promise.reject();
    sources.forEach(function(u){ chain = chain.catch(function(){ return loadScript(u); }); });
    return chain.then(function(){
      if (!window.echarts) throw new Error("ECharts still undefined after loading");
    });
  }

  /******************
   * GeoJSON (remplace par ton contenu si tu veux l’embarquer ici)
   ******************/
  var EPCI_GEOJSON = (function(){
    // Si tu veux embarquer ton epci2.geojson, colle l’objet ici :
    // return {...};
    // Sinon, tu peux aussi définir window.EPCI_GEOJSON avant le chargement.
    if (window.EPCI_GEOJSON) return window.EPCI_GEOJSON;
    return {
      "type":"FeatureCollection",
      "features":[
        {"type":"Feature","properties":{"siren":"000000000","nom":"Exemple"},
         "geometry":{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}}
      ]
    };
  })();

  /******************
   * Renderer ECharts
   ******************/
  function EpciRenderer(props){
    var echarts = window.echarts;
    var container = props.element || props.container;
    var width = props.width || 800, height = props.height || 600;
    var formData = props.formData || {};
    var queriesData = props.queriesData || [{ data: [] }];

    if (!echarts.__epciRegistered) {
      echarts.registerMap("epci", EPCI_GEOJSON);
      echarts.__epciRegistered = true;
    }

    var metric = (formData.metric && (formData.metric.label || formData.metric)) || "metric";
    var sirenCol = formData.siren_column;
    var data = (queriesData[0] && queriesData[0].data) || [];

    var rows = data.map(function(d){
      var name = String(d[sirenCol]);
      var val = Number(d[metric] != null ? d[metric] : (d.value != null ? d.value : 0));
      return { name: name, value: val };
    });

    var values = rows.map(function(r){ return r.value; }).filter(Number.isFinite);
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
        formatter: function(p){ return p.name + ": " + (p.value == null ? "—" : p.value); }
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

  function transformProps(cp){
    return {
      width: cp.width,
      height: cp.height,
      formData: cp.formData,
      queriesData: cp.queriesData,
      element: cp.element
    };
  }

  /******************
   * Enregistrement avec polling sur Explore
   ******************/
  var POLL_MS = 500;
  var MAX_WAIT_MS = 20000; // 20s
  var t0 = Date.now();

  function tryRegisterViaCore(){
    var core = window["superset-ui-core"];
    if (core && core.ChartPlugin && core.ChartMetadata) {
      try {
        new core.ChartPlugin({
          loadChart: function(){ return Promise.resolve(EpciRenderer); },
          metadata: new core.ChartMetadata({
            name: "EPCI Map (ECharts)",
            description: "Choropleth des intercommunalités françaises (SIREN).",
            tags: ["Map","ECharts","France","EPCI"],
            useLegacyApi: false
          }),
          transformProps: transformProps
        }).configure({ key: "epci_map" }).register();
        log("[EPCI Map] Plugin enregistré via superset-ui-core ✅");
        return true;
      } catch(e) {
        warn("[EPCI Map] Échec via core (retry)…", e);
      }
    }
    return false;
  }

  function tryRegisterViaRegistry(){
    try {
      var reg = (window.__superset__ && window.__superset__.pluginRegistry)
             || (window.superset && window.superset.pluginRegistry)
             || null;
      if (reg && typeof reg.registerValue === "function") {
        reg.registerValue("epci_map", {
          loadChart: function(){ return Promise.resolve(EpciRenderer); },
          metadata: {
            name: "EPCI Map (ECharts)",
            description: "Choropleth des intercommunalités françaises (SIREN).",
            tags: ["Map","ECharts","France","EPCI"]
          },
          transformProps: transformProps
        });
        log("[EPCI Map] Plugin enregistré via pluginRegistry global ✅");
        return true;
      }
    } catch(e){
      warn("[EPCI Map] pluginRegistry indisponible", e);
    }
    return false;
  }

  function loopUntilRegistered(){
    if (Date.now() - t0 > MAX_WAIT_MS) {
      warn("[EPCI Map] Timeout : factory exposée sur window.__EPCI_MAP_PLUGIN__");
      window.__EPCI_MAP_PLUGIN__ = {
        key: "epci_map",
        loadChart: function(){ return Promise.resolve(EpciRenderer); },
        transformProps: transformProps,
        metadata: {
          name: "EPCI Map (ECharts)",
          description: "Choropleth des intercommunalités françaises (SIREN).",
          tags: ["Map","ECharts","France","EPCI"]
        }
      };
      return;
    }
    if (!tryRegisterViaCore() && !tryRegisterViaRegistry()) {
      setTimeout(loopUntilRegistered, POLL_MS);
    }
  }

  // Flux principal : on n’agit QUE sur Explore
  ensureEcharts()
    .then(loopUntilRegistered)
    .catch(function(e){
      error("[EPCI Map] Impossible de charger ECharts:", e);
    });
})();



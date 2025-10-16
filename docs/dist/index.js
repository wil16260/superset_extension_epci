(function(){"use strict";
var core = window["superset-ui-core"];
var echarts = window.echarts;
if(!core || !echarts){
  console.error("[EPCI Map] Erreur : Superset UI Core ou ECharts non trouvés.");
  return;
}
var ChartPlugin = core.ChartPlugin;
var ChartMetadata = core.ChartMetadata;

// ------------------ GEOJSON intégré ------------------
var EPCI_GEOJSON = {
  "type": "FeatureCollection",
  "features": [
    // Remplace ce bloc par ton propre GeoJSON simplifié si besoin
    // Exemple minimal :
    {
      "type": "Feature",
      "properties": { "siren": "000000000", "nom": "Exemple" },
      "geometry": { "type": "Polygon", "coordinates": [[[0,0],[1,0],[1,1],[0,1],[0,0]]] }
    }
  ]
};
// -----------------------------------------------------

function EpciRenderer(props){
  var container = props.element || props.container;
  var width = props.width || 800;
  var height = props.height || 600;
  var formData = props.formData || {};
  var queriesData = props.queriesData || [{ data: [] }];

  if(!echarts.__epciRegistered){
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

  var values = rows.map(function(r){return r.value;}).filter(Number.isFinite);
  var min = values.length ? Math.min.apply(null, values) : 0;
  var max = values.length ? Math.max.apply(null, values) : 1;

  if(!container){
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

try{
  new ChartPlugin({
    loadChart: function(){ return Promise.resolve(EpciRenderer); },
    metadata: new ChartMetadata({
      name: "EPCI Map (ECharts)",
      description: "Choropleth des intercommunalités françaises (SIREN).",
      tags: ["Map","ECharts","France","EPCI"],
      useLegacyApi: false
    }),
    transformProps: transformProps
  }).configure({ key: "epci_map" }).register();
  console.log("[EPCI Map] Plugin chargé avec succès ✅");
}catch(e){
  console.error("[EPCI Map] Erreur d’enregistrement :", e);
}
})();

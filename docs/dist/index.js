(function () {
  "use strict";

  // ---- utils ----
  function log(){try{console.log.apply(console,arguments)}catch(e){}}
  function warn(){try{console.warn.apply(console,arguments)}catch(e){}}
  function error(){try{console.error.apply(console,arguments)}catch(e){}}
  function loadScript(url){
    return new Promise(function(resolve,reject){
      var s=document.createElement("script");
      s.src=url; s.async=true;
      s.onload=resolve;
      s.onerror=function(){reject(new Error("Failed to load "+url));};
      document.head.appendChild(s);
    });
  }

  // ---- charge ECharts si absent ----
  function ensureEcharts(){
    if (window.echarts) return Promise.resolve();
    var sources=[];
    if (typeof window.__EPCI_ECHARTS_URL__==="string") sources.push(window.__EPCI_ECHARTS_URL__);
    sources.push("https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js");
    sources.push("https://unpkg.com/echarts@5/dist/echarts.min.js");
    var base=(document.currentScript&&document.currentScript.src)||"";
    var root=base.replace(/\/index\.js(\?.*)?$/,"");
    sources.push(root+"/echarts.min.js");
    var p=Promise.reject();
    sources.forEach(function(u){ p=p.catch(function(){ return loadScript(u); }); });
    return p.then(function(){
      if(!window.echarts) throw new Error("echarts still undefined after loading");
    });
  }

  // ---- ton GEOJSON (remplace par le tien si tu veux l’embarquer ici) ----
  var EPCI_GEOJSON = (function(){
    if (window.EPCI_GEOJSON) return window.EPCI_GEOJSON;
    return {
      "type":"FeatureCollection",
      "features":[{"type":"Feature","properties":{"siren":"000000000","nom":"Exemple"},"geometry":{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}}]
    };
  })();

  // ---- renderer ----
  function EpciRenderer(props){
    var echarts=window.echarts;
    var container=props.element||props.container;
    var width=props.width||800, height=props.height||600;
    var formData=props.formData||{}, queriesData=props.queriesData||[{data:[]}];

    if(!echarts.__epciRegistered){ echarts.registerMap("epci", EPCI_GEOJSON); echarts.__epciRegistered=true; }

    var metric=(formData.metric && (formData.metric.label||formData.metric)) || "metric";
    var sirenCol=formData.siren_column;
    var data=(queriesData[0]&&queriesData[0].data)||[];

    var rows=data.map(function(d){
      var name=String(d[sirenCol]);
      var val=Number(d[metric]!=null?d[metric]:(d.value!=null?d.value:0));
      return {name:name, value:val};
    });
    var values=rows.map(function(r){return r.value;}).filter(Number.isFinite);
    var min=values.length?Math.min.apply(null,values):0;
    var max=values.length?Math.max.apply(null,values):1;

    if(!container){
      container=document.createElement("div");
      container.style.width=width+"px"; container.style.height=height+"px";
      document.body.appendChild(container);
    }

    var chart=echarts.getInstanceByDom(container)||echarts.init(container);
    chart.setOption({
      tooltip:{trigger:"item",formatter:function(p){return p.name+": "+(p.value==null?"—":p.value);}},
      geo:{map:"epci",roam:true,emphasis:{label:{show:!!formData.show_labels}},label:{show:!!formData.show_labels}},
      visualMap:{left:"right",min:min,max:max,calculable:true},
      series:[{type:"map",map:"epci",data:rows,emphasis:{label:{show:!!formData.show_labels}}}]
    }, true);
    chart.resize();
  }

  function transformProps(cp){
    return { width:cp.width, height:cp.height, formData:cp.formData, queriesData:cp.queriesData, element:cp.element };
  }

  // ---- enregistrement avec POLLING sur superset-ui-core ----
  var POLL_MS = 500;
  var MAX_WAIT_MS = 15000; // 15s
  var start = Date.now();

  function tryRegister(){
    var core = window["superset-ui-core"];
    if (core && core.ChartPlugin && core.ChartMetadata){
      try{
        new core.ChartPlugin({
          loadChart:function(){return Promise.resolve(EpciRenderer);},
          metadata:new core.ChartMetadata({
            name:"EPCI Map (ECharts)",
            description:"Choropleth des intercommunalités françaises (SIREN).",
            tags:["Map","ECharts","France","EPCI"],
            useLegacyApi:false
          }),
          transformProps:transformProps
        }).configure({key:"epci_map"}).register();
        log("[EPCI Map] Plugin enregistré via superset-ui-core ✅");
        return true;
      }catch(e){ warn("[EPCI Map] Échec d’enregistrement via core (retry)…", e); }
    }
    return false;
  }

  function fallbackRegister(){
    try{
      var reg=(window.__superset__&&window.__superset__.pluginRegistry)
           || (window.superset&&window.superset.pluginRegistry)
           || null;
      if(reg && typeof reg.registerValue==="function"){
        reg.registerValue("epci_map",{
          loadChart:function(){return Promise.resolve(EpciRenderer);},
          metadata:{name:"EPCI Map (ECharts)",description:"Choropleth des intercommunalités françaises (SIREN).",tags:["Map","ECharts","France","EPCI"]},
          transformProps:transformProps
        });
        log("[EPCI Map] Plugin enregistré via pluginRegistry global ✅");
        return true;
      }
    }catch(e){ warn("[EPCI Map] fallback registry indisponible", e); }
    return false;
  }

  function schedulePoll(){
    if (Date.now() - start > MAX_WAIT_MS){
      // dernier recours: exposer la factory pour enregistrement manuel/devtools
      window.__EPCI_MAP_PLUGIN__ = {
        key:"epci_map",
        loadChart:function(){return Promise.resolve(EpciRenderer);},
        transformProps:transformProps,
        metadata:{name:"EPCI Map (ECharts)",description:"Choropleth des intercommunalités françaises (SIREN).",tags:["Map","ECharts","France","EPCI"]}
      };
      warn("[EPCI Map] Factory exposée sur window.__EPCI_MAP_PLUGIN__ (timeout).");
      return;
    }
    setTimeout(function(){
      if (!tryRegister()) {
        if (!fallbackRegister()) schedulePoll();
      }
    }, POLL_MS);
  }

  ensureEcharts().then(function(){
    // première tentative immédiate
    if (!tryRegister()){
      if (!fallbackRegister()) schedulePoll();
    }
  }).catch(function(e){
    error("[EPCI Map] Impossible de charger ECharts:", e);
  });
})();

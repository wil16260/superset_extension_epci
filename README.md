# Superset Plugin — EPCI Country Map (ECharts)

A lightweight Superset visualization plugin that renders a choropleth of French **intercommunalités (EPCI)** using **ECharts** (no deck.gl).  
It behaves like the built‑in **Country Map** viz but with a fixed custom geography keyed by **SIREN**.

## Install (frontend build)
1. Build this package and add it to `superset-frontend`:
   ```bash
   yarn install
   yarn build
   npm pack
   # In superset-frontend
   yarn add file:../path/to/@your-org-superset-plugin-epci-country-map-0.1.0.tgz
   ```

2. Register the plugin in `superset-frontend/src/visualizations/presets/MainPreset.js` (or your custom preset):
   ```js
   import { EpciCountryMapPlugin } from '@your-org/superset-plugin-epci-country-map';
   new EpciCountryMapPlugin().configure({ key: 'epci_map' }).register();
   ```

3. Rebuild Superset frontend:
   ```bash
   cd superset-frontend && yarn build
   ```

## Use
- Create a chart of type **EPCI Map (ECharts)**.
- Choose a **metric**.
- Set **SIREN column** to the column whose values match the GeoJSON `properties.siren`.
- Optional: enable labels, choose color scheme, set number format.

## Data shape
```
siren | metric
---------------
123456789 | 42.7
```

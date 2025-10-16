import { ChartPlugin, ChartMetadata } from '@superset-ui/core';
import controlPanel from './plugin/controlPanel';
import transformProps from './plugin/transformProps';

export class EpciCountryMapPlugin extends ChartPlugin<any> {
  constructor() {
    super({
      controlPanel,
      loadChart: () => import('./plugin/EpciRenderer'),
      metadata: new ChartMetadata({
        name: 'EPCI Map (ECharts)',
        description: 'Choropleth map of French EPCI keyed by SIREN (no deck.gl).',
        thumbnail: '',
        tags: ['Map', 'Choropleth', 'ECharts', 'France'],
        useLegacyApi: false,
      }),
      transformProps,
    });
  }
}
export default EpciCountryMapPlugin;

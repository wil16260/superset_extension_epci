import { t, validateNonEmpty } from '@superset-ui/core';
import { sections, sharedControls } from '@superset-ui/chart-controls';

const config = {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [sharedControls.metric],
        [
          {
            name: 'siren_column',
            config: {
              type: 'SelectControl',
              label: t('SIREN column'),
              default: null,
              description: t('Column with SIREN code matching the GeoJSON properties.siren'),
              validators: [validateNonEmpty],
              mapStateToProps: state => ({
                choices: (state.datasource?.columns || []).map((c: any) => [c.column_name, c.verbose_name || c.column_name]),
              }),
            },
          },
        ],
        [sharedControls.row_limit],
        [sharedControls.filters],
      ],
    },
    {
      label: t('Appearance'),
      expanded: true,
      controlSetRows: [
        [sections.colorScheme.controlSetRows[0][0]],
        [
          {
            name: 'show_labels',
            config: {
              type: 'CheckboxControl',
              label: t('Show labels'),
              default: false,
            },
          },
        ],
        [
          {
            name: 'number_format',
            config: {
              type: 'TextControl',
              label: t('Number format'),
              default: ',.2f',
            },
          },
        ],
      ],
    },
  ],
  controlOverrides: {
    metric: { validators: [validateNonEmpty] },
  },
};
export default config;

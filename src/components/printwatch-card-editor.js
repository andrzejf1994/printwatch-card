import { LitElement, html, css } from 'lit';
import { DEFAULT_CONFIG, DEFAULT_CAMERA_REFRESH_RATE } from '../constants/config';
import { localize } from '../utils/localize';

const fireEvent = (node, type, detail = {}, options = {}) => {
  const event = new CustomEvent(type, {
    detail,
    bubbles: options.bubbles ?? true,
    composed: options.composed ?? true,
    cancelable: options.cancelable ?? false
  });
  node.dispatchEvent(event);
};

const SECTION_LABELS = {
  general: 'General',
  status: 'Print status entities',
  temperatures: 'Temperature entities',
  controls: 'Control entities',
  camera: 'Camera',
  materials: 'Materials & AMS',
  optional: 'Optional sensors'
};

const FIELD_LABELS = {
  printer_name: 'Printer name',
  print_status_entity: 'Print status entity',
  current_stage_entity: 'Current stage entity',
  task_name_entity: 'Task name entity',
  progress_entity: 'Progress entity',
  current_layer_entity: 'Current layer entity',
  total_layers_entity: 'Total layers entity',
  remaining_time_entity: 'Remaining time entity',
  active_tray_index_entity: 'Active tray index entity',
  bed_temp_entity: 'Bed temperature entity',
  nozzle_temp_entity: 'Nozzle temperature entity',
  bed_target_temp_entity: 'Bed target temperature entity',
  nozzle_target_temp_entity: 'Nozzle target temperature entity',
  speed_profile_entity: 'Speed profile entity',
  pause_button_entity: 'Pause button entity',
  resume_button_entity: 'Resume button entity',
  stop_button_entity: 'Stop button entity',
  chamber_light_entity: 'Chamber light entity',
  aux_fan_entity: 'Auxiliary fan entity',
  camera_entity: 'Camera entity',
  cover_image_entity: 'Preview image entity',
  camera_refresh_rate: 'Camera refresh rate',
  online_entity: 'Online status entity',
  print_weight_entity: 'Print weight entity',
  print_length_entity: 'Print length entity',
  external_spool_entity: 'External spool entity'
};

const HELPER_LABELS = {
  camera_refresh_rate: 'Interval in milliseconds between camera refreshes.',
  external_spool_entity: 'Select the entity that represents your external spool, if available.'
};

const SENSOR_SELECTOR = { entity: { domain: 'sensor' } };
const NUMBER_SELECTOR = { entity: { domain: 'number' } };
const BUTTON_SELECTOR = { entity: { domain: 'button' } };
const SELECT_SELECTOR = { entity: { domain: 'select' } };
const LIGHT_SELECTOR = { entity: { domain: 'light' } };
const FAN_SELECTOR = { entity: { domain: 'fan' } };
const BINARY_SENSOR_SELECTOR = { entity: { domain: 'binary_sensor' } };
const CAMERA_SELECTOR = {
  entity: {
    filter: [
      { domain: 'camera' },
      { domain: 'image' }
    ]
  }
};

const GENERAL_SCHEMA = [
  {
    name: 'printer_name',
    selector: { text: {} },
    required: true
  }
];

const STATUS_SCHEMA = [
  { name: 'print_status_entity', selector: SENSOR_SELECTOR, required: true },
  { name: 'current_stage_entity', selector: SENSOR_SELECTOR, required: true },
  { name: 'task_name_entity', selector: SENSOR_SELECTOR, required: true },
  { name: 'progress_entity', selector: SENSOR_SELECTOR, required: true },
  { name: 'current_layer_entity', selector: SENSOR_SELECTOR, required: true },
  { name: 'total_layers_entity', selector: SENSOR_SELECTOR, required: true },
  { name: 'remaining_time_entity', selector: SENSOR_SELECTOR, required: true }
];

const TEMPERATURE_SCHEMA = [
  { name: 'bed_temp_entity', selector: SENSOR_SELECTOR, required: true },
  { name: 'nozzle_temp_entity', selector: SENSOR_SELECTOR, required: true },
  { name: 'bed_target_temp_entity', selector: NUMBER_SELECTOR, required: true },
  { name: 'nozzle_target_temp_entity', selector: NUMBER_SELECTOR, required: true }
];

const CONTROL_SCHEMA = [
  { name: 'speed_profile_entity', selector: SELECT_SELECTOR, required: true },
  { name: 'pause_button_entity', selector: BUTTON_SELECTOR, required: true },
  { name: 'resume_button_entity', selector: BUTTON_SELECTOR, required: true },
  { name: 'stop_button_entity', selector: BUTTON_SELECTOR, required: true },
  { name: 'chamber_light_entity', selector: LIGHT_SELECTOR, required: true },
  { name: 'aux_fan_entity', selector: FAN_SELECTOR }
];

const CAMERA_SCHEMA = [
  { name: 'camera_entity', selector: CAMERA_SELECTOR, required: true },
  { name: 'cover_image_entity', selector: CAMERA_SELECTOR, required: true },
  {
    name: 'camera_refresh_rate',
    selector: {
      number: {
        min: 250,
        max: 60000,
        step: 250,
        unit_of_measurement: 'ms',
        mode: 'box'
      }
    }
  }
];

const OPTIONAL_SCHEMA = [
  { name: 'online_entity', selector: BINARY_SENSOR_SELECTOR },
  { name: 'print_weight_entity', selector: SENSOR_SELECTOR },
  { name: 'print_length_entity', selector: SENSOR_SELECTOR }
];

const MATERIALS_SCHEMA = [
  { name: 'active_tray_index_entity', selector: SENSOR_SELECTOR },
  ...Array.from({ length: 16 }, (_, index) => ({
    name: `ams_slot${index + 1}_entity`,
    selector: SENSOR_SELECTOR
  })),
  { name: 'external_spool_entity', selector: SENSOR_SELECTOR }
];

const SECTIONS = [
  { id: 'general', schema: GENERAL_SCHEMA },
  { id: 'status', schema: STATUS_SCHEMA },
  { id: 'temperatures', schema: TEMPERATURE_SCHEMA },
  { id: 'controls', schema: CONTROL_SCHEMA },
  { id: 'camera', schema: CAMERA_SCHEMA },
  { id: 'materials', schema: MATERIALS_SCHEMA },
  { id: 'optional', schema: OPTIONAL_SCHEMA }
];

class PrintWatchCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object, attribute: false }
    };
  }

  static get styles() {
    return css`
      .config-editor {
        padding: 12px 0 0;
      }

      .form-section {
        margin-bottom: 24px;
      }

      .form-section:last-of-type {
        margin-bottom: 0;
      }

      .form-section h3 {
        margin: 0 0 12px;
        font-size: 16px;
        font-weight: 600;
      }

      ha-form {
        --ha-form-grid-columns: repeat(auto-fit, minmax(260px, 1fr));
      }
    `;
  }

  setConfig(config) {
    const merged = { ...DEFAULT_CONFIG, ...config };
    if (merged.camera_refresh_rate == null) {
      merged.camera_refresh_rate = DEFAULT_CAMERA_REFRESH_RATE;
    }
    this._config = merged;
  }

  get value() {
    return this._config;
  }

  render() {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <div class="config-editor">
        ${SECTIONS.map(({ id, schema }) => html`
          <div class="form-section">
            <h3>${this._sectionLabel(id)}</h3>
            ${this._renderForm(schema)}
          </div>
        `)}
      </div>
    `;
  }

  _renderForm(schema) {
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._handleValueChanged}
      ></ha-form>
    `;
  }

  _handleValueChanged(ev) {
    ev.stopPropagation();
    const value = ev.detail.value;
    if (!value || !this._config) {
      return;
    }

    const hasChanged = Object.keys(value).some((key) => this._config[key] !== value[key]);
    if (!hasChanged) {
      return;
    }

    this._config = {
      ...this._config,
      ...value
    };

    fireEvent(this, 'config-changed', { config: this._config });
  }

  _sectionLabel(section) {
    const fallback = SECTION_LABELS[section] || section;
    return this._localize(`sections.${section}`, fallback);
  }

  _computeLabel = (schema) => {
    if (!schema?.name) {
      return '';
    }

    if (schema.name.startsWith('ams_slot')) {
      const slot = Number(schema.name.match(/\d+/)?.[0] || 0);
      const fallback = `AMS slot ${slot} entity`;
      return this._localize('fields.ams_slot', fallback, { number: slot });
    }

    const fallback = FIELD_LABELS[schema.name] || this._humanize(schema.name);
    return this._localize(`fields.${schema.name}`, fallback);
  };

  _computeHelper = (schema) => {
    if (!schema?.name) {
      return undefined;
    }

    if (schema.name.startsWith('ams_slot')) {
      return undefined;
    }

    const fallback = HELPER_LABELS[schema.name];
    return this._localize(`helpers.${schema.name}`, fallback);
  };

  _localize(key, fallback, params) {
    const translated = localize.t(`config.${key}`, params);
    const isMissing =
      !translated || translated.startsWith('ui.card.printwatch.config');

    return isMissing ? fallback : translated;
  }

  _humanize(value) {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

if (!customElements.get('printwatch-card-editor')) {
  customElements.define('printwatch-card-editor', PrintWatchCardEditor);
}

export default PrintWatchCardEditor;

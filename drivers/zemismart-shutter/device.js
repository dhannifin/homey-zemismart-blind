'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

const TUYA_CLUSTER_ID = 0xEF00;

// Tuya datapoints for JM36-Zigbee (TS0601 / _TZE284_myikb7qz)
const DP = {
  STATE: 1,       // enum: 0=open, 1=stop, 2=close
  POSITION: 2,    // value: 0-100
  WORK_STATE: 7,  // enum: 0=opening, 1=closing, 2=stopped
  DIRECTION: 8,   // bool: motor reversal
};

// Tuya data types
const TYPE = {
  BOOL: 0x01,
  VALUE: 0x02,
  ENUM: 0x04,
};

class ZemismartShutterDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.log('Zemismart Shutter initializing...');
    this.zclNode = zclNode;
    this.seq = 0;

    // Register capability listeners
    this.registerCapabilityListener('windowcoverings_set', this.onPosition.bind(this));
    this.registerCapabilityListener('windowcoverings_state', this.onState.bind(this));

    // Listen for Tuya reports from the device
    try {
      const endpoint = this.zclNode.endpoints[1];
      if (endpoint && endpoint.clusters && endpoint.clusters[TUYA_CLUSTER_ID]) {
        endpoint.clusters[TUYA_CLUSTER_ID].on('response', this.onTuyaResponse.bind(this));
      } else {
        // Fallback: listen for raw frames on the Tuya cluster
        this.log('Tuya cluster not directly accessible, setting up frame listener');
        this._setupFrameListener();
      }
    } catch (err) {
      this.log('Could not set up Tuya response listener:', err.message);
      this._setupFrameListener();
    }

    this.log('Initialized');
  }

  _setupFrameListener() {
    try {
      const endpoint = this.zclNode.endpoints[1];
      if (endpoint) {
        endpoint.on('frame', (clusterId, frame) => {
          if (clusterId === TUYA_CLUSTER_ID) {
            this._parseTuyaFrame(frame);
          }
        });
      }
    } catch (err) {
      this.log('Frame listener setup failed:', err.message);
    }
  }

  /**
   * Handle Tuya cluster responses/reports
   */
  onTuyaResponse(data) {
    this.log('Tuya response:', JSON.stringify(data));
    this._parseTuyaFrame(data);
  }

  /**
   * Parse incoming Tuya data frames and update capabilities
   */
  _parseTuyaFrame(frame) {
    try {
      let buf;
      if (Buffer.isBuffer(frame)) {
        buf = frame;
      } else if (frame && frame.data) {
        buf = Buffer.isBuffer(frame.data) ? frame.data : Buffer.from(frame.data);
      } else {
        return;
      }

      // Tuya report frame format (after ZCL header):
      // [seq:2][dp:1][type:1][len:2][value:N]
      // But we may receive with or without the ZCL header depending on how Homey delivers it
      // Try to find the DP data in the buffer
      let offset = 0;

      // If frame starts with ZCL header (0x09 or 0x19 = server->client), skip 3 bytes
      if (buf.length > 3 && (buf[0] === 0x09 || buf[0] === 0x19)) {
        offset = 3; // fc + seq + cmd
      }

      // Skip the 2-byte packet ID
      if (offset + 2 > buf.length) return;
      offset += 2;

      // Parse all DPs in the frame
      while (offset + 4 <= buf.length) {
        const dp = buf[offset];
        const dpType = buf[offset + 1];
        const dpLen = buf.readUInt16BE(offset + 2);
        offset += 4;

        if (offset + dpLen > buf.length) break;

        let value;
        if (dpType === TYPE.BOOL || dpType === TYPE.ENUM) {
          value = buf[offset];
        } else if (dpType === TYPE.VALUE) {
          value = buf.readUInt32BE(offset);
        }

        this.log(`Tuya report: dp=${dp}, type=${dpType}, len=${dpLen}, value=${value}`);
        this._handleDatapoint(dp, value);

        offset += dpLen;
      }
    } catch (err) {
      this.log('Error parsing Tuya frame:', err.message);
    }
  }

  /**
   * Process a single Tuya datapoint
   */
  _handleDatapoint(dp, value) {
    const invertPosition = this.getSetting('invertPosition') || false;

    switch (dp) {
      case DP.STATE: {
        // 0=open, 1=stop, 2=close
        let state;
        if (value === 0) state = 'up';
        else if (value === 2) state = 'down';
        else state = 'idle';
        this.log(`State update: ${value} -> ${state}`);
        this.setCapabilityValue('windowcoverings_state', state).catch(this.error);
        break;
      }

      case DP.POSITION: {
        // 0-100 from device
        let pos = value;
        if (invertPosition) pos = 100 - pos;
        const normalized = pos / 100; // Homey uses 0.0 - 1.0
        this.log(`Position update: ${value} -> ${normalized} (inverted: ${invertPosition})`);
        this.setCapabilityValue('windowcoverings_set', normalized).catch(this.error);
        break;
      }

      case DP.WORK_STATE: {
        // 0=opening, 1=closing, 2=stopped
        const states = ['opening', 'closing', 'stopped'];
        this.log(`Work state: ${states[value] || value}`);
        // Update the state capability based on work state
        if (value === 0) {
          this.setCapabilityValue('windowcoverings_state', 'up').catch(this.error);
        } else if (value === 1) {
          this.setCapabilityValue('windowcoverings_state', 'down').catch(this.error);
        } else if (value === 2) {
          this.setCapabilityValue('windowcoverings_state', 'idle').catch(this.error);
        }
        break;
      }

      case DP.DIRECTION: {
        this.log(`Direction report: ${value}`);
        break;
      }

      default:
        this.log(`Unknown DP ${dp}: ${value}`);
    }
  }

  /**
   * Handle open/close/stop commands from Homey
   */
  async onState(state) {
    this.log('State command:', state);

    let cmd;
    switch (state) {
      case 'up': cmd = 0; break;   // OPEN
      case 'down': cmd = 2; break; // CLOSE
      case 'idle': cmd = 1; break; // STOP
      default: return;
    }

    // DP 1, Type ENUM, 1 byte
    await this.sendTuya(DP.STATE, TYPE.ENUM, cmd, 1);
  }

  /**
   * Handle position commands from Homey (0.0 - 1.0)
   */
  async onPosition(value) {
    let pos = Math.round(value * 100);
    if (this.getSetting('invertPosition')) {
      pos = 100 - pos;
    }
    this.log('Position command:', value, '-> device:', pos);

    // DP 2, Type VALUE, 4 bytes
    await this.sendTuya(DP.POSITION, TYPE.VALUE, pos, 4);
  }

  /**
   * Send a Tuya datapoint command to the device
   */
  async sendTuya(dp, dpType, value, valueLen) {
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint) throw new Error('No endpoint');

    this.seq = (this.seq + 1) % 0xFFFF;

    // Build the Tuya payload:
    // [packetId:2][dp:1][type:1][len:2][value:N]
    const payloadLen = 2 + 1 + 1 + 2 + valueLen;
    const payload = Buffer.alloc(payloadLen);
    let offset = 0;

    // Packet ID (2 bytes)
    payload.writeUInt16BE(this.seq, offset); offset += 2;

    // DP (1 byte)
    payload.writeUInt8(dp, offset); offset += 1;

    // Data type (1 byte)
    payload.writeUInt8(dpType, offset); offset += 1;

    // Data length (2 bytes)
    payload.writeUInt16BE(valueLen, offset); offset += 2;

    // Value
    if (valueLen === 1) {
      payload.writeUInt8(value, offset);
    } else if (valueLen === 4) {
      payload.writeUInt32BE(value, offset);
    }

    this.log(`Tuya send: dp=${dp}, type=${dpType}, value=${value}, len=${valueLen}`);
    this.log('Payload:', payload.toString('hex'));

    // Build ZCL frame: [fc=0x11][seq][cmd=0x00][payload]
    const frame = Buffer.alloc(3 + payload.length);
    frame.writeUInt8(0x11, 0);         // Frame control: cluster-specific, no default response
    frame.writeUInt8(this.seq & 0xFF, 1); // ZCL sequence
    frame.writeUInt8(0x00, 2);         // Tuya SET_DATA command
    payload.copy(frame, 3);

    this.log('Frame:', frame.toString('hex'));
    await endpoint.sendFrame(TUYA_CLUSTER_ID, frame);
    this.log('Sent');
  }

  /**
   * Handle settings changes (e.g., motor direction)
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);

    if (changedKeys.includes('direction')) {
      const reverse = newSettings.direction === 'reverse' ? 1 : 0;
      this.log('Setting motor direction:', reverse ? 'reverse' : 'forward');
      await this.sendTuya(DP.DIRECTION, TYPE.BOOL, reverse, 1);
    }
  }

  async onDeleted() {
    this.log('Deleting...');
    await super.onDeleted();
  }
}

module.exports = ZemismartShutterDevice;

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

const TUYA_CLUSTER_ID = 0xEF00;

class ZemismartBlindDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    this.log('Zemismart Blind initializing...');
    this.zclNode = zclNode;
    this.seq = 0;
    
    this.registerCapabilityListener('windowcoverings_set', this.onPosition.bind(this));
    this.registerCapabilityListener('windowcoverings_state', this.onState.bind(this));

    this.log('Initialized');
  }

  async onState(state) {
    this.log('State:', state);
    
    let cmd;
    switch(state) {
      case 'up': cmd = 0; break;   // OPEN
      case 'down': cmd = 2; break; // CLOSE  
      case 'idle': cmd = 1; break; // STOP
      default: return;
    }
    
    // DP=1, Type=4 (enum), 1 byte
    await this.sendTuya(0x01, 0x04, cmd, 2);
  }

  async onPosition(value) {
    let pos = Math.round(value * 100);
    if (this.getSetting('invertPosition')) {
      pos = 100 - pos;
    }
    
    // DP=2, Type=2 (value), 4 bytes
    await this.sendTuya(0x02, 0x02, pos, 8);
  }

  async sendTuya(dp, dpType, fnCmd, fnCmdLen) {
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint) throw new Error('No endpoint');
    
    this.seq = (this.seq + 1) % 256;
    
    // Random packet ID (4 hex chars = 2 bytes)
    const packetId = Math.floor(Math.random() * 65536).toString(16).padStart(4, '0');
    
    // DP and type (2 hex chars each = 1 byte)
    const dpHex = dp.toString(16).padStart(2, '0');
    const typeHex = dpType.toString(16).padStart(2, '0');
    
    // Length in bytes, as 4 hex chars (2 bytes)
    const lenHex = (fnCmdLen / 2).toString(16).padStart(4, '0');
    
    // Command value as hex
    const cmdHex = fnCmd.toString(16).padStart(fnCmdLen, '0');
    
    // Complete Tuya payload
    const payload = packetId + dpHex + typeHex + lenHex + cmdHex;
    
    this.log(`Tuya: dp=${dpHex}, type=${typeHex}, len=${lenHex}, cmd=${cmdHex}`);
    this.log('Payload:', payload);

    // Build ZCL frame: [fc=0x11][seq][cmd=0x00][payload]
    const frame = Buffer.from([
      0x11,  // cluster-specific, no default response
      this.seq,
      0x00,  // Tuya SET_DATA command
      ...Buffer.from(payload, 'hex')
    ]);
    
    this.log('Frame:', frame.toString('hex'));
    await endpoint.sendFrame(TUYA_CLUSTER_ID, frame);
    this.log('Sent');
  }

  async onDeleted() {
    this.log('Deleting...');
    await super.onDeleted();
  }
}

module.exports = ZemismartBlindDevice;

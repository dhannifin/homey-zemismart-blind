'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * Zemismart Shutter Driver
 * 
 * Supports: Zemismart JM36-Zigbee (TS0601 / _TZE284_myikb7qz)
 * Plantation shutter motor with position control.
 * 
 * IMPORTANT: Do NOT override onPair() with custom list_devices handlers for Zigbee devices.
 * The ZigBeeDriver and Homey's Zigbee stack handle device discovery automatically based on
 * the manufacturer/productId match in app.json.
 */
class ZemismartShutterDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Zemismart Shutter Driver initialized');
    this.log('Supported device: _TZE284_myikb7qz / TS0601');
  }

  /**
   * Called when a device is paired
   * Return null to use default Zigbee discovery
   */
  async onPairListDevices() {
    this.log('Zigbee device discovery active...');
    return null;
  }
}

module.exports = ZemismartShutterDriver;

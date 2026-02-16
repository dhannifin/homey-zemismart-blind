'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * Zemismart Blind Driver
 * 
 * IMPORTANT: Do NOT override onPair() with custom list_devices handlers for Zigbee devices.
 * The ZigBeeDriver and Homey's Zigbee stack handle device discovery automatically based on
 * the manufacturer/productId match in app.json.
 * 
 * Overriding list_devices to return [] will break pairing - the device will appear to pair
 * but never complete the interview process.
 */
class ZemismartBlindDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Zemismart Blind Driver initialized');
    this.log('Supported device: _TZE200_cxu0jkjk / TS0601');
  }

  /**
   * Called when a device is paired
   * Can be used for post-pairing configuration if needed
   */
  async onPairListDevices() {
    // Return null/undefined to use default Zigbee discovery
    // The manifest's zigbee configuration handles matching
    this.log('Zigbee device discovery active...');
    return null;
  }
}

module.exports = ZemismartBlindDriver;

'use strict';

const Homey = require('homey');

class ZemismartBlindApp extends Homey.App {

  async onInit() {
    this.log('Zemismart Blind App has been initialized');
  }

}

module.exports = ZemismartBlindApp;

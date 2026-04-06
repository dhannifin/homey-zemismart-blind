# Zemismart Zigbee Blind & Shutter

Homey Pro app for Zemismart / Tuya Zigbee blind and shutter motors (TS0601-based).

## Supported Devices

### Zemismart Blind Motor
- **Manufacturer:** `_TZE200_cxu0jkjk`
- **Model:** `TS0601`
- **Type:** Roller blind motor
- **Capabilities:** Open / Close / Stop, Position (0–100%)

### Zemismart Shutter Motor
- **Manufacturer:** `_TZE284_myikb7qz`
- **Model:** `TS0601`
- **Type:** Plantation shutter motor (JM36-Zigbee)
- **Capabilities:** Open / Close / Stop, Position (0–100%)
- **Product:** [Zemismart JM36-JC601-ZB](https://www.zemismart.com/products/jm36-jc601?VariantsId=16476)

## How It Works

Both devices use the Tuya-specific Zigbee cluster `0xEF00` instead of standard ZCL window covering clusters. Communication happens via Tuya datapoints:

| Datapoint | Function | Type | Values |
|-----------|----------|------|--------|
| DP 1 | State | Enum | 0=Open, 1=Stop, 2=Close |
| DP 2 | Position | Value | 0–100 |
| DP 7 | Work State | Enum | 0=Opening, 1=Closing, 2=Stopped |
| DP 8 | Motor Direction | Bool | 0=Forward, 1=Reverse |

## Pairing

1. In Homey, go to **Devices → Add Device**
2. Select **Zemismart Zigbee Blind**
3. Choose **Zemismart Blind Motor** or **Zemismart Shutter Motor**
4. Put the device in pairing mode:
   - Press and hold the **reset button** for 5 seconds until the LED flashes
5. Homey will discover and pair the device

## Settings

| Setting | Description |
|---------|-------------|
| **Motor Direction** | Forward or Reverse — flips the open/close direction |
| **Invert Position** | Swap 0↔100 if your device reports position backwards |

## Installation (Development)

```bash
# Clone the repo
git clone https://github.com/dhannifin/homey-zemismart-blind.git
cd homey-zemismart-blind

# Install on your Homey
homey app install
```

## Version History

### v1.1.0
- Added **Zemismart Shutter Motor** driver for JM36-Zigbee (`_TZE284_myikb7qz`)
- Full position control (0–100%) with real-time position reporting
- Work state tracking (opening/closing/stopped)
- Motor direction reversal via settings
- Device reports parsed from Tuya cluster frames

### v1.0.0
- Initial release with **Zemismart Blind Motor** driver (`_TZE200_cxu0jkjk`)
- Open / Close / Stop + Position control

## Author

Dustin Hannifin (dustin@hannifin.us)

## License

MIT

# Changelog

## [1.1.0] - 2026-04-06

### Added
- New driver: **Zemismart Shutter Motor** for JM36-Zigbee plantation shutter motors
  - Zigbee fingerprint: `_TZE284_myikb7qz` / `TS0601`
  - Tuya datapoints: state (DP1), position (DP2), work state (DP7), direction (DP8)
  - Full 0–100% position control with real-time reporting
  - Motor direction reversal and position inversion settings
  - Incoming Tuya frame parsing for live position/state updates

### Changed
- Updated app description to include shutter motors
- Added driver-level icon assets for both drivers

## [1.0.0] - 2026-03-13

### Added
- Initial release
- **Zemismart Blind Motor** driver for `_TZE200_cxu0jkjk` / `TS0601`
- Open / Close / Stop commands via Tuya DP1
- Position control (0–100%) via Tuya DP2
- Motor direction and position inversion settings

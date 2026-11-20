# Changelog

## 1.2.0 — 2026-11-21

### Added
- `setUserId(id)`: attach an opaque end-user id to every batch (`user_id`). Use the same id with `eraseUser` / `erase_user` in the Node and Python SDKs.
- `device_class: 'mobile'` hint sent with each batch.

### Fixed
- `stop()` clears the user id after the final flush.

## 1.1.3
- Previous release (size-triggered flush, configurable limits, Retry-After jitter).

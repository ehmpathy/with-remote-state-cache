# Changelog

## [1.3.10](https://github.com/ehmpathy/with-remote-state-cache/compare/v1.3.9...v1.3.10) (2025-12-19)


### Bug Fixes

* **cicd:** unblock cicd after rename of repo ([9f35326](https://github.com/ehmpathy/with-remote-state-cache/commit/9f35326a3a4b6e8203495a684705ecbeab491823))
* **deps:** upgrade to latest with-simple-cache lib ([#18](https://github.com/ehmpathy/with-remote-state-cache/issues/18)) ([d7ce1ab](https://github.com/ehmpathy/with-remote-state-cache/commit/d7ce1abbb474168d7637c38bf318b91de919f907))
* **practs:** deworm and bump to latest best ([#19](https://github.com/ehmpathy/with-remote-state-cache/issues/19)) ([10fb8d1](https://github.com/ehmpathy/with-remote-state-cache/commit/10fb8d1d2fb2de6b7fe85ac8dbe36a57cdeec0ae))

## [1.3.9](https://github.com/ehmpathy/with-remote-state-caching/compare/v1.3.8...v1.3.9) (2024-08-04)


### Bug Fixes

* **deps:** bump with-simple-caching version ([#15](https://github.com/ehmpathy/with-remote-state-caching/issues/15)) ([866c57d](https://github.com/ehmpathy/with-remote-state-caching/commit/866c57d0a50fa38513af5b301080fc2799b03c7e))
* **practs:** bump practs to latest best ([34c7515](https://github.com/ehmpathy/with-remote-state-caching/commit/34c7515ae6122196885b79ab425cbc25f73a074c))

### [1.3.8](https://www.github.com/ehmpathy/with-remote-state-caching/compare/v1.3.7...v1.3.8) (2024-04-27)


### Bug Fixes

* **invalidation:** ensure cache invalidation triggered on mutation input as well ([ac18ac6](https://www.github.com/ehmpathy/with-remote-state-caching/commit/ac18ac6c630825e11f894ccdca57a8c913ee4954))
* **types:** ensure mutationOutput is the awaited result everywhere ([173e1eb](https://www.github.com/ehmpathy/with-remote-state-caching/commit/173e1eb4af88f92b1eced908c2b33f1924be8830))

### [1.3.7](https://www.github.com/ehmpathy/with-remote-state-caching/compare/v1.3.6...v1.3.7) (2023-08-01)


### Bug Fixes

* **names:** actually use the name override ([025301e](https://www.github.com/ehmpathy/with-remote-state-caching/commit/025301e14f12e62df7d2714c5e812c76bbb45020))
* **types:** ensure mutationOutput is the awaited result ([00ef826](https://www.github.com/ehmpathy/with-remote-state-caching/commit/00ef826faedfaa52a6da12accef3ec42ab0c3e94))

### [1.3.6](https://www.github.com/ehmpathy/with-remote-state-caching/compare/v1.3.5...v1.3.6) (2023-08-01)


### Bug Fixes

* **names:** enable overriding given name for cached query ([f397926](https://www.github.com/ehmpathy/with-remote-state-caching/commit/f397926f213b3898b809ecc0a67c371f0632ca68))

### [1.3.5](https://www.github.com/ehmpathy/with-remote-state-caching/compare/v1.3.4...v1.3.5) (2022-12-29)


### Bug Fixes

* **triggers:** trigger updates and invaludations even on mutation error ([b77d127](https://www.github.com/ehmpathy/with-remote-state-caching/commit/b77d127e3ad0d4f1194eaee2385bfd33d2952ce6))

### [1.3.4](https://www.github.com/ehmpathy/with-remote-state-caching/compare/v1.3.3...v1.3.4) (2022-11-28)


### Bug Fixes

* **deps:** bump with-simple-caching dep version ([fba8b7b](https://www.github.com/ehmpathy/with-remote-state-caching/commit/fba8b7be56d4d8ab14765ebbce711da2d901ca44))

### [1.3.3](https://www.github.com/ehmpathy/with-remote-state-caching/compare/v1.3.2...v1.3.3) (2022-11-28)


### Bug Fixes

* **deps:** bump with-simple-caching dep version ([1e2aa97](https://www.github.com/ehmpathy/with-remote-state-caching/commit/1e2aa97980ca03ab0f6771da8a42988859c1b1c5))
* **mutations:** ensure mutations say the correct operation type when getting name fails ([b47c569](https://www.github.com/ehmpathy/with-remote-state-caching/commit/b47c56914ecb9525beab547101c2ef56c09fb10b))
* **tests:** add additional test coverage ensuring proper operation of triggers ([e558809](https://www.github.com/ehmpathy/with-remote-state-caching/commit/e558809d89fa215d50dac9d11f89ec9e11d50dca))

### [1.3.2](https://www.github.com/ehmpathy/with-remote-state-caching/compare/v1.3.1...v1.3.2) (2022-11-25)


### Bug Fixes

* **deps:** upgrade depenedency on type fns ([7201a41](https://www.github.com/ehmpathy/with-remote-state-caching/commit/7201a41558536149ff41c2b501016bd660d17a61))

### [1.3.1](https://www.github.com/ehmpathy/with-remote-state-caching/compare/v1.3.0...v1.3.1) (2022-11-25)


### Bug Fixes

* **types:** fix stragler type def ([aef4e58](https://www.github.com/ehmpathy/with-remote-state-caching/commit/aef4e586bfafe89a32e0e242a329d0ffce98fb9d))

## [1.3.0](https://www.github.com/ehmpathy/with-remote-state-caching/compare/v1.2.0...v1.3.0) (2022-11-25)


### Features

* **cache:** better restrict acceptable type of RemoteStateCache; add default serde at context level ([a15fd1e](https://www.github.com/ehmpathy/with-remote-state-caching/commit/a15fd1e52d3b08c4d598bd29a3999aaaea9e4062))

## [1.2.0](https://www.github.com/ehmpathy/with-remote-state-caching/compare/v1.1.0...v1.2.0) (2022-11-25)


### Features

* **context:** allow user to specify default (de)serialization at context level ([94efac8](https://www.github.com/ehmpathy/with-remote-state-caching/commit/94efac8d00fb27b766b2b964512680afdb134cd4))

## [1.1.0](https://www.github.com/ehmpathy/with-remote-state-caching/compare/v1.0.1...v1.1.0) (2022-11-24)


### Features

* **context:** allow specifying default key serialization method at context level ([767b7ce](https://www.github.com/ehmpathy/with-remote-state-caching/commit/767b7ce993c8768d809b7edf90207cd6cd6eb4d9))

### [1.0.1](https://www.github.com/ehmpathy/with-remote-state-caching/compare/v1.0.0...v1.0.1) (2022-11-24)


### Bug Fixes

* **exports:** actually export the utilities ([0c2eb89](https://www.github.com/ehmpathy/with-remote-state-caching/commit/0c2eb8966cf96adc98a03b4a819a52075b531751))

## 1.0.0 (2022-11-24)


### Features

* **context:** define cache at context level, to ensure all fns share same cache for interactions ([5cf727b](https://www.github.com/ehmpathy/with-remote-state-caching/commit/5cf727b380a4daeeca2b69945ec341e623dcd95f))
* **init:** with-remote-state-caching working for query caching ([d74288d](https://www.github.com/ehmpathy/with-remote-state-caching/commit/d74288d5b494d589884c9c58cc16bb8520a89b3d))
* **triggers:** support adding invalidation and update triggers to queries ([565f1dd](https://www.github.com/ehmpathy/with-remote-state-caching/commit/565f1ddf0623abf04a6021efc36064a5d47df5c3))


### Bug Fixes

* **triggers:** get valid keys of cache directly from cache ([9283643](https://www.github.com/ehmpathy/with-remote-state-caching/commit/9283643238b401e3536b6a2e52e64d474396e82e))

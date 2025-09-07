# Changelog

## [0.9.3] - 2025-09-07

### 🚀 Features

- Reset commit timestamps even when no upstream changes ([`920d72d`](https://github.com/AlecRust/branchpilot/commit/920d72d07693d3ff70c4d7b61f470de6e8db3296))

### 🚜 Refactor

- Order tickets by exact due time ([`d93ab18`](https://github.com/AlecRust/branchpilot/commit/d93ab18aab8ffbf558de838033a7c7e148a12783))

## [0.9.2] - 2025-09-07

### 🐛 Bug Fixes

- Update all non-major dependencies (#10) ([`c95b009`](https://github.com/AlecRust/branchpilot/commit/c95b009a556e61e753794117726f41eabcba87f5))
- Respect defaultBase config for PR base ([`46af011`](https://github.com/AlecRust/branchpilot/commit/46af0117a8ae354b0d8c08e57f477d74a6a062ca))

### 🚜 Refactor

- Ignore non-ticket MD files ([`2d4fda9`](https://github.com/AlecRust/branchpilot/commit/2d4fda9e85fa3c94723cc8a6938a56857164aceb))

### 📚 Documentation

- Improve README ([`eef1773`](https://github.com/AlecRust/branchpilot/commit/eef1773515d6aa9817345ee460ce67c8b1f1197e))
- Adjust README badge ([`afd02c6`](https://github.com/AlecRust/branchpilot/commit/afd02c6176bc80c4425ee583d40445d1e716066a))

### 🧪 Testing

- Improve tests robustness ([`e8646ea`](https://github.com/AlecRust/branchpilot/commit/e8646ea617fec50052e7d1d925ed1a40aacb06c6))
- Reduce test matrix runs ([`a1dad4e`](https://github.com/AlecRust/branchpilot/commit/a1dad4e3b5d0928ebae83451d9887271233cebf4))
- Refactor npx tests ([`f649df7`](https://github.com/AlecRust/branchpilot/commit/f649df744bf68a7dbe829f8bbd90ad6c0ee80db7))

## [0.9.1] - 2025-08-28

### 🐛 Bug Fixes

- Update dependency zod to ^4.1.4 (#8) ([`c338d62`](https://github.com/AlecRust/branchpilot/commit/c338d62de686d73c93ec68fccf350ddfa7bf9904))

### 💼 Other

- Fix Knip failing due to npx usage ([`99c4db3`](https://github.com/AlecRust/branchpilot/commit/99c4db370e6002cd92747985345e920bee2f9ec6))

### 📚 Documentation

- Improve main description ([`7def32e`](https://github.com/AlecRust/branchpilot/commit/7def32ec8669ff1bcc95eedc663dd585f7ba52df))

### 🧪 Testing

- Add E2E test that uses npx ([`4787621`](https://github.com/AlecRust/branchpilot/commit/47876219ac1a475c7ea62075be5c35e26da91b6a))

### ⚙️ Miscellaneous Tasks

- Fix windows tests ([`6c0470c`](https://github.com/AlecRust/branchpilot/commit/6c0470cf929d1ba7e0fb16341b2172893239c0c4))

## [0.9.0] - 2025-08-27

### 🚀 Features

- Add post-processing options ([`74faaff`](https://github.com/AlecRust/branchpilot/commit/74faaff8f1d4e597f9efc515cce9a4f546c4e76f))

### 🐛 Bug Fixes

- Update all non-major dependencies (#7) ([`35e4557`](https://github.com/AlecRust/branchpilot/commit/35e4557fc6452a06d6afc770797756d328a65233))

### 🚜 Refactor

- Refactor watch command to be more advanced ([`e3a54ec`](https://github.com/AlecRust/branchpilot/commit/e3a54ec1c74a66bdb5c567f00d20f8ad782269a9))

## [0.8.4] - 2025-08-18

### 🐛 Bug Fixes

- Fix list remote command ([`ba5b944`](https://github.com/AlecRust/branchpilot/commit/ba5b944cb71f713ab4c4acca7de3a8fb5e82a049))

### 💼 Other

- Add provenance flag back to build process ([`c15c301`](https://github.com/AlecRust/branchpilot/commit/c15c301e0be205daf38e4d6b64650a2103a7c600))

### ⚙️ Miscellaneous Tasks

- Remove excessive logging ([`9eda3b3`](https://github.com/AlecRust/branchpilot/commit/9eda3b39945bb59ac6faddd2c96e0850e84d6322))

## [0.8.3] - 2025-08-17

### 🚀 Features

- Add common command aliases ([`f988cb2`](https://github.com/AlecRust/branchpilot/commit/f988cb206363a671d087bce85c53e1b4609c911a))

### 💼 Other

- Simplify release commands ([`204a0a4`](https://github.com/AlecRust/branchpilot/commit/204a0a4b984f5c13a33edc022ab27e81014d2d83))

### 🚜 Refactor

- Check for Git repo in init command ([`51afb1f`](https://github.com/AlecRust/branchpilot/commit/51afb1f0729c1e71fb39b673b1946bf11bf816ae))
- Improve repository path resolution ([`e6e6ce9`](https://github.com/AlecRust/branchpilot/commit/e6e6ce9ba47f03aa483207e47fd2d1075a55f861))
- Improve handling when there are uncommitted changes ([`a8b19ed`](https://github.com/AlecRust/branchpilot/commit/a8b19ed362603fd44d4db711e98929576145268d))

### 📚 Documentation

- Add CodeQL badge to README ([`df4ca27`](https://github.com/AlecRust/branchpilot/commit/df4ca27d763a0139c572f9244e9990cd694c0be7))

## [0.8.2] - 2025-08-17

### 💼 Other

- Separate linting and testing in CI ([`eb7ce1e`](https://github.com/AlecRust/branchpilot/commit/eb7ce1e94fcd2ecd5ed845e0c1dbee19b1a89b6a))
- Set permissions in workflows ([`ea544d2`](https://github.com/AlecRust/branchpilot/commit/ea544d2cf0eac9775d696a6eab86e5cb165625c7))

### 🚜 Refactor

- Improve time formatting ([`65206d8`](https://github.com/AlecRust/branchpilot/commit/65206d82c1c871404b3fd17b144d1006f2188ae2))

### 📚 Documentation

- Simplify README ([`f226cbc`](https://github.com/AlecRust/branchpilot/commit/f226cbcebd9a5199ec9af0a459594d6885479332))
- Simplify README ([`ac0603e`](https://github.com/AlecRust/branchpilot/commit/ac0603ec344fd6ee331151fd2e06ee9401c83a1a))

### ⚡ Performance

- Lazy load main commands ([`1dbd250`](https://github.com/AlecRust/branchpilot/commit/1dbd250538364256f71109c6880e08764f523c65))

## [0.8.1] - 2025-08-16

### 💼 Other

- Add Knip check in CI ([`187dbb6`](https://github.com/AlecRust/branchpilot/commit/187dbb661095bba51854df79dc85442c9bdcbe24))
- Improve release workflow ([`20d95aa`](https://github.com/AlecRust/branchpilot/commit/20d95aa801b38322a360eed08ec8774050966a7a))

### ⚙️ Miscellaneous Tasks

- Tidy types ([`e0dc221`](https://github.com/AlecRust/branchpilot/commit/e0dc221ade1b6fd299537c1f6f7fe25a4f8269d0))

## [0.8.0] - 2025-08-16

### 🚀 Features

- Make "title" and "body" ticket fields optional ([`3f782b3`](https://github.com/AlecRust/branchpilot/commit/3f782b32d65021e4a1de375211611d12e229a348))

### 💼 Other

- Improve GitHub release notes building ([`8a7c88b`](https://github.com/AlecRust/branchpilot/commit/8a7c88b15119ed472bc77fddaed4fbf9f5386934))
- Link to commit in changelog and release notes ([`5452dcd`](https://github.com/AlecRust/branchpilot/commit/5452dcdd54c1d890b2e0d3e71c263439a6ac6128))
- Add Markdown linting ([`1d03ea4`](https://github.com/AlecRust/branchpilot/commit/1d03ea4fce3dd26ab011d705077c3579cc49e943))
- Add Markdown linting to pre-commit ([`74d0629`](https://github.com/AlecRust/branchpilot/commit/74d0629518599855a768174fa2f543c98be55021))
- Simplify coverage config ([`5934452`](https://github.com/AlecRust/branchpilot/commit/5934452b86130f94f0e0b83ad82af21493362677))
- Improve pre-commit hook ([`30ef884`](https://github.com/AlecRust/branchpilot/commit/30ef8847a6de45f92a8f18ce8efa448d0d666c42))

### 📚 Documentation

- Remove seconds from example tickets ([`d0b6f9f`](https://github.com/AlecRust/branchpilot/commit/d0b6f9f4ea2cd764662a32de45037e445b681de9))

## [0.7.1] - 2025-08-16

### 💼 Other

- Set npm registry URL in release workflow ([`99b5d4a`](https://github.com/AlecRust/branchpilot/commit/99b5d4ad1a0f9108d9fde11b20b39fff5e8f69e3))

### ⚙️ Miscellaneous Tasks

- Simplify release npm script command ([`123c549`](https://github.com/AlecRust/branchpilot/commit/123c5497caf5243d6f33754293e89c10fce72535))

## [0.7.0] - 2025-08-16

### 🚀 Features

- Add timeout to gh commands ([`7e88bd2`](https://github.com/AlecRust/branchpilot/commit/7e88bd288706573bf7426e2eba63f6365e2c9e07))

### 🐛 Bug Fixes

- Normalise repo paths for consistent branch restoration ([`1ea2ab3`](https://github.com/AlecRust/branchpilot/commit/1ea2ab335e3c3f5157fc6c24849007b5bcaa112e))
- Prevent gh CLI from hanging on interactive prompts ([`b58f9e0`](https://github.com/AlecRust/branchpilot/commit/b58f9e0f3d3d9d185b870b02d98a0ea4946cc5b4))

### 💼 Other

- Simplify Biom pre-commit command ([`3d521e4`](https://github.com/AlecRust/branchpilot/commit/3d521e49c22495cdc1d8165ec69d0f0f65e65943))
- Simplify Biome config ([`fb7e37e`](https://github.com/AlecRust/branchpilot/commit/fb7e37e94262331226ee0d7dc49876f22e829f9f))
- Add "npm audit" to release process ([`836b23e`](https://github.com/AlecRust/branchpilot/commit/836b23e98c429c2d0dfa12ec52302cc1c559a700))
- Move release building to CI ([`31f12c5`](https://github.com/AlecRust/branchpilot/commit/31f12c56860b2032f4133f151b530b17707f06e3))

### 🚜 Refactor

- Simplify function names ([`fc146a4`](https://github.com/AlecRust/branchpilot/commit/fc146a44b619a2d106c1410e04eca4b5b5903b62))
- Simplify "when" ticket option ([`e08ed87`](https://github.com/AlecRust/branchpilot/commit/e08ed877eb4666fe8a6c7d8aab513f1940f8b976))

### 📚 Documentation

- Simplify README ([`9824a0f`](https://github.com/AlecRust/branchpilot/commit/9824a0f46cdb8ed1ee638f33d93cf5422d83b162))
- Improve README ([`9214b9a`](https://github.com/AlecRust/branchpilot/commit/9214b9a8645030a1607605e993b20cf638684a12))
- Improve README ([`c2a1001`](https://github.com/AlecRust/branchpilot/commit/c2a100156469674387f5a4201ded706167a1c6bc))
- Improve README ([`53f1bf5`](https://github.com/AlecRust/branchpilot/commit/53f1bf53f74d652b5d536e71d6c66dbe674aa6f6))
- Improve recommended PM2 command ([`c45b354`](https://github.com/AlecRust/branchpilot/commit/c45b3543f290904d64db3a5ce54c2fd712d0f358))
- Improve README ([`7cd3340`](https://github.com/AlecRust/branchpilot/commit/7cd33400cde36d7899e562a640064bfdcd45859f))
- Improve README ([`b47754b`](https://github.com/AlecRust/branchpilot/commit/b47754be312b8b47fb9ae5ddb863a3f3f45868cf))
- Improve README ([`1200d46`](https://github.com/AlecRust/branchpilot/commit/1200d4668efd91756d14488e3ac9ce36119ee464))

### 🧪 Testing

- Fix windows tests ([`70cb775`](https://github.com/AlecRust/branchpilot/commit/70cb775067b6829b863b55d5f4122acb9445a556))
- Fix windows tests ([`761fa71`](https://github.com/AlecRust/branchpilot/commit/761fa7146930c091fe48384e376e22eb999a672e))
- Fix windows tests ([`a5b0c7f`](https://github.com/AlecRust/branchpilot/commit/a5b0c7f0c0b78ec71b838cb3283ea991149e3ee6))
- Adjust CI Node.js test matrix ([`2ee6e6e`](https://github.com/AlecRust/branchpilot/commit/2ee6e6ee1626c21434ebd2e19be3d87f7908b6c2))

## [0.6.0] - 2025-08-13

### 🚀 Features

- Add tickets autoMerge option ([`cd79802`](https://github.com/AlecRust/branchpilot/commit/cd798023bdffdb01fbc08d2a99a03405d53a5d30))
- Add watch command ([`5f3a60a`](https://github.com/AlecRust/branchpilot/commit/5f3a60a2d891199f0b23761907ff3ae0f6700580))

### 📚 Documentation

- Improve recommended PM2 command ([`5c40825`](https://github.com/AlecRust/branchpilot/commit/5c4082545140977d452c23ce1424c68b5f4b2f1e))
- Improve recommended PM2 command ([`51551a2`](https://github.com/AlecRust/branchpilot/commit/51551a27ecb407d1d257c791109098118b41143d))

## [0.5.1] - 2025-08-12

### 🚜 Refactor

- Improve consistency of output formatting ([`68877bc`](https://github.com/AlecRust/branchpilot/commit/68877bc2429aeb96032be3235f109525e50df640))

### 🧪 Testing

- Improve tests ([`bfc7e17`](https://github.com/AlecRust/branchpilot/commit/bfc7e1780661fe998876047e5464143ce32a6501))

## [0.5.0] - 2025-08-12

### 🚀 Features

- Add loading spinner for commands that take a while ([`1b2fbee`](https://github.com/AlecRust/branchpilot/commit/1b2fbeeabacbc45132c090f0dc3cbf1aaac88124))

### 🚜 Refactor

- Remove dry run, switch to simple-git, restructure code ([`5600cec`](https://github.com/AlecRust/branchpilot/commit/5600cec3329291bf02a045d890e676a430e67851))
- Show repo name not ticket filename in list command ([`15c5fa1`](https://github.com/AlecRust/branchpilot/commit/15c5fa1874a6fcf7027c784513a51298c0535ef4))
- Use consola for logging ([`911ac2c`](https://github.com/AlecRust/branchpilot/commit/911ac2ca6b43aed48796993c9df29592af343b01))

### 📚 Documentation

- Improve README ([`825b96d`](https://github.com/AlecRust/branchpilot/commit/825b96dbd65a19e598654ebe35f1ee2f0a5c17e9))
- Improve docs ([`ddb83cc`](https://github.com/AlecRust/branchpilot/commit/ddb83cc0c87baff6fa53b2316fea5079b6fbbc16))
- Improve README ([`4bfb09b`](https://github.com/AlecRust/branchpilot/commit/4bfb09b0b972fb381310956f65ccb32b888655a3))
- Improve README ([`62db8fd`](https://github.com/AlecRust/branchpilot/commit/62db8fd340fccebf999851255b9ddaa8fcf44ded))
- Improve README ([`85d7078`](https://github.com/AlecRust/branchpilot/commit/85d7078250b6daba0e293c08e341b5de854d1db4))
- Improve PM2 example docs ([`0957a5b`](https://github.com/AlecRust/branchpilot/commit/0957a5b99e44699dae992ead2db54ac77e448f1a))

### ⚙️ Miscellaneous Tasks

- Improve consistency of tool description ([`f3dd367`](https://github.com/AlecRust/branchpilot/commit/f3dd36746fd5dc867e81bc6cc0c4cb41398c41e5))
- Remove old files ([`382ac15`](https://github.com/AlecRust/branchpilot/commit/382ac1517a09402f5710606dd2358159d25fc523))

## [0.4.8] - 2025-08-10

### 🐛 Bug Fixes

- Handle merged branches and no-commit scenarios ([`a0bce30`](https://github.com/AlecRust/branchpilot/commit/a0bce3027713598c8c5406f7154b8f467223d0d0))

### 🧪 Testing

- Improve list command mocking ([`24f7cc0`](https://github.com/AlecRust/branchpilot/commit/24f7cc0064f1f622db3446a96a5499f5fd58d13d))

### ⚙️ Miscellaneous Tasks

- Tidy .gitignore ([`5f188b3`](https://github.com/AlecRust/branchpilot/commit/5f188b373456d671b72265cd049ec671083b684e))

## [0.4.7] - 2025-08-10

### 💼 Other

- Simplify npm scripts ([`dd0c73f`](https://github.com/AlecRust/branchpilot/commit/dd0c73f21c9e79fa33b36a095d34c03ee4b3d5af))

### 🚜 Refactor

- Unify --verbose and list behaviour ([`9aad78f`](https://github.com/AlecRust/branchpilot/commit/9aad78f5f76fbca103765d3d90379e08fe2e2ad9))

### 📚 Documentation

- Adjust package.json keywords ([`763087f`](https://github.com/AlecRust/branchpilot/commit/763087f7dec9f50a32d51fad7572c7cb8b1d0093))

### ⚙️ Miscellaneous Tasks

- Set packageManager version ([`e6f8271`](https://github.com/AlecRust/branchpilot/commit/e6f8271af91e8d8f82455f09f56ed90a5d76a509))
- Add .gitattributes file for windows ([`91945c6`](https://github.com/AlecRust/branchpilot/commit/91945c63089924d3a83edde381af3130efa4d51e))

## [0.4.6] - 2025-08-10

### 💼 Other

- Fix CHANGELOG.md formatting ([`af2e87f`](https://github.com/AlecRust/branchpilot/commit/af2e87f6c77bc25c76109bb0f764dc6d8e0ea861))

### ⚙️ Miscellaneous Tasks

- Error when no tickets found ([`26f2554`](https://github.com/AlecRust/branchpilot/commit/26f255492cf17a40477aeeb31e8f3195c75448b3))

## [0.4.5] - 2025-08-10

### 🐛 Bug Fixes

- Improve release notes generation for GitHub releases ([`ac23aef`](https://github.com/AlecRust/branchpilot/commit/ac23aef0b280af7ccac1cf7d8eb9c4e628f9cb90))
- Use HEAD instead of future tag for release notes generation ([`ae5a2ce`](https://github.com/AlecRust/branchpilot/commit/ae5a2cecbdd4f24d2f9b9add1b128f0fe944fddb))
- Simplify release notes generation in release-it config ([`2dcc0a2`](https://github.com/AlecRust/branchpilot/commit/2dcc0a2bb45773c5cb5576856940551b0c087ac7))
- Improve release notes generation for GitHub releases ([`b627a72`](https://github.com/AlecRust/branchpilot/commit/b627a725fcdc301d0f0e7057ddd43b23a9f0fe3d))

## [0.4.4] - 2025-08-10

### 🐛 Bug Fixes

- Fix --version returning wrong version ([`cccb561`](https://github.com/AlecRust/branchpilot/commit/cccb5616da487dc43181803c9bc838c862444daa))

### 💼 Other

- Fix GitHub Release body building ([`605f751`](https://github.com/AlecRust/branchpilot/commit/605f75195d5fa583a75ebd29da59819b4ad039b1))

## [0.4.3] - 2025-08-10

### 💼 Other

- Fix GitHub Release body building ([`affdafc`](https://github.com/AlecRust/branchpilot/commit/affdafcc1fba950e3f3a62983a0e1ca18cddda19))

### 🚜 Refactor

- Simplify timezone configuration ([`051e8d9`](https://github.com/AlecRust/branchpilot/commit/051e8d9fb8878aee0abf200b7e64663221a1dd58))

### 📚 Documentation

- Improve README ([`a1e97cf`](https://github.com/AlecRust/branchpilot/commit/a1e97cfb193dfb3ceb91222b9cddbf542a98d08a))
- Improve README ([`1acf5a2`](https://github.com/AlecRust/branchpilot/commit/1acf5a2f9a533e2275b668986ba3d67372892fad))

## [0.4.2] - 2025-08-10

### 🐛 Bug Fixes

- Validate timezone strings and repository paths ([`32228a8`](https://github.com/AlecRust/branchpilot/commit/32228a82d2e5945ceb0ee697c4741323baa62cce))

### 💼 Other

- Improve release notes building ([`b27546d`](https://github.com/AlecRust/branchpilot/commit/b27546d2b4c55b2f0b5665b59938b59514daa181))

### 📚 Documentation

- Simplify README ([`3565f06`](https://github.com/AlecRust/branchpilot/commit/3565f06ba9bcc773c97f52eb684d63f1f1958937))

### ⚙️ Miscellaneous Tasks

- Remove SPDX license identifier comments ([`7db7df4`](https://github.com/AlecRust/branchpilot/commit/7db7df4cbf7c8fa88eb53a2d100e3019a5a368bc))
- Check for uncommitted changes before checkout to prevent data loss ([`934ab63`](https://github.com/AlecRust/branchpilot/commit/934ab63bec14c7481ac4daed2af6fa6d9a4581fa))
- Improve handling of invalid TOML ([`b1582c6`](https://github.com/AlecRust/branchpilot/commit/b1582c65d094fdbcb03f9215d99b36386b6d63f5))

## [0.4.1] - 2025-08-10

### 💼 Other

- Fix GitHub Release description output ([`308b36a`](https://github.com/AlecRust/branchpilot/commit/308b36a7eba483d769303933bcf0a752043f685e))

### 📚 Documentation

- Add npm badge to README ([`08fba36`](https://github.com/AlecRust/branchpilot/commit/08fba3656afb621fb7a3be9c04a7ecd36d53d42d))

## [0.4.0] - 2025-08-10

### 🚀 Features

- Add XDG_CONFIG_HOME support ([`7d8e6af`](https://github.com/AlecRust/branchpilot/commit/7d8e6af2501aab2c3fe11b68eea7a51ddd88b061))
- Add init command ([`d7638ff`](https://github.com/AlecRust/branchpilot/commit/d7638fffb04829e84de43950f1fee88efe1bf131))
- Add list command ([`0aa58f6`](https://github.com/AlecRust/branchpilot/commit/0aa58f68d632c2b5d6b1366159d5c18cc9623f4e))

### 💼 Other

- Adjust GitHub Release description output ([`4fd4060`](https://github.com/AlecRust/branchpilot/commit/4fd40602783a208725dbba87bb1a6ccad77a6b4c))
- Migrate to TS commitlint config ([`8e3e42e`](https://github.com/AlecRust/branchpilot/commit/8e3e42e8b4af98b5141b1a526e4dee5c1c5a9b9c))

### 🚜 Refactor

- Switch from yargs to commander ([`7af2994`](https://github.com/AlecRust/branchpilot/commit/7af299463a093968549e14a391d66accdcccc449))
- Rename --dry to --dry-run ([`57add62`](https://github.com/AlecRust/branchpilot/commit/57add62b053c0229e0b9e6c1f4fc154d2bee9d71))
- Add -v flag and improve robustness when PR already merged ([`1808722`](https://github.com/AlecRust/branchpilot/commit/1808722a13eb9f49b39f1b24c52772fb49f5750e))

### 🧪 Testing

- Simplify windows tests ([`8bf76ef`](https://github.com/AlecRust/branchpilot/commit/8bf76ef59107254b8b3c3c3834740f07c0f110c3))
- Adjust timezone in tests ([`4f32833`](https://github.com/AlecRust/branchpilot/commit/4f32833c455ec8c4375f638a750fcbf7208f2e16))
- Fix ubuntu tests ([`2ed6bfc`](https://github.com/AlecRust/branchpilot/commit/2ed6bfc62d92b9c544c5cbff0200e75b1727c5c0))

### ⚙️ Miscellaneous Tasks

- Tidy files ([`c770616`](https://github.com/AlecRust/branchpilot/commit/c770616713b723c08d0b8819e1f6118a5da302ff))

## [0.3.0] - 2025-08-10

### 💼 Other

- Adjust GitHub Release description output ([`90c7751`](https://github.com/AlecRust/branchpilot/commit/90c7751ec566f105b3cce7d40c3a1633a87c9617))

### 🚜 Refactor

- Streamline config and CLI with sensible defaults ([`166ea23`](https://github.com/AlecRust/branchpilot/commit/166ea239a38727de94317859d6cf156f60e55219))

## [0.2.0] - 2025-08-10

### 🐛 Bug Fixes

- Fix release process ([`4decf41`](https://github.com/AlecRust/branchpilot/commit/4decf41651527385a22de5aa54fd6bba58befba3))

### 💼 Other

- Add release-it/git-cliff release process ([`18a2909`](https://github.com/AlecRust/branchpilot/commit/18a2909e8e01c039cde89f0e45db24c70fff9721))

### 🚜 Refactor

- Improve output ([`2465fa1`](https://github.com/AlecRust/branchpilot/commit/2465fa1ba68f0c0d6933c1b795dc8cd593a69460))

## [0.1.0] - 2025-08-10

### 🐛 Bug Fixes

- Fix build ([`2b6f36c`](https://github.com/AlecRust/branchpilot/commit/2b6f36c8fab590b254e8c6528ea314f8d91607cf))

### 💼 Other

- Add Biome and commitlint pre-commit hook ([`1f3dcb4`](https://github.com/AlecRust/branchpilot/commit/1f3dcb4f5a450c059c64e338b8ac16995a240d76))
- Fill out more of package.json ([`44a1c33`](https://github.com/AlecRust/branchpilot/commit/44a1c339af964400ff353f415f364cb8b2577c88))
- Add TS check to pre-commit hook ([`d01bcd7`](https://github.com/AlecRust/branchpilot/commit/d01bcd71234eee112488be439ee187819c3d4ede))
- Adjust bin path ([`b43612e`](https://github.com/AlecRust/branchpilot/commit/b43612ea12880999ce02f7579af4476bc4c4b586))

### 📚 Documentation

- Add CI badge to README ([`bbf06fc`](https://github.com/AlecRust/branchpilot/commit/bbf06fc49dbcd4a08b18387282f9863d56961679))
- Add CHANGELOG.md ([`f8480cf`](https://github.com/AlecRust/branchpilot/commit/f8480cf6ae0eec73d581b3b0e5170c27127cf6d7))

### 🧪 Testing

- Fix Windows unit tests ([`aafe397`](https://github.com/AlecRust/branchpilot/commit/aafe397e5f7da37ccedec58ba3cbfadc9fd3452f))
- Fix windows tests ([`15f249c`](https://github.com/AlecRust/branchpilot/commit/15f249cfa4eda7b76089bd57904de9c408c6a067))


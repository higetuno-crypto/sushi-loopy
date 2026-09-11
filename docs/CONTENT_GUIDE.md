# コンテンツ追加ガイド

## 責務
`data` は定義、`logic/conditions.ts` は条件、`logic/progression.ts` は解除とNews選定、`logic/effects.ts` は倍率集計、`state/selectors.ts` は生産/価格、`state/store.ts` は操作の適用を担当する。

既存kindを使う追加はデータファイル1箇所のみ。登録Mapと索引は配列から構築され、UIは自動で表示する。新しいCondition/Effectの種類だけは型と共通評価器の追加が必要。現在の特殊イベント/ED状態は未実装なので、その保存仕様を決めてから条件へ拡張する。

## Upgradeの追加例
`src/game/data/upgrades.ts` の `UPGRADES` に追加:
```ts
{
  id: 'plant_circulation', // 公開後は変更・再利用しない
  displayName: '小さな海流',
  description: '海洋食材プラントの生産 +50%。',
  icon: '🌊',
  condition: { kind: 'facility', id: 'marine_food_plant', count: 3 },
  cost: 50000,
  effects: [{ kind: 'facilityBonus', id: 'marine_food_plant', amount: 0.5 }],
}
```
追加後 `npm test` / `npm run build` / `npm run lint`。上例はドキュメントだけで、現在の5件には含まない。

## Condition
- `always`
- `facility`: 固定FacilityIdと所持数
- `stat`: totalClicks / totalSushiEarned / runPlayTimeMs / sushi の最小値
- `achievement` / `upgrade`: stable ID
- `all` / `any`: Condition配列のAND/OR。空のallは真、anyは偽。

実績は依存イベント索引を使う。クリックと購入は操作時、時間・生産は1秒境界、ロード移行は必要に応じて全条件を確認する。循環依存を定義しない。Newsは12秒ごと、未読の高優先度から1件を表示。全件を毎tickで調べない。

## Effectと表示
- `productionBonus`: 全体生産の加算率
- `facilityBonus`: 特定施設の加算率
- `clickBonus`: クリックの加算率
- `amount: 0.01` は+1%。全体内・施設内は加算。全体倍率×施設倍率で施設生産を算出。
- 例: 基礎3/秒 × 職人強化2倍 × (1 + 実績0.002 + 強化0.1) = 6.612/秒。
- クリックの基礎値は1、クリック強化だけを適用する。実績10件の初期報酬は施設生産だけ。
- ID配列が不変の間はWeakMapキャッシュを再利用。配列は必ずimmutableに更新する。
- アイコンと画像は `data/presentation.ts`。保存IDと表示名/画像を分離する。

## Save v2
v1の型・検証器は凍結。v2にはtotalClicks、totalSushiEarned、unlockedAchievementIds、purchasedUpgradeIds、seenNewsIdsを追加。実行中のNewsや倍率は保存しない。

Main Save / Save Code / Checkpointは同一SnapshotとHydrationで全項目をコピーする。Import / RestoreはOfflineを適用しない。Checkpointは初回実購入後の実績も含む。ロードやImportだけでCheckpointを作らない。

v1にない履歴は捏造しない。クリック数0、累計獲得は所持SUSHIから開始。施設実績は所持数から復元。Main Save初回移行で `sushi-loopy.save.backup-v1` に元の文字列を保管する。移行成功後もバックアップを消さない。Save Code prefixは `SUSHILOOPY1:` のまま。

未知の正常形式IDは往復保存するが効果なし。不正/重複ID、欠落値、NaN/Infinity/負数、未来schemaは拒否。既存の読めないMain Save/Checkpointは自動処理で上書きしない。この保護は復旧UIで元データをバックアップするまで維持する。

## 体験の次の拡張
価格・施設IDは維持済み。現在の経済と目標到達時刻の差は `artifacts/balance-simulation.json` を参照。EDを時間待ちだけで遅らせず、各施設に発見・物語・購入判断を追加し、複数の遊び方で再計測する。

終盤は通常プレイから動的importする独立した演出モジュールが候補。3D/GLBを初期bundleへ入れない。MetaStateは既存の型のみで未使用。偽リセット/真ED追加時にrunとmetaの所有境界・schema migration・Checkpointの範囲を先に設計する。

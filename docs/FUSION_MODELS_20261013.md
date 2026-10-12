# 006 寿司融合発電 Lv.1〜4

`fusion_sushi_converter` をBlender製の4段階に置き換えた。成長の目安は **25% / 55% / 85% / 120%**、所有数 **1 / 5 / 10 / 25** で切り替わる。施設ID、価格、生産量、保存形式は維持する。

## 成長と遊び心

| Lv | 主な構成 |
| --- | --- |
| 1 | 丸い発電炉、琥珀色の炉心、立体の寿司を2貫載せた回転子、片側冷却塔、操作盤 |
| 2 | 大きい炉、左右の冷却塔、金の炉枠、前面の蓄電器 |
| 3 | さらに大きい炉、冷却塔の放熱フィン、金の補強、背面の整備通路とはしご |
| 4 | 太陽を思わせる金の外周リング、12本の光条、外周の支持枠、金の放熱フィン |

参考画像の主役である寿司・琥珀色の炉心・太い配管を残し、炉を前面開口の構造にした。背面には丸い点検ハッチ、側面には冷却回路と放熱板がある。米とネタは厚みのある別形状。寿司の回転子は中央軸とスポークで支持される。Lv.4の外周リングは支持枠の手前に隙間を確保し、逆方向にゆっくり回る。炉心の発光色も穏やかに変化する。既存の停止・Reduce Motion設定に従う。

## 保存先と軽量化

- 原本：`assets/models/06-fusion-sushi-converter/lvN/fusion-lvN.blend`（ローカル保存）
- 各原本と同じフォルダ：`front-3q.png` / `back-3q.png` / `side.png` / `top.png` / `checks.json`
- ゲーム用：`public/assets/models/06-fusion-sushi-converter/fusion-lvN.glb`
- 比較画像・集計：`artifacts/fusion-models/all-views.png` / `levels.png` / `model-stats.json`

| Lv | tris | 編集用メッシュ数 | マテリアル数 | GLB bytes |
| --- | ---: | ---: | ---: | ---: |
| 1 | 4,068 | 11 | 9 | 198,212 |
| 2 | 5,400 | 12 | 9 | 257,940 |
| 3 | 6,984 | 13 | 9 | 329,368 |
| 4 | 8,240 | 15 | 9 | 388,168 |

trisは施設全体の合計。編集用メッシュ数はEmpty・カメラ・照明を除く。GLBのメッシュノードはLv.1〜3が2、Lv.4が3。静的形状をまとめ、可動部のみ分離した。全マテリアルが不透明、画像テクスチャは0枚。縮尺0.80で配置し、必要な段階のみ既存のキャッシュ経由で読み込む。

## 再出力と拡張

Blender MCPから次を実行する。`LEVEL` を1〜4に変更できる。

```python
path = 'D:/Sushi_Loopy/scripts/build-fusion-models.py'
exec(compile(open(path, encoding='utf-8').read(), path, 'exec'),
     {'__file__': path, 'LEVEL': 1, 'FINAL': True})
```

対象シーンがあれば再利用し、なければ作成する。`FINAL=True` で原本・GLB・4方向画像を保存。土台、炉殻、炉心、回転子、冷却回路、操作盤、整備通路、外周リングを分けて編集できる。基本形状には既存の `scripts/blender_parts.py` を使用する。

## 検証

- 4レベル×4方向を確認。米とネタの形状、外周リングと支持枠の間隔、蓄電器から冷却塔への配管、整備通路の接地を調整した。
- 全メッシュで非多様体エッジ・面積ゼロ面・孤立頂点が0。独立した閉じた部品も全て正の符号付き体積（78 / 98 / 138 / 170部品）。保存済み.blendの対象シーンも確認。`components.json` に記録。
- 置換前に追加テストが失敗することを確認。最終モデルで53テスト、lint、型チェックを含むビルドが成功。既存のThree.jsチャンクサイズ警告あり。
- 全9区画への配置、接地、60秒間の回転範囲、寿司と炉枠の隙間、外周リングの内径、キャッシュ保護を確認。
- Chrome・Windows WebKitで4段階の購入、保存復元、停止、320px幅、模様替え、配置と取り消し、写真を確認。`SUSHI_TEST_FACILITY=fusion_sushi_converter node scripts/conveyor-check.mjs` を使用。`artifacts/fusion-models/{chrome,webkit}/checks.json` に記録。
- `scripts/town-check.mjs` の320/390/1280px幅、001の成長、旧セーブ、全9施設、島への移動と橋の配送、WebGL再作成、写真、UI崩壊の回帰確認が成功。`artifacts/fusion-models/regression/checks.json` に記録。
- 実機iPhone、発熱、長時間の性能は未検証。

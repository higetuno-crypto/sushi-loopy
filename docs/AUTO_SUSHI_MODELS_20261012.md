# 003 寿司自動握り器 Lv.1〜4

`auto_sushi_machine` をBlender製の4段階へ置き換えた。演出の目安は **25% / 55% / 85% / 120%**。所有数 **1 / 5 / 10 / 25** で変化する。施設ID、価格、生産量、保存形式は維持。

## 成長の見せ方

| Lv | 演出の目安 | シルエットと設備 |
| --- | --- | --- |
| 1 | 25% | 小さな米ホッパー、1本のロボットアーム、制御盤、4皿の製造ライン |
| 2 | 55% | 2本のアーム、大きなホッパー、食材トレー、配管付き補助装置、警告灯、5皿 |
| 3 | 85% | 左右の大型タンク、金の帯と正面看板、作業通路と手すり・はしご、6皿 |
| 4 | 120% | 高い門型フレーム、巨大な握り寿司看板、金の歯車、左右の回転ファン、金の皿、7皿 |

参考画像の主役である米のホッパー・ロボットアーム・寿司のラインを残した。白と紺の本体、サーモン色、金属の差し色で既存の街へ合わせる。背面はサービス扉と通風口、Lv.3以降には保守用の通路とはしごを設けた。前面の小さな制御表示はロボットの目のようにも見える。

肩・肘・手首は親子構造を持ち、手首は前の2関節の回転を補正して下向きを保つ。左右のアームは交互に作業する。皿は直線と半円をつないだベルトを14秒で周回し、Lv.4の歯車とファンはゆっくり回転する。すべて既存の停止・Reduce Motion設定に従う。

## 保存先と軽量化

- Blender原本：`assets/models/03-auto-sushi-machine/lvN/auto-sushi-lvN.blend`（ローカル保存）
- 同フォルダ：`front-3q.png` / `back-3q.png` / `side.png` / `top.png` / `checks.json`
- ゲーム用：`public/assets/models/03-auto-sushi-machine/auto-sushi-lvN.glb`
- 比較画像：`artifacts/auto-models/all-views.png` / `levels.png`
- 集計：`artifacts/auto-models/model-stats.json`

| Lv | GLB内tris | 全皿を含む表示tris | 編集用メッシュ数 | マテリアル数 | GLB bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 3,084 | 3,432 | 13 | 9 | 187,360 |
| 2 | 4,592 | 5,056 | 20 | 9 | 270,900 |
| 3 | 6,276 | 6,856 | 25 | 9 | 359,908 |
| 4 | 7,916 | 8,612 | 33 | 9 | 450,496 |

GLB内には皿の原型が1つある。「表示tris」は周回する全皿を含み、周辺の街は除く。編集用メッシュ数はプレビュー用の皿の複製、関節のEmpty、カメラ・ライトを除く。画像テクスチャは0枚。静的部分をまとめ、アームの関節・回転部・皿のみ分離する。皿の描画は002と共通のInstancedMesh処理で3バッチにまとめた。

全レベルを縮尺0.80で配置し、製造ラインの位置を固定して上・横へ成長させる。必要な段階だけ読み込み、001〜003合わせて最大12モデルをキャッシュする。読込中は現在の街を保ち、古いリクエストが新しい状態を上書きしない。読込失敗は既存の「街を再表示」で再試行できる。

## 再出力

Blender 5.1のPythonで `scripts/build-auto-sushi-models.py` を実行する。基本形状の生成処理は `scripts/blender_parts.py` にまとめ、002の制作スクリプトと共有した。

```python
path = 'D:/Sushi_Loopy/scripts/build-auto-sushi-models.py'
exec(compile(open(path, encoding='utf-8').read(), path, 'exec'),
     {'__file__': path, 'LEVEL': 1, 'FINAL': True})
```

対象レベルのシーンがあれば使用し、なければ作成する。`FINAL=True` はその段階の原本・GLB・4方向画像を再出力する。関節、ホッパー、タンク、装飾を分けているので、形状や動作の調整に再利用できる。

## 検証

- 4段階×4方向をレンダリングして確認。小さな面取りで生じた縮退面を解消し、全編集用メッシュで非多様体エッジ・面積ゼロ面・孤立頂点が0、符号付き体積が正であることを確認。
- `npm test`：50件成功。003の置換が未実装の時点で新しいテストが失敗することを確認してから実装。4モデルのtris、全9区画の境界と接地、アームの親子構造と動作、手先とベルトの距離、皿の軌道と一周の連続性、Lv.4の回転、キャッシュを壊さない破棄を検証。
- `npm run lint` / `npm run build`：成功。既存のThree.jsチャンクサイズ警告あり。
- `$env:SUSHI_TEST_FACILITY='auto_sushi_machine'; node scripts/conveyor-check.mjs`：Chromeで全4段階の実購入、未所有時の読込抑制、動作と停止、設定と保存復元、移動と取り消し、写真、画面内外の通知がまとまる条件を確認。390px幅、およびLv.4の320px幅で確認。
- 同コマンドに `$env:SUSHI_ENGINE='webkit'` を指定してWindows WebKitでも成功。結果は `artifacts/auto-models/{chrome,webkit}/checks.json`。
- `node scripts/town-check.mjs`：320/390/1280px幅、001の成長、旧セーブ、全9施設、橋を通る配達、WebGL再作成、写真、UI崩壊の回帰確認。結果は `artifacts/auto-models/regression/checks.json`。
- 003の実機iPhone・発熱・長時間の性能は未検証。

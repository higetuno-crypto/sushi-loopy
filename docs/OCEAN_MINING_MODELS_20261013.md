# 005 SUSHI海洋採掘 Lv.1〜4

`sushi_ocean_mining` をBlender製の4段階へ置き換えた。演出の目安は **25% / 55% / 85% / 120%**。所有数 **1 / 5 / 10 / 25** で成長する。施設ID、価格、生産量、保存形式と、購入すると現れる漁船は維持。

## 成長と遊び心

| Lv | 目安 | 主要パーツ |
| --- | --- | --- |
| 1 | 25% | 4本脚の作業台、小型の格子塔、回転ドリル、制御室、赤いクレーン、寿司鉱石の受け箱 |
| 2 | 55% | 高くなる塔とクレーン、金の手すり、補助タンクとポンプ |
| 3 | 85% | 二つの補助タンク、金の補強材と脚の帯、上部整備通路・はしご、四隅の灯具、制御室の屋根設備 |
| 4 | 120% | 大型塔、金の冠と回転する大型寿司鉱石、補強した赤いクレーンと追加の金装飾 |

参考画像の脚・掘削塔・赤いクレーン・サーモン色の採掘物を残した。鉱石には米を思わせる白い層を入れている。前面は制御室と荷役、背面は通風口と整備用はしご、上面はタンク配管と穴の開いたデッキ。4本脚と中央の掘削口を接地させ、床をドリルが貫通しない構造にした。

ドリルは回転し、クレーンの箱は10秒周期で上下する。荷物とクレーンにワイヤーの両端が接続したまま長さが変わる。Lv.4の大型鉱石は金の冠の内側をゆっくり回る。004で使用した巻き上げ処理を共通化し、005でも利用する。全て既存の停止・Reduce Motion設定に従う。005の注視点と画角を背の高い塔に合わせた。

## 保存先と軽量化

- Blender原本：`assets/models/05-sushi-ocean-mining/lvN/ocean-mining-lvN.blend`（ローカル保存）
- 同フォルダ：`front-3q.png` / `back-3q.png` / `side.png` / `top.png` / `checks.json`
- ゲーム用：`public/assets/models/05-sushi-ocean-mining/ocean-mining-lvN.glb`
- 比較画像：`artifacts/mining-models/all-views.png` / `levels.png`
- 集計：`artifacts/mining-models/model-stats.json`

| Lv | tris | 編集用メッシュ数 | マテリアル数 | GLB bytes |
| --- | ---: | ---: | ---: | ---: |
| 1 | 4,636 | 12 | 8 | 240,044 |
| 2 | 5,124 | 13 | 8 | 263,700 |
| 3 | 6,876 | 14 | 8 | 347,108 |
| 4 | 7,884 | 17 | 8 | 397,300 |

trisは施設の全静的・可動部品の合計で、街と漁船は除く。編集用メッシュ数はEmpty、カメラ、照明を除く。GLBのメッシュノードはLv.1〜3が5、Lv.4が6。画像テクスチャは0枚。静的部分をまとめ、ドリル・鉱石・巻き上げ部だけ分離する。全レベルを縮尺0.80で配置し、必要な段階だけ読み込む。既存のキャッシュ、リクエスト競合防止、読込エラーからの再試行を使用する。

## 再出力

Blender MCPから `scripts/build-mining-models.py` を実行。基本形状は既存の `scripts/blender_parts.py` を利用する。

```python
path = 'D:/Sushi_Loopy/scripts/build-mining-models.py'
exec(compile(open(path, encoding='utf-8').read(), path, 'exec'),
     {'__file__': path, 'LEVEL': 1, 'FINAL': True})
```

対象レベルのシーンがあれば再利用し、なければ作成する。`FINAL=True` でそのレベルの原本・GLB・4方向画像を保存する。脚、デッキ、制御室、格子塔、配管、クレーン、冠を分けているので、今後も調整しやすい。001〜004の承認済み原本・GLBは変更しない。

## 検証

- 4レベル×4方向をレンダリングして確認。ドリル軸受の貫通、上部通路の支柱、回転鉱石と冠の間隔を調整した。
- 非多様体エッジ、面積ゼロ面、孤立頂点は全メッシュで0。独立した閉じた形状の単位でも符号付き体積が正（158 / 176 / 230 / 271部品）。保存済みの4つの.blendに対象シーンが含まれることも検証。
- 追加テストは置換前に失敗することを確認後に実装。4レベル×9区画の接地と範囲、巻き上げ中のワイヤー両端と長さ、荷物の床との隙間、回転部と穴・冠の半径、漁船の解放、キャッシュを壊さない破棄を確認。
- `npm test`：52件成功。`npm run lint` / `npm run build`：成功。既存のThree.jsチャンクサイズ警告あり。
- Chrome・Windows WebKitで `SUSHI_TEST_FACILITY=sushi_ocean_mining` を指定して `scripts/conveyor-check.mjs` が成功。全段階の購入・保存復元・動作停止、漁船への合図、設定、移動と取り消し、写真を検証。記録は `artifacts/mining-models/{chrome,webkit}/checks.json`。
- `scripts/town-check.mjs` の320/390/1280px幅、001の成長、旧セーブ、全9施設、橋の配送、WebGL再作成、写真、UI崩壊の回帰確認が成功。`artifacts/mining-models/regression/checks.json` に保存。
- 実機iPhone、発熱、長時間の性能は未検証。

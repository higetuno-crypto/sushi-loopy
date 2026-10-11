# 002 回転寿司 Lv.1〜4

`conveyor_sushi` をBlender製の4段階へ置き換えた。所有数 **1 / 5 / 10 / 25** で成長する。施設ID、価格、生産、保存形式は変更していない。

## 成長と遊び

- Lv.1：凹凸のある瓦屋根、木のカウンター、提灯、3席。6皿が回る小さなお店。
- Lv.2：提灯を4つに増やし、皿の返却口と積み皿を追加。7皿が回る。
- Lv.3：屋根と奥の部屋を拡張。金の装飾、旗、4席、8皿へ成長。
- Lv.4：二段屋根、金の縁取り、2本の旗、金の皿。屋上では3つの寿司を載せた飾りが回り、カウンターには9皿が流れる。

皿は楕円のベルトを20秒で一周し、曲がり角でも速度がほぼ一定になる。屋上の飾りはゆっくり回転する。既存の職人・客を配置し、購入段階に応じて客も増える。常駐する吹き出しは追加していない。動き停止・端末のReduce Motion設定に従う。

## 保存先とモデル仕様

- 原本：`assets/models/02-conveyor-sushi/lvN/conveyor-lvN.blend`（ローカル保存、公開配布しない）
- 同フォルダの確認画像：`front-3q.png` / `back-3q.png` / `side.png` / `top.png`
- ゲーム用：`public/assets/models/02-conveyor-sushi/conveyor-lvN.glb`
- 全方向の比較画像：`artifacts/conveyor-models/all-views.png`
- 数値：`artifacts/conveyor-models/model-stats.json`

| Lv | GLB内のtris | 皿の複製を含む表示tris | 編集用メッシュ数 | マテリアル数 | GLB bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 3,980 | 4,500 | 17 | 7 | 193,348 |
| 2 | 4,516 | 5,140 | 19 | 8 | 220,032 |
| 3 | 5,296 | 6,024 | 22 | 8 | 259,096 |
| 4 | 6,916 | 7,748 | 28 | 8 | 339,876 |

GLB内のtrisには皿の原型を1つ含む。「表示tris」は回転する全皿とLv.4の屋上飾りを含み、ゲーム側の職人・客・フィールドは含まない。編集用メッシュ数はプレビュー用の皿の複製、カメラ、ライトを除く。画像テクスチャは0枚。

静的な建物をまとめ、皿の原型とLv.4の回転飾りだけを分離した。皿は材質ごとのInstancedMeshを使用する。全9区画へ配置できる共通縮尺0.82で、カウンターの位置を全レベルで揃えている。模様替えの色はのれんだけに適用する。

生成元は `scripts/build-conveyor-models.py`。Blender 5.1のPythonで、`LEVEL` と `FINAL` を渡して実行する。

```python
path = 'D:/Sushi_Loopy/scripts/build-conveyor-models.py'
exec(compile(open(path, encoding='utf-8').read(), path, 'exec'),
     {'__file__': path, 'LEVEL': 1, 'FINAL': True})
```

各レベル固有のシーンがあればそれを使用し、なければ新規作成する。手編集したシーンを保ったまま再出力できる。`FINAL=True` は対象レベルの原本・GLB・4方向画像を書き直す。他のシーンは消去しない。

## 品質確認

- Blenderで全4段階・4方向をレンダリングして確認。背面にはサービス扉、側面には窓と棚を設けた。椅子をカウンターから離し、土台の上に収めた。
- 屋根の瓦と本体はBooleanで結合。全編集用メッシュで非多様体エッジ、面積ゼロ面、孤立頂点が0、符号付き体積が正であることを確認。各原本フォルダの `checks.json` に記録。
- `npm test`：49件成功。4モデルのtris、全9区画の境界と接地、色変更、キャッシュの所有権、皿の軌道・等速性・一周の連続性、Lv.4の回転を確認。
- `npm run lint` / `npm run build`：成功。既存のThree.jsチャンクサイズ警告あり。
- `node scripts/conveyor-check.mjs`：Chrome / Windows WebKitで購入による4段階の変化、モデル配信、動作と停止、色変更、保存と再読込、配置と取り消し、写真を確認。390px幅とLv.4の320px幅で確認。結果は `artifacts/conveyor-models/{chrome,webkit}/checks.json`。
- `node scripts/town-check.mjs`：Chromeで001の成長、320/390/1280px幅、旧セーブ、全9施設、橋を通る配達、WebGL再作成、写真、UI崩壊の回帰確認。結果は `artifacts/conveyor-models/regression/checks.json`。
- 002の実機iPhoneでの動作・発熱・長時間性能は未検証。001について受領済みの実機確認とは区別する。

モデルは所有中のレベルだけ読み込み、001と合わせて最大8段階をキャッシュする。新しいモデルの読込中は現在の街を保ち、古い読み込み結果を適用しない。失敗時は既存の「街を再表示」で再試行できる。

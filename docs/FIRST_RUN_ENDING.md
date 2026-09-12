# 同期装置からの段階的崩壊 / 2026-09-12

前版の「1台購入→結末予告→別画面で28秒の説明→最後の一貫」を置き換えた。普段のお店の中で、設備を追加するほど状態が崩れる。専用の物語画面・章立て・崩壊までのカウントダウンは出さない。

## 購入と進行

| 操作 | ゲーム内の結果 |
| --- | --- |
| 同期装置1台目の購入 | 通常の接続設定ダイアログ。「鮮度同期を実施しますか？」 |
| 1回目の同期 | 生産+25%。数字の二重写し、設備のごく小さなずれがまれに発生。営業は継続 |
| 2台目の購入・2回目の同期 | 生産補正が合計+50%。レーン逆流、数字・設備の位置ずれ |
| 2台目の接続から18秒（表示中の時間） | 表示の重なり・はみ出し・音の引っかかりが増える。3台目が購入可能 |
| 3台目の購入 | 確認を挟まず異常最大。通常購入・生産停止 |
| その6秒後 | 同期応答エラー。UIをテクスチャ化して凍結 |
| 10秒以降 | 画面の文字・寿司・設備が三角形の断片として剥がれ、回転しながら落ちる |
| 28秒後 | 寿司と「握る」だけが残る。1 SUSHI・1クリックを加算してCLEAR |

同期保留時は後から再開可能。未接続装置が残る間は次の同期装置購入を止めて確認を飛ばせないようにする。接続処理中も他設備の購入とタップは可能。施設の既存ID・価格は変更しない。

## 描画と音

- Three.jsとhtml2canvasを追加。2回目の同期で描画chunkを先読みし、実際のWebGL/captureはエラー段階から開始。
- このページの可視DOMだけをローカルで画像化。PCや別タブの画面は取得せず、画像は外部送信も永続保存もしない。
- CanvasTextureを可視画面と一致する三角形メッシュへ割り当てる。接点を共有した断片が時間差で剥がれ、遠近法・回転・重力で落下。最大480断片、DPR最大1.5、ページ非表示時は描画を止める。
- 音は既存の任意ONを維持。進行に合わせて微小な音程ずれ、フレーズの引っかかりを加え、エラー後は新しい音を止める。
- 動きを止める設定では回転・落下を行わず、静止した裂け目と欠落を表示。WebGL不可・context loss・capture失敗/timeoutでも暗転による代替経路でクリアできる。
- 終了/復元時はrenderer、geometry、material、texture、RAF、listenerを破棄。音・動き・Save Code/checkpoint操作は壊れる面から分離する。

## 保存

Save v4に`syncCount`と`syncElapsedMs`を追加。v1/v2/v3の固定schemaは維持し、旧Main Saveは初回更新前に該当`backup-vN`へ保存する。キー・Save Code prefix・施設IDは変更しない。

旧v3の進行中/クリア状態もそのまま復元する。そのため旧記録では崩壊済みでも装置が1台のケースを受理する。現在の通常操作では3台目購入からのみ崩壊へ進む。旧版で複数台所持していた場合は未接続分を順に同期でき、2回の同期後の次の購入で崩壊する。

同期の確定・崩壊開始・クリアは既存Auto Saveのwriter leaseと失敗表示を通して即時保存。途中は5秒保存/pagehide保存。オフラインで同期/崩壊の時計は進めない。同期1〜2回の営業中はオフライン生産可能、崩壊/クリア後は0。

「同期装置の購入前から試す」は確認付き。`sushi-loopy.before-sync-replay`にクリア時Saveを保存して読み戻し一致を確認できた場合だけ再体験へ戻る。同期装置の所持数を0にして購入費用を返却し、他施設・実績・累計獲得は維持する。Save Codeは再体験前にも書き出せる。自動リセットは行わない。

## 検証と証跡

- `npm test`: 37件PASS（同期の購入/確定の順序、タイミング、v1〜v3移行、途中復帰、1回だけのクリア、offline、保存競合、再体験）。
- `npm run build`（型確認含む）/`npm run lint`: PASS。崩壊専用chunkは約725KB、gzip約178KBでサイズ警告あり。通常表示は約249KB、gzip約79KBで、崩壊chunkは初期ロードしない。
- `scripts/browser-check.mjs`: 既存の通常購入、タップ、実績、強化、音、Save Code、checkpoint、mobile、旧save復元の回帰PASS。
- `scripts/ending-check.mjs`: build previewでPC 1280×900 / mobile 390×844の通し検証PASS。確認の保留/再開、2回の同期、実時間の異常拡大、3台目購入、WebGL描画、途中reload、clear/reload、再体験を確認。`artifacts/sync-v2/results.json`、画面画像、`desktop-flow.webm`/`mobile-flow.webm`。
- `scripts/fracture-fallback-check.mjs`: WebGL無効・context lossの両経路で最後の操作→CLEARまでPASS。`artifacts/sync-v2/fallback-results.json`。
- mobileはEdgeのエミュレーションで、実機Safariではない。新規プレイからの長時間バランスと面白さは機能テストで代替しない。

Three.js APIの参照: https://threejs.org/docs/ （CanvasTexture / BufferGeometry / WebGLRenderer）。

公開先: https://higetuno-crypto.github.io/sushi-loopy/ 。main push後、GitHub Actionsのlint/test/build/deployを確認する。

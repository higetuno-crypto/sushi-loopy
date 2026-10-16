# SUSHI LOOPY — The last piece

34秒の崩壊演出デモ。ゲームの実際の9施設・島・元の76 BPMの旋律から制作した、音付きのモーショングラフィック。

## 見る

リポジトリのルートで `npm run dev -- --host 127.0.0.1 --port 5196` を実行し、`http://127.0.0.1:5196/demos/collapse/` を開く。「音とともに再生」から開始。シーク、一時停止、音量ON/OFF、全画面に対応。

完成動画: `artifacts/collapse-motion-20261016/sushi-loopy-the-last-piece.mp4`（1920×1080、30 fps、ステレオ）。

## 演出

| 秒 | 映像と音 |
| --- | --- |
| 0–5 | 育った街にゆっくり近づく。元のゲームの旋律 |
| 5–10.8 | 同期の輪が揃う。3回の同期音と低音の上昇 |
| 10.8–12.6 | ごく小さな位置ずれと色収差。音が完全に途切れる |
| 12.6–18.4 | 琥珀色の衝撃波。1,477の立体的な破片と4,500の粒子。加速からスローモーションへ |
| 18.4–24 | 破片が重力で落ちる。暗転と残響 |
| 24–34 | 皿と一貫だけが残る。「握る」。元の調性へ戻る余韻 |

## 実装と検証

`main.js` は既存の `buildTown` と9つのLv.4 GLBを再利用する。頂点を空間セル単位でまとめ、頂点シェーダーで位置と法線を変形し、影にも同じ変形を適用する。時間だけでフレームが決まるため、逆向きのシークも動画書き出しも再現可能。破片は演出用の軌道で、剛体同士の衝突計算はしない。

`score.js` は既存の `notesAtStep` を使ったアレンジと効果音をOfflineAudioContextで生成。外部の音源・画像・新規依存は不要。ゲームの状態やSave Codeへはアクセスしない。これは独立した演出試作で、ゲーム本体には組み込んでいない。

```powershell
node demos/collapse/render.mjs
node demos/collapse/render.mjs --webkit
node demos/collapse/render.mjs --render
node demos/collapse/render.mjs --audio
```

検証・書き出しには既存のPlaywrightとFFmpegを使う。Playwrightの場所は `PLAYWRIGHT_MODULE`、URLは `COLLAPSE_URL` で上書き可能。生成物と検証JSONは `artifacts/collapse-motion-20261016/` に保存。各場面の可視性、シェーダーエラー、逆シークの画素一致、セーブ無変更、モバイル幅、手動再生、一時停止、ミュート、シークを確認する。WebKitの検証は実機Safari検証とは別。

`--audio` は音だけをWAVへ再出力する。音量ピーク、音楽と破断音の差、直前の無音、終盤の音量も検証する。

自動再生は行わない。動きを減らす設定ではカメラ揺れと色収差を除き、利用者が明示的に開始したときだけ映像を動かす。動画そのものは演出のフルモーション版。Windows版Playwright WebKitはWeb Audioを提供しないため、音声非対応を明示して映像を再生する。音付きMP4にはこの制限はない。

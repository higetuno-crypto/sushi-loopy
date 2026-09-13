# Sushi Loopy

ひとつ握る。世界がまわる。スマホ向けの軽量な寿司クリッカー。

1周目: 実績10件・強化5件・新聞15件・成長する音楽・モバイルUIに加え、同期装置3台の導入に伴う異常、Three.jsによる画面崩壊、クリア記録まで実装。Save v5。周回後の新規コンテンツ・真EDは今後の工程。

## 起動・検証

### GitHub Pages

公開URL: https://higetuno-crypto.github.io/sushi-loopy/

GitHubのSettings → PagesでSourceをGitHub Actionsに設定済み。

設定後はmainへのpushでlint・テスト・ビルドが実行され、成功した版を自動公開する。Actionsの「Deploy Sushi Loopy to GitHub Pages」から手動実行も可能。CIでは配信パスを `/sushi-loopy/` にし、ローカル開発では `/` を維持する。

公開サイトのセーブは端末・ブラウザごとの保存。ローカル版から移動する場合はSave Codeを使う。端末間の自動同期はない。

### 別のPC（PC-A / Codex）で開発する

GitHub: https://github.com/higetuno-crypto/sushi-loopy （公開）。Node.js 24 LTSを用意する。pushには書き込み権限のあるGitHubアカウントで認証する。

```powershell
gh auth login
gh repo clone higetuno-crypto/sushi-loopy D:\Sushi_Loopy
cd D:\Sushi_Loopy
npm ci
npm run dev -- --host 127.0.0.1 --port 5178 --strictPort
```

既に `D:\Sushi_Loopy` がある場合は空いている別のフォルダへcloneする。Codexでclone先をプロジェクトとして開けば編集できる。

作業開始時は、未コミットの変更がないことを確認して `git pull --ff-only`。別PCでも同時に作業する場合は `git switch -c 作業ブランチ名` で専用ブランチを作る。変更後は下記の検証を実行し、`git add`、`git commit`、`git push -u origin HEAD` で共有する。

依存フォルダ・ビルド出力はGitに含めない。ゲームのセーブはブラウザに保存され、Gitでは同期されないため、移動時はゲーム内のSave Codeを使う。制作ツールやブラウザ検証スクリプトのPC固有パスは必要に応じて設定する。

```powershell
npm run dev
npm run build
npm run lint
npm test
npm run typecheck
```

Node.js 24とインストール済みの依存で検証済み。Three.js・html2canvasを崩壊用に追加。2台目の同期以降に動的ロードし、通常の初回表示には読み込まない。テストはNode標準runnerと既存Viteを使う。

この作業の確認用serverは `http://127.0.0.1:4178/`（production preview）、`http://127.0.0.1:5178/`（dev）。本番公開ではない。server停止後は `npm run preview -- --host 127.0.0.1 --port 4178 --strictPort` で再開できる。

## 遊び方

寿司をタップして10 SUSHIためたら職人さんを購入。施設が自動生産し、初回購入で実績報酬が付く。25回握ると最初の強化、100回でクリック実績。設備を見ているときもスマホの下部ボタンで握れる。

音楽は「音をつける」から任意で開始。施設の成長で楽器が増える。止めたり音量を変えたりできる。新聞は12秒ごとに切り替わり、読んだ記事は記録に残る。

## 1周目の結末

世界鮮度同期装置の1台目・2台目を買うと「鮮度同期を実施しますか？」が開く。同期すると全施設の生産に+25%ずつの補正が付き、営業中の画面に異常が混じる。「あとで」を選んだ場合は「鮮度同期を設定」から再開できる。

2台目の接続処理中も握る・ほかの設備を買う操作は続けられる。異常が大きくなってから3台目を購入すると、応答エラーを経て普段のお店の画面が断片になって落ちる。最後に残る寿司を握ると、説明なしでSUSHI・設備・強化・実績がゼロの最初のお店に戻る。クリア画面は表示しない。

同期状態と異常の進行は保存され、画面を閉じても演出時間は進まない。前回の設備・クリック数・累計SUSHIは内部に残り、ページ最下部の「前回のルーピー」を開くと見られる。旧版のクリア済みセーブも前回の記録へ移し、最初のお店から再開する。寿司新聞はスクロール中も上部に残る。

[実装と検証の詳細](docs/FIRST_RUN_ENDING.md)。`scripts/ending-check.mjs` はPC/モバイルで購入→確認2回→異常→3台目購入→WebGL崩壊→無言の初期化→前回の記録を検証。`SUSHI_TEST_URL`でbuild previewや公開先にも実行でき、保存領域は隔離したテストcontextだけを使う。

## セーブ

- Main Save: `sushi-loopy.save`
- Facility Checkpoints: `sushi-loopy.facility-checkpoints`
- Save Code: `SUSHILOOPY1:`
- v4 migration backup: `sushi-loopy.save.backup-v4`
- v3 migration backup: `sushi-loopy.save.backup-v3`
- 前回の記録: Main Save内の `previousRun`（前版の `sushi-loopy.before-sync-replay` も削除しない）
- v2 migration backup: `sushi-loopy.save.backup-v2`
- v1 migration backup: `sushi-loopy.save.backup-v1`

5秒ごとの自動保存、起動時ロード、最大4時間のOffline。ブラウザ・origin（host/port）ごとにデータは別。端末間の同期はない。移動には画面下のSave Codeを使う。

v1/v2/v3/v4を読み込むとv5へ移行。旧バージョンのMain Saveは初回更新前にバックアップする。v1の旧クリック数は未記録なので0から、施設実績は所持数から付く。Code/Checkpoint復元でOffline報酬は付けない。読めない保存データは自動上書きせず警告する。保存コードは暗号化ではない。

## 開発ドキュメント

- [実装・検証・残課題](docs/STEP3_REPORT.md)
- [変更ファイル一覧](docs/CHANGED_FILES.md)
- [監査と設計判断](docs/STEP3_PLAN.md)
- [データ追加とSave設計](docs/CONTENT_GUIDE.md)
- [PC制作環境と自動化](docs/PRODUCTION_ENVIRONMENT.md)
- [画像・音楽・3D・Prompt](assets/ASSET_MANIFEST.md)

## ブラウザと資産検証

`node scripts/browser-check.mjs` は5178のdev serverでUI回帰を実行。`node scripts/production-check.mjs` は4178のbuild previewでmobile/touch/CPU4倍を確認。既存EdgeとこのPCのbundled Playwrightを使用する。別PCでは `PLAYWRIGHT_MODULE` に既存Playwright packageのパスを指定する。実行時の自動インストールはない。

`node scripts/balance-check.mjs` は隔離した状態で仮想購入戦略を試す。現価格では同期装置到達が目標より早い。人間の通しプレイを代替しない。

`node scripts/render-audio-preview.mjs` で実音源からレビュー用WAVを生成。3D試作は `scripts/blender-sync-prototype.py`、既存Blenderの独立background/factory-startupで実行する。元シーンは変更しない。既存試作への再実行はバージョン変更が必要。

## 構成

`src/game/data` → コンテンツ定義  
`src/game/logic` → 条件・報酬・経済の純粋関数  
`src/game/state` → Zustandとselector  
`src/game/save` → schema/migration/validation/snapshot  
`src/game/runtime` → scheduler/Offline/Auto Save/Checkpoint tracking  
`src/game/audio` → 楽譜と音源  
`src/ui` → 画面  
`public/assets` → 最適化済み採用画像  
`assets` → 生成元・Prompt・試作（通常ロードしない）

施設IDを変更しない。派生価格/倍率を保存しない。拡張の前に既存Save経路をテストする。依存とモデルを不用意に増やさない。

# Sushi Loopy

ひとつ握る。寿司の街が育つ。縦持ちスマホで遊ぶ、海辺の寿司の箱庭。

9施設が稼働する街、港から店へのトラック配送、猫・常連の注文・氷の泡、無料の模様替え、記念写真を実装。店名・色・配置は周回後も残り、前回の街を見返せます。実績10件・強化5件・新聞15件・成長する音楽と、既存の同期・崩壊・無言の周回も維持。Save v6。[箱庭版の実装・検証](docs/TOWN_RELEASE_20261008.md)。

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

下部の「にぎる」をタップ・長押しして10 SUSHIためたら職人さんを購入。街をドラッグ・二本指で拡大し、建物をタップすると増設できます。「設備」には施設と強化・実績、「模様替え」には店名・色・天気・ベンチ・配置・写真をまとめています。

買うと職人が働き、回転レーンが回り、プラントから配達車が出ます。1・5・10・25個で外観と周囲の小物が育ちます。配送は演出で、生産量はアニメーションを止めても変わりません。常連の注文は任意で、正解すると生産4秒分の寿司を受け取り、次の注文まで60秒待ちます。

右上「•••」の記録と設定から音楽・動作・Save Codeを操作できます。音楽は任意で開始し、施設の成長で楽器が増えます。新聞は12秒ごとに切り替わり、読んだ記事は記録に残ります。

## 1周目の結末

世界鮮度同期装置の1台目・2台目を買うと「鮮度同期を実施しますか？」が開く。同期すると全施設の生産に+25%ずつの補正が付き、営業中の画面に異常が混じる。「あとで」を選んだ場合は「鮮度同期を設定」から再開できる。

2台目の接続処理中も握る・ほかの設備を買う操作は続けられる。異常が大きくなってから3台目を購入すると、応答エラーを経て普段のお店の画面が断片になって落ちる。最後に残る寿司を握ると、説明なしでSUSHI・設備・強化・実績がゼロの最初のお店に戻る。クリア画面は表示しない。

同期状態と異常の進行は保存され、画面を閉じても演出時間は進みません。周回後も店名・色・配置が残り、右上の設定から「前回育てた街」と前回の数字の記録を見られます。旧版のクリア済みセーブも前回の記録へ移します。

[結末の設計記録](docs/FIRST_RUN_ENDING.md)。箱庭UIの現在の通し検証は `scripts/town-journey-check.mjs`。旧 `ending-check.mjs` 等は旧UI用です。`SUSHI_TEST_URL` で公開先にも実行でき、保存領域は隔離したテストcontextだけを使います。

## セーブ

- Main Save: `sushi-loopy.save`
- Facility Checkpoints: `sushi-loopy.facility-checkpoints`
- Save Code: `SUSHILOOPY1:`
- v5 migration backup: `sushi-loopy.save.backup-v5`
- 自分の街: Main Save内の `town`、前回の街: `previousTown`
- v4 migration backup: `sushi-loopy.save.backup-v4`
- v3 migration backup: `sushi-loopy.save.backup-v3`
- 前回の記録: Main Save内の `previousRun`（前版の `sushi-loopy.before-sync-replay` も削除しない）
- v2 migration backup: `sushi-loopy.save.backup-v2`
- v1 migration backup: `sushi-loopy.save.backup-v1`

5秒ごとの自動保存、起動時ロード、最大4時間のOffline。ブラウザ・origin（host/port）ごとにデータは別。端末間の同期はありません。移動には右上の設定内のSave Codeを使います。

v1〜v5を読み込むとv6へ移行。旧バージョンのMain Saveは初回更新前にバックアップします。v1の旧クリック数は未記録なので0から、施設実績は所持数から付きます。Code/Checkpoint復元でOffline報酬は付けません。読めない保存データは自動上書きせず警告します。保存コードは暗号化ではありません。

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

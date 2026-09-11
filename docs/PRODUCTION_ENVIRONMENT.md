# PC制作環境 / 2026-09-09 実測

PC設定・認証情報は変更していない。新規パッケージ/モデルのインストールやダウンロード、外部公開は行っていない。MCP設定はserver名・実行ファイル等だけを調査し、認証値を記録していない。

| 環境 | 判定 | 現在確認した証拠・用途 |
|---|---|---|
| Node.js / npm | 利用可能 | v24.13.0 / 11.6.2。STEP 3 buildと全test実行 |
| Git | 利用可能 | 2.53.0.windows.1。ただしSushi_Loopyに.gitなし。バックアップとの差分で追跡 |
| Python（PATH） | 利用可能 | Hermes venv、3.11.15。Pillow / NumPyをimport確認 |
| FFmpeg / ffprobe | 利用可能 | 8.1。試聴WAVをMP3へ変換し54.526秒の音声を検証 |
| ImageMagick | 利用可能 | 7.1.2-25。透過画像のtrim/resize/WebP生成を実行 |
| OpenAI組み込み画像生成 | 利用可能 | このタスクから1枚の透過PNG生成に成功。APIキー追加なし |
| ChatGPT Images 2.5 の厳密なモデル指定 | 要設定 | 組み込みツールにmodel指定引数がないため実使用モデル名は未確認。2.5を使ったと断定しない。明示モデルAPI経路は未疎通 |
| Stable Diffusion MCP（image-gen） | 要設定 | Codex登録済み、get_sd_modelsはECONNREFUSED 127.0.0.1:7860。Forgeサーバー停止中 |
| SD Forge本体 | 利用可能（実行環境） | D:\SDForge。専用Python3.10.11 / torch2.3.1+cu121 / CUDA=Trueを確認。生成自体は今回未実行 |
| SDモデル | 利用可能（ファイル） | D:\SDModels\StableDiffusionにDreamShaperXL_Lightning、Juggernaut_RunDiffusionPhoto2_Lightning_4Steps、RealVisXL_V5.0_Lightning_fp16を確認 |
| Blender | 利用可能 | 5.1.1。factory-startupの独立backgroundプロセスで.blend / GLB / previewを書き出し成功 |
| Blender MCP | 要設定 | Claude設定にuvx blender-mcp、5.1のaddonファイルあり。9876待受なし。今回のCodexにはBlender callable toolなし。GUI接続は未実施 |
| Melodialect | 利用可能 | D:\music_tkuru\melodialect 1.9.0。既存tsx CLIでseed909のMIDI生成成功。MIDI/WAV/ステム出力の実装・README確認。WAVステム出力は今回未実行 |
| Web Audio | 利用可能 | Edge実ブラウザでAudioContext開始/停止、音量変更。OfflineAudioContextで実音源のWAVレンダーと波形検証に成功 |
| MOSS-SoundEffect-v2 | 要設定（生成確認待ち） | C:\AI\MOSS-SoundEffect-v2\.venv、Python3.12.10 / torch2.9.0+cu128 / soundfile0.13.1 / CUDA=True。C:\AI\MOSS-TTS\modelsにモデル本体を確認。7861停止、今回生成なし |
| VOICEVOX | 要設定（起動確認待ち） | AppData\Local\Programs\VOICEVOX\VOICEVOX.exe を確認。起動/合成は未試験 |
| Audacity | 利用可能（実行ファイル確認） | 2.4.2、C:\Program Files (x86)\Audacity\audacity.exeの存在確認。今回編集処理は未実行 |
| TripoSG | 要設定（生成確認待ち） | D:\AI\TripoSGにvenv、TripoSG/RMBG-1.4 weights directories。torch/diffusers/trimeshがimport可能。今回3D生成なし |
| Three.js | 要設定（Sushi Loopy） | Sushi Loopyには未導入。通常2Dに不要なので依存追加なし。GLBを次工程で動的ロードする予定 |
| Playwright + Edge | 利用可能 | bundled Playwrightと既存Edgeで13項目UI検証成功。Playwright同梱想定browser1234は未インストールのため、installed Edgeを使用 |
| OpenAI Developer Docs MCP | 利用可能 | 画像生成の検索/fetch成功 |
| pc-a-codex / Roblox MCP | 要設定（この制作では未疎通） | ローカル設定の登録を確認。Sushi Loopyの今回工程には使用していない |
| Drive / Canva / Sites系の連携 | 要設定（この制作では未疎通） | セッションにツール定義あり。実アカウントの疎通・制作への採用は未確認。公開しない |
| iPhone実機 / Safari / iOS音声中断 | 利用不可（現セッションから未検証） | Edgeによる画面・touchエミュレーションは成功。実機試験と同等とは扱わない |

GPU: NVIDIA GeForce RTX 2070 SUPER、8,192MiB。監査時使用806MiB。大容量モデルを同時ロードする前提にしない。専用venvごとに依存が異なるため、PATHのPythonへ混ぜてインストールしない。

## 画像生成の方針
主要画像は組み込みOpenAI経路を優先し、今回もそこで生成できたのでSDは起動しなかった。[公式Image generation](https://developers.openai.com/api/docs/guides/image-generation) はGPT Image 2.5 Sunburst / Flareを記載している。ただし公式提供と、この組み込みツールの内部モデルが同一と確認できたことは別。厳密な2.5指定が必要な工程でのみAPI経路の接続を検証する。

## Human Action Required
今回のSTEP 3を止める人間操作はない。以下は今後GUI経由のBlender MCPを選ぶ場合の操作手順で、CLI制作には不要。

1. 理由: 現在Blenderの9876ポートが待受しておらず、CodexにもBlenderツールが公開されていない。
2. アプリ: Blender 5.1.1。
3. 画面: Edit → Preferences → Add-ons、次に3D ViewのNサイドバー → BlenderMCP。
4. 操作: 既存 `blender-mcp-addon.py` を有効化し、BlenderMCPパネルの **Connect to Claude** を押す（既存addonのボタン名を実ファイルから確認）。初回有効化が必要なら既存ファイルをAdd-onsで選択。外部生成サービス/無料トライアルキーは不要なので有効化しない。
5. 完了状態: パネルに **Stop the connection to Claude** が表示され、localhost:9876が待受する。Codex側は別途この既存MCPを有効化して再接続する必要がある。現在の設定を無断で改変しない。
6. 完了後Codexが行うこと: read-only scene infoで疎通→専用シーンで小物制作→glTF書き出し→面数/寸法/材質/ファイルサイズ検証。

外出中でもBlender CLIは全自動で使えることを今回実証した。GUI操作の完了を待たずに3D資産を準備できる。

### iPhone実機での最終確認（帰宅後の候補、今回の完了を妨げない）
1. 理由: ChromiumのエミュレーションではiOSの音声中断、発熱、実際のタップ感を確認できない。
2. アプリ: iPhoneのSafari。
3. 画面: CodexがLAN内プレビューを準備した際に提示するゲームURL。現在の127.0.0.1はPC内だけなので、そのままiPhoneでは開けない。
4. 操作: 寿司を10回タップして職人を購入、音をON/OFF、音量変更、ホーム画面へ20秒離れて復帰、ページを再読み込み。横向き/縦向きで設備と下部ボタンを操作する。
5. 完了状態: 音が重複せず再開/停止でき、購入とセーブが残り、表示のはみ出しや触れないボタンがない。数分操作して発熱/遅延の感想を得る。
6. その後Codexが行うこと: 結果を記録し、iOS固有の不具合があれば修正して同じチェックを再実行する。既存プレイのSave Codeは検証前にバックアップする。

## 今後の自動化の範囲
| 区分 | 制作工程 |
|---|---|
| 完全自動化可能 | コード実装、型/lint/test、隔離browser QA、Save回帰、データ生成、画像trim/resize/WebP、音声変換・波形検査、MIDI生成、Blender Pythonモデル生成とGLB書き出し、予算チェック |
| Codex主体 + 人間確認 | 画像の試作とシリーズ整合、BGM候補とステム、3Dの材質・LOD、データバランス調整、採用済み資産の組み込み |
| Human操作が一部必要 | 厳密なモデル指定経路の初回認証が必要な場合、Blender GUI MCP接続を選ぶ場合、iPhone実機の音/発熱/中断復帰テスト |
| 人間によるデザイン判断が重要 | どの見た目をSushi Loopyらしいとするか、長時間の聴き疲れ、日常から異常への温度差、EDの読後感、口コミにしたくなる場面 |

話題化はツールを揃えただけでは保証されない。まず短時間で気持ちよい握り体験と「何かおかしい」と気づく共有したくなる瞬間を作り、実プレイヤーの反応で調整する。

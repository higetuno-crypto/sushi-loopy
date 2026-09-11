# 制作資産 / STEP 3

## 採用した画像
- Source: `source/salmon-hero-v1.png`。OpenAI組み込み画像生成1回で作成。厳密なモデル名はツール非公開。
- Prompt: `prompts/salmon-hero-v1.md`。元の生成指示・構図・パレット・透過指定・最適化ルールを保存。
- Game: `../public/assets/salmon-hero-v1.webp` (631×640、49,046 bytes)、`salmon-hero-v1-small.webp` (316×320、14,294 bytes)。元画像をtrimし、ImageMagickで縮小・WebP圧縮。alphaを保持。
- 使用箇所: 主役のタップ寿司。srcSetで画面密度に応じて選択。失敗時は寿司絵文字で操作を維持。
- シリーズルール: 温かいアイボリー、珊瑚色、濃紺、わさび色。左上の柔らかい光。3/4視点。背景透過。主要物のスケールを合わせる。
- `../public/favicon.svg`: 既存のViteアイコンを寿司の小さなベクターアイコンへ変更。コードで作成。
- 施設・実績は現時点で軽量な文字/絵文字アイコン。正式なシリーズ画像は未制作。差し替え口は `src/game/data/presentation.ts`。

## 採用した音
- Source: `src/game/audio/score.ts` / `voice.ts` / `engine.ts`。今回新規に書いた76BPMのオリジナル手続き音楽。
- 5層: 和音→職人で低音→回転寿司で短いリズム音→自動握り器で旋律→プラントで装飾音。
- 4種の旋律変奏、定期的な休符。共通音程・テンポでレイヤーを追加。外部音源・ストリーミングなし。
- ユーザーの明示操作で開始。音量調節/停止、hidden時停止、復帰時に溜まった音を一気に鳴らさない。40同時発音上限。
- 試聴: `prototypes/music/sushi-loopy-layers-v1.mp3` (54.526秒、224,374 bytes)。レイヤーが増える流れを短縮したデモ。原本WAV 4,809,266 bytes。
- レンダー: `scripts/render-audio-preview.mjs` がゲームと同じscore/voiceをOfflineAudioContextへ渡す。FFmpeg libmp3lame品質4でMP3化。
- 検査: peak 0.05573、RMS 0.00580、非有限サンプル0。クリッピングなし、非無音。控えめな音量で、長時間の聴き疲れは人間の試聴評価が必要。
- WAV/MP3はレビュー用でpublicへ投入していない。ゲームでは数KBのコードで合成する。

## 3D試作（ゲーム未採用）
- `prototypes/sync-device-v1/sync-device.blend` / `sync-device.glb` / `preview.png` / `manifest.json`。
- 再現方法: `scripts/blender-sync-prototype.py` をBlender5.1.1の独立background/factory-startupで実行。
- 形: 寿司皿を思わせる基台、3つの軌道、鮮度コア。メッシュ14、三角形2,856、GLB198,160 bytes。テクスチャなし。
- 用途: `global_freshness_sync` の後工程用の形状試作。最終造形/3D演出/Three.js integrationは未実装。
- この試作は手続きモデルで、今回生成した寿司画像をBlender入力に変換したものではない。画像→3D変換経路の実証とは区別する。
- 既存Blender GUIシーンや設定を変更していない。生成プロセスは終了済み。

## 既存作曲環境の試作（ゲーム未採用）
- `prototypes/music/melodialect-serene-seed909.mid`、1,487 bytes。
- D:\music_tkuru\melodialectの既存CLI: `node node_modules/tsx/dist/cli.mjs scripts/generate.ts --dialect serene --key D --bpm 76 --seed 909 --form v,c --loop --out D:\Sushi_Loopy\assets\prototypes\music`
- 14小節、3/4拍子、33.2秒。seedから再現可能。MIDI→WAV/ステムの次工程候補。
- これはゲーム内の手続き音楽とは別の比較候補。混同しない。

## 生成方針の判断
本制作の基盤を先に検証し、主要画像1点・3D小物1点・MIDI1曲に限定した。SD Forge/MOSSは新たな生成を起動せず、既存モデルとCUDAを確認。品質/統合の判断に必要な最小試作を優先した。

# Sushi Loopy STEP 3 — 完了報告

2026-09-09。Achievement / Upgrade / News、Save v2、遊べるUIを実装し、画像・適応音楽まで統合。STEP 3の主要完了条件を満たす。ゲーム全体の偽ED/真EDと4〜6時間の最終バランスは未完成。

ローカルpreview: http://127.0.0.1:4178/ （このPC内だけ。本番公開ではない）。開発serverは http://127.0.0.1:5178/ 。ポートごとにlocalStorageが別なので、従来の別ポートの進行を使う場合はSave Codeで移す。テストは独立したブラウザコンテキストで実行し、既存のブラウザプロファイルやプレイヤーセーブを触っていない。

## Development

全変更/新規ファイルは [CHANGED_FILES.md](CHANGED_FILES.md)、SHA-256は `artifacts/change-manifest.json`。主要な変更:

| 部分 | 実装 |
|---|---|
| Achievement | 指定9施設の初購入実績 + 100クリック = 10件。stable ID、重複防止、0.2/0.5/1/2/5%の個別報酬。純粋判定と依存イベント索引 |
| Upgrade | データ駆動5件。解放/価格/効果/購入状態。資金不足・未解放・再購入・未知IDを拒否。クリック/特定施設/全体生産の効果 |
| News | 15件、12秒周期、条件付き、未読優先、履歴保存、直前の同一記事を回避。新規データ追加時に専用分岐不要 |
| UI | 寿司カウンター、購入進捗、段階的な施設表示、強化/実績/新聞タブ、実績通知、収納式Save tools、スマホでスクロール中の握りボタン |
| 見た目 | アイボリー/朱色/濃紺の紙面、透過生成画像、握りアニメーション、簡単な回転レーン、寿司favicon、reduced-motion対応 |
| 音 | 明示ON/OFF・音量、5層の成長連動、4種の旋律、休符、同時発音上限、hidden停止、音量の滑らかな変更 |
| Save | schemaVersion **1→2**。snapshot/hydrationを共通化し全復元経路を対応。Main Save key、Checkpoint key、Code prefix、FacilityIdは維持 |
| Migration | v1は元の型・検証器を固定。所持施設から実績を復元。旧クリック数は不明なので0、累計獲得は現在所持数を下限に開始。旧Main Saveをbackup-v1に自動退避 |
| Validation | 欠落、未来schema、負数/非有限数、重複/不正IDを拒否。未知の正常形式IDは往復保存し、効果なし。壊れたMain Save/Checkpointの自動上書きを防止 |
| Architecture | UI / state / selector / pure logic / data / audioを分離。派生倍率をGameStateへ保存しない。倍率はimmutable ID配列でキャッシュ。Three.js依存なし |

変更しなかったもの: 9施設の正式ID・基礎価格・成長率・基礎生産、Save Code prefix、最大4時間Offline、5秒Auto Save。新規npm依存なし。package-lock.jsonは作業前とSHA-256が一致。

既存設計との重要な不整合: READMEがVite標準のまま、テスト未配置、STEP 3は雛形のみ、Main Save/Checkpointの破損時に初期値で上書きし得た。今回これらを修正。Gitリポジトリは存在しないためコミットや通常git diffは実施できず、作業前バックアップとファイル比較で追跡。

## Verification

| 項目 | 結果 | 証拠・範囲 |
|---|---|---|
| npm run build | 成功 | strict TypeScript + Vite production build |
| npm run lint | 成功 | oxlint、最終警告0 |
| npm test | 成功 | 28件、失敗0。新規依存なし、Node標準test runner + 既存Vite |
| TypeScript check | 成功 | buildのtsc -bに含む。strict維持 |
| browser | 成功 | 既存Edge + Playwright、13項目。runtime/console error 0 |
| 製品build・mobile touch | 成功 | 390×844、deviceScaleFactor2、touch、CPU4倍slowdown、実購入、下部ボタン、横はみ出しなし |
| 320px / reduced motion | 成功 | UI回帰で幅とアニメ停止を確認 |
| Save / Load | 成功 | 全v2項目を再読込で維持、v1移行/バックアップ |
| Auto Save | 成功 | 5秒保存・cleanup・hidden/visible・pagehide |
| Offline | 成功 | 倍率、4時間上限、未来/不正時刻、非加算playtime/clicks、起動時の二重受取防止 |
| Save Code | 成功 | v1/v2、全フィールド往復、invalid不変、確認付きUI復元、Offlineなし |
| Facility Checkpoint | 成功 | 真の0→1購入、実績込みsnapshot、1回のみ、未知/破損entry保全、全項目復元、Offlineなし |
| Achievement | 成功 | 9施設+100クリック、重複防止、個別倍率、移行 |
| Upgrade | 成功 | 解放/価格/効果/購入済み制御、UI購入、クリック2倍 |
| News | 成功 | 条件/既読優先/再表示/履歴、ブラウザで自動握り器の記事が出ることを確認 |
| 音 | 成功（機械検証） | browser AudioContext動作、Offlineレンダーの非無音/非クリップ、楽譜データの範囲と変奏 |
| Blender / MIDI試作 | 成功 | .blend/GLB/preview、既存Melodialect MIDI出力 |
| 実iPhone / Safari / 長時間聴き疲れ | 未確認 | Edgeのエミュレーションで代替完了とは扱わない |
| 偽ED / 真ED / 4〜6時間通しプレイ | 未確認・機能未実装 | STEP 3対象外 |

ブラウザ検証の途中で、Playwright期待のbrowser1234が未インストールだったため既存Edgeを使用。スマホ下部ボタンのテストでは、寿司が画面外になるまでスクロールする必要があり、テストの前提を修正して成功。残っている失敗テストはない。

性能: 最終JS 233.05KB（gzip74.35KB）、CSS15.92KB（gzip4.26KB）。製品previewの測定ではJS約73.6KB・CSS約4.2KB・画像49KB・favicon483Bを転送。外部originへの要求なし。通常画面のDOM約188要素、3D資産ロードなし。CPU4倍条件の起動を含む試験でlong taskは3件、最大376msを記録したため、実機の操作遅延/初期描画改善は継続評価する。これをiPhone12での性能保証とはしない。

## PC Production Environment / Assets

全ツールの状態とHuman操作手順は [PRODUCTION_ENVIRONMENT.md](PRODUCTION_ENVIRONMENT.md)。全資産の方法/Prompt/サイズ/予定箇所は [ASSET_MANIFEST.md](../assets/ASSET_MANIFEST.md)。

実際に使えた制作経路: **OpenAI画像生成→WebP→React**、**楽譜データ→Web Audio→試聴WAV→FFmpeg MP3**、**Blender Python→GLB**、**Melodialect→MIDI**。

OpenAI組み込み画像生成は成功したがモデル名の指定/確認引数がないので、厳密なChatGPT Images 2.5利用とは断定しない。SD MCPは7860停止、Blender MCPは9876停止かつCodex未公開。これらが未接続でもSTEP 3と画像/3D/音の試作は完成した。

## Remaining

1. **4〜6時間の体験調整**: `artifacts/balance-simulation.json` の仮想戦略では同期装置①4,509秒（75分9秒）、②4,622秒（77分2秒）。目標160/220分とは不一致。人間の最適/平均プレイ時間ではなく、最初100秒だけ1tap/sec、その後は購入効率優先で放置するモデルの結果。価格変更だけで間延びさせず、施設内の発見と選択を増やして複数戦略で調整する。
2. **終盤**: 偽ED/真ED、MetaStateの実使用、LOOP、3D崩壊は未実装。セーブのrun/meta所有境界から設計する。試作GLBは通常画面へ読み込まない。
3. **Saveの技術的負債**: 既存の複数タブwriter leaseは維持。完全なタブ間同期ではないので、競合操作を許す前にWeb Locks等の排他・所有権移譲時の再読込を設計する。破損保存の自動上書きは止めたが、専用のrawバックアップ/復旧UIは次工程。
4. **旧履歴**: v1に記録のないクリック/支出履歴は復元できない。移行後のクリックから数える。将来コンテンツを追加したとき既存v2セーブに新実績をどう遡及付与するかは明文化する。
5. **美術**: 施設/実績全アイコンの正式画像、全段階の背景・演出は未制作。今の1点を基準に2〜3施設で画風の一貫性を確認してから量産する。
6. **音楽**: 現在は軽量オリジナル合成音。実機で音量/聴き疲れを評価し、Melodialect候補をWAVステム化して比較する。後半の違和感・glitch・崩壊レイヤーは未追加。
7. **Human Action Required**: 今回の開発に必須の未完操作なし。iPhone実機試験、Blender GUI MCPを選択する場合の接続、主要ビジュアル/BGMの最終判断が残る。具体的6項目手順は環境報告を参照。
8. **話題化**: 公開・広告・投稿はしていない。共有したくなる「普通の寿司屋のはずなのに」という発見の場面、ネタバレを調整できる共有画像、短時間プレイテストを次の設計に組み込む。バズること自体は保証できない。

## 自動化の評価
- **完全自動化可能**: 実装、型/lint/test、隔離browser、Save回帰、画像圧縮、音声変換、MIDI/Blender手続き生成、資産予算検査。
- **Codex主体 + 人間確認**: 画像の方向出し、BGM/3D候補、ゲーム統合、長時間バランス。
- **Human操作が一部必要**: 未接続のGUI/認証経路を選ぶ場合、iPhone実機での中断・音声復帰。
- **人間によるデザイン判断が重要**: 気持ちいい見た目と音、不穏さの度合い、EDの感情、口コミにしたくなる驚き。

心理設計スキルから、即時フィードバック・次の小目標・段階的な情報開示・スクロール中も握れる最短操作・任意の音楽を採用した。通知や離脱ペナルティを加えず、遊んでいる時間に返す手応えを優先した。

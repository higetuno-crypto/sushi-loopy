# Sushi Loopy — STEP 3 実装計画 / 2026-09-09

## 監査と保全
- D:\Sushi_Loopy は .git がない。git status / diff は実行不可。既存コードを `D:\Sushi_Loopy_backups\before-step3-20260909-114708` へコピー済み（node_modules / dist を除く）。
- Vite 8 / React 19 / TypeScript 6 strict / Zustand 5。npm lockfile と依存はインストール済み。AGENTS.md、ローカルSkills、MCP設定、テストはプロジェクト内にない。
- STEP 2 は実装済み。3つの STEP 3 データファイルと progression / loop は空の雛形。README はVite標準のまま。
- 既存build成功。lintはCheckpointToolsの不要useMemo依存警告1件。
- 250msの生産scheduler、5秒Auto Save、最大4時間Offline。復元時はOfflineなし。施設初回購入だけをaction wrapperで捕捉。
- 重要な既存問題：起動時に壊れた/未来schemaのMain Saveが読めなくても、その後のAuto Saveが初期状態で上書きし得る。保護ガードを追加する。
- 既存価格は4〜6時間のED到達を保証していない。価格を無根拠に変更せず、今後のシミュレーション課題とする。EDはSTEP 3に混ぜない。

## 採用する設計
1. 純粋な共通ConditionとEffectの判別union。データだけで追加できるAchievement / Upgrade / News。
2. 実績は施設初回9件と100クリック1件。報酬は生産への加算率をデータ化し、合計倍率を導出。Upgradeはクリック、施設、全体の倍率を表現。
3. 実績は条件の依存イベント別に索引化。購入/クリック時に関連条件だけ判定し、時間/生産条件は秒境界。Newsは12秒ごと、未読を優先し、履歴を保存。毎フレーム全件走査しない。
4. Save v1型を固定しv2を追加。クリック、累計獲得、解除ID、購入ID、既読News IDのみ永続化。倍率/価格/現在Newsは保存しない。
5. v1にないクリック履歴は復元不可能なので0。累計獲得は現在所持数を下限として開始。所持施設から実績を付与。キーとSave Code prefixは維持。
6. Snapshot / hydration を共通化してMain Save / Code / Checkpointの項目漏れを防止。旧Main Saveを初回移行時に別キーへ保存。未知IDは保持するが効果を与えない。
7. UIは温かい紙色・朱色・濃紺、寿司を握る大きな操作面、次の購入目標、実績帳、強化、寿司新聞。スマホで一画面の操作を明確にし、設定は収納する。
8. 心理設計スキルを使用：即時の手応え→最初の職人→音楽のレイヤー→次の世界観を知りたくなる新聞。強制通知や離脱ペナルティは追加しない。
9. 基盤の検証後に1点の主要画像とWeb Audioによる軽量な生成音楽を追加。終盤の3Dはロード境界を保って後工程へ。

## 検証
Node標準test runnerと既存Viteのmodule runnerを使い依存追加なしで実処理を検証。v1/v2/未来・破損Save、Code round-trip、checkpoint不変、Offline倍率/上限、実績重複防止、upgrade再購入拒否、news履歴を重点確認。ブラウザでは隔離したテスト用ポート/コンテキストを使い既存プレイヤーのlocalStorageを変更しない。

## 完了範囲
STEP 3を遊べる形で完成させ、画像・音の小規模な統合を進める。4〜6時間のバランス、偽ED/真ED、3D崩壊、公開後の話題化は続く工程として明記し、完成と誤称しない。

# 1周目クリア実装 / 2026-09-12

今回の範囲は世界鮮度同期装置の購入から崩壊を経て1周目の結末へ到達するまで。既存施設のID・価格・報酬・序盤の進行は維持。2周目LOOP、真ED、3Dモデル演出、4〜6時間の通しバランス調整は含まない。

## プレイの流れ

1. 世界鮮度同期装置を1台購入。目標欄に同期実行ボタンが出る。追加費用なし。
2. 自分で同期を実行。通常購入・タップ・自動生産が止まる。
3. 表示中の時間で0秒「同期」、10秒「崩壊」、20秒「静止」、28秒「最後の一貫」。文章は観測記録から読み返せる。
4. 最後の一貫を自分で握る。デバッグ倍率を適用せず1 SUSHI・1クリックだけ加算。
5. 1周目CLEAR。営業時間、累計獲得、手動回数、育てた設備を表示。クリア後の数値は止まる。

CSSの軌道・施設の断片で世界が崩れ、音楽は既存の楽器を間引き、低くなり、静止段階では新しい音を止める。追加モデル・画像・音源・依存なし。音は任意。動きを止める設定とOSのreduced motionに対応。

## 保存と復元

- Save v3はGameに`endingPhase`と`collapseElapsedMs`を追加。v1/v2の固定schemaは変更しない。
- v1/v2をv3へ移行。旧Saveの同期装置所持だけで崩壊を始めない。
- 保存キー、Save Code prefix、9施設IDは維持。旧Main Saveを`backup-v1`/`backup-v2`へ初回のみ退避。
- 崩壊開始とクリアは既存Auto Saveのwriter lease・警告経路で即時保存。演出中は5秒保存とpagehide保存。
- オフライン報酬は崩壊・クリアでは0。演出時間をオフラインで飛ばさない。
- クリア状態と時間、所持施設の整合性をvalidationで確認。未知schema/破損保存は上書きしない。
- Save Codeと施設チェックポイントは周回状態全体を復元。チェックポイント復元は既存の確認付き巻き戻しなので、その購入時点に戻る（クリア状態も戻る）。自動リセットやMeta/周回数の新運用は追加しない。

## 検証

- Nodeテスト: 旧save移行・一度だけのクリア・不正状態拒否・途中/クリア後の復元・offline停止・即時保存・writer競合・保存失敗。
- `scripts/browser-check.mjs`: 既存の購入・実績・強化・音・モバイルUI・Save Code・checkpoint・旧Save復帰の回帰確認。
- `scripts/ending-check.mjs`: 隔離したEdge contextで実際に最終施設購入、28秒の進行、途中reload、最後のボタン、クリア後reload。PC 1280×900 / モバイル390×844、後者はreduced motion。証跡は`artifacts/ending-check.json`と`ending-*.png`。
- モバイル確認はEdgeのエミュレーション。実機iPhone/Safariの通しプレイと音の聴感評価は未実施。

検証結果: `npm test` 35/35 PASS、build/typecheck・lint PASS。既存ブラウザ回帰・終盤PC/モバイル各1通し・production previewのモバイル/CPU4倍確認はすべてPASS。公開時の端末差を残すため、実機確認と区別して記録する。

ローカル確認: http://127.0.0.1:5178/ （dev）、http://127.0.0.1:4178/ （配信用build preview）。公開先: https://higetuno-crypto.github.io/sushi-loopy/ 。mainへのpushでGitHub Actionsが検証・配信する。

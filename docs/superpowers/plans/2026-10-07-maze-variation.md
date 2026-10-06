# 迷路の変化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. User authorized implementation and deployment; execute continuously without an additional approval gate.

**Goal:** 公開済みの素材で、やさしいにも長く遊べる大きさ・形・操作感の変化を加え、公開まで確認する。

**Architecture:** ランが直近の面の特徴を保持し、生成条件を乱数の種から選ぶ。形の生成を素材配置から分離し、最終経路を既存の時間・げんき計算へ渡す。最初の素材紹介と通常限定体験を維持し、後半ほど難しい選択にはしない。

**Tech Stack:** 既存JavaScript ES modules、Node test、Chrome/Playwright、GitHub Pages。

**Spec:** docs/superpowers/specs/2026-10-06-maze-variation-design.md。本計画では2026-10-07のユーザー追記を優先する。

## Global Constraints

- 107面・約1600秒の試遊が今回の動機。序盤の追加だけで完了としない。
- 制限時間と初期げんきは現行ロジックをそのまま使用する。
- 今回は既存6壁・既存床・本編のビー玉を使用。検証中のボールと綿の壁は後続。
- 面数で大きさ・複雑さを一方向に増やさない。直近の体験を選択確率へ反映する。
- 壁配置は自動生成、最終状態で全セル到達性と経路を確認。
- 反発広場は一定傾きによる無衝突の直行を防ぐ。操縦して回避するクリアは認める。衝突回数によるゴール制限を導入しない。
- 新しい生成条件でも素材の紹介、練習、センサー、ポーズ、次面待機、音、描画復元を維持。
- v0.6.20で機能を追加し、公開確認で見つかった表示修正はv0.6.21。各版でキャッシュバスターを更新し、記録条件を分離して旧データを保存する。

## Review Focus

- 107面以降でもサイズ・形・テーマが変化し、後半にも短い道が出る。
- コンティニューで迷路やテーマが再抽選されず、休憩床の使用状態も維持。
- 力場が反発広場の最初の区画へ漏れて、壁を避けた一発ゴールを作らない。
- 11・13以上で床の終点保護や走査、実入力、描画復元が7×7のままにならない。
- 大きな迷路の経路を床処理が短い基本迷路へ上書きしない。

## Task 1: 面の選択と形の自動生成

**Files:** src/game/stageVariety.js、src/maze/variation.js、src/config/gameConfig.js、test/maze-variation.test.js。

**Interfaces:** chooseStageVariation({seed, stage, level, history}) → {size, shape, themeId, label}。generateVariedMaze(profile, seed) → 通常のmaze＋variationと任意baffle。

- [x] 生成再現・全セル到達性・大小と形の混在・面数非依存・直進阻止の失敗テストを作成し `node --test test/maze-variation.test.js` で失敗を確認。
- [x] 現行生成を利用して classic / intricate / short / roomy / open を実装。候補の道の長さを選び、広場は乱数で向きと位置が変わる遮蔽壁を残す。
- [x] 設定へ初期出現候補と重みを集約。7,8,9,11,13は初期配分でありサイズの計算上限にはしない。15,17,21も直接条件指定で確認する。
- [x] 最終BFSと経路再計算、双方向の壁整合をテスト。

## Task 2: ラン・素材・時間・ゴールへ接続

**Files:** src/game/run.js、src/game/stagePlay.js、src/world/stage.js、src/world/themes.js、src/world/floorThemes.js、src/world/openFields.js、src/main.js、src/record/storage.js、test/maze-variation.test.js。

**Interfaces:** run.currentVariation(level) は面ごとに再現可能な選択を保持。createStagePlayのcarry.variationに渡す。profile.themeIdで後半テーマを選択。

- [x] 継続時の条件保持、旧記録保持、時間・げんきが既存関数と一致するテストを追加。
- [x] 床の再生成をvaried mazeでは行わず、終点6・走査49を可変サイズに対応。
- [x] 開放面の既存力場を遮蔽壁の先へ配置し、最初の区画と出口の直進に干渉しないことを検証。
- [x] onTravelで通過中のゴールも検出。死亡・時間切れの優先順位を保持し、反発の回数はゴール条件にしない。
- [x] 本編へ接続、面名で大きさと形を短く伝える。旧記録と新構成の記録を分離。

## Task 3: 動作・難易度・公開

**Files:** tools/verify-maze-variation.mjs、tools/browser-maze-variation.mjs、docs/maze-variation.md、docs/verification/maze-variation.md、ガイド、バージョン・precache、引き継ぎと公開記録。

- [x] 大量生成・一定傾き・反応遅延つき操縦を測定し、失敗を保存。既存の時間・げんき値は変更しない。
- [x] Chromeの実pointerで新形状と大小を遊び、継続・ポーズ・音・ガイド・描画復元を確認。PCの計測と実端末の未確認を区別。
- [x] ボールや力場描画が負荷の原因なら描画処理を改善し、物理の上限や素材の性質でごまかさない。
- [x] Nodeは最大5ファイルずつで全件確認。precacheを再生成しオフラインを確認。
- [ ] 差分をレビュー、公開、全実行資材の一致と公開URLの操作を確認。記録・仕様・公開結果を区切りでまとめて更新。

## Progress

- 基準コミット3a290dd。変更前の4ファイル28テスト成功。
- 判断: 静止壁を避ける操縦まで反発必須にすると新しいゴール条件が必要になるため、今回の「傾き一発で直行を防ぐ」を配置の要件として実装する。未確定の厳密な反発必須ルールは導入しない。

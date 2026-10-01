# 床素材チャレンジ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. この計画は主担当が同じセッションで実装する想定。別エージェントの起動は実行方式の選択後に判断する。

**Goal:** 氷・砂・力場・コルクを本編へ追加し、両難易度の余裕、通常限定の楽しさ、絵で伝わるガイドを作って検証後に公開する。

**Architecture:** テーマ選択を進行の基準にし、迷路加工をアイテム・HP・時間計算より先に行う。床描画は実験ページと共通化し、紹介・特別面・通常への予告はテーマ情報を通じてUIへ渡す。

**Tech Stack:** JavaScript ES modules / Canvas 2D / Web Audio / node:test / Playwright / GitHub Pages。

**Spec:** ../specs/2026-10-02-floor-challenge-design.md

## Global Constraints

- 7×7のシード自動生成・BFS到達性・セル単位物理・resolveParamsを維持する。
- ダメージ閾値1.2マス/s、単発上限、無敵時間、円と矩形の衝突、サブステップを維持する。
- 実験用seed250や調整値を本編から直接参照しない。
- 通常も易しくする。初期数値は公開前のプレイ検証で調整し、実測を残す。
- ガイドはスクロール量より楽しさの伝わりやすさを優先する。
- noindex・開発中・音OFF・動きを減らす・ストレージ不可時の継続を維持する。

## Review Focus

1. カーブ加工後の古い経路でアイテム・HP・時間を算出しない。
2. 力場が壁越しの隣接通路や開始・ゴールへ干渉し、操作を妨げない。
3. コンティニューやガイドを閉じる操作で、停止・紹介・入力・音の状態が食い違わない。
4. 小画面、音声拒否、保存不可でも結果・通常への予告・新ガイドが操作可能である。
5. 旧記録を新ルールの記録と混ぜず、旧ベストを失わない。

## Task 1: テーマ進行と床の生成

**Files:** 新規 `src/world/floorThemes.js`、変更 `src/config/gameConfig.js`、`src/world/themes.js`、`src/world/stage.js`、`src/world/stageFeatures.js`、`src/game/stagePlay.js`。テスト `test/floor-themes.test.js`。

**Interfaces:** `themeAt(stage, level='normal')` は `id,label,material,ratio,floorPattern,special,introHint` を返す。`prepareFloorMaze(maze, theme)` は加工後mazeを返す。`addFloorTheme(stage, theme)` はzonesと床テーマ情報を配置する。

- [x] テーマ順・加工後の経路・再現性・候補不足を先に検証する。

```js
for (const seed of [1, 250, 7919, 65535]) {
  const d = challengeDifficulty(8, 'easy');
  const a = createStagePlay(seed, d), b = createStagePlay(seed, d);
  assert.deepEqual(a.stage.maze, b.stage.maze);
  assert.equal(checkReachability(a.stage.maze).ok, true);
  assert.deepEqual(a.stage.maze.path, solvePath(a.stage.maze));
  assert.equal(a.stage.maze.turns, countTurns(a.stage.maze.path));
}
assert.equal(themeAt(10, 'normal').special, true);
assert.equal(Boolean(themeAt(10, 'easy').special), false);
```

- [x] `node --test test/floor-themes.test.js` の失敗を確認する。
- [x] 仕様の1–16面と後続巡回を実装する。最大6シード候補、曲がり角最大3個、開始／ゴールの保護、妨害配置の脱出可能性を実装する。
- [x] 加工はcellsの両側を変更し、`solvePath`と`countTurns`でメタデータを更新してから壁とアイテムを作る。

```js
const modified = prepareFloorMaze(maze, theme);
const path = solvePath(modified);
modified.path = path;
modified.pathLength = path.length;
modified.turns = countTurns(path);
if (!checkReachability(modified).ok) throw new Error('床テーマの到達性が不正です');
```

- [x] カメラに依存しない床セル判定、速度依存の氷加速、既存radial合成を利用する。RESTは氷・力場外の候補に限定し、とりもちは専用テーマだけにする。
- [x] 複数シードで力場の中心・半径・力の上限・開始／ゴール保護、経路不足でも有限時間で生成されることを検証する。
- [x] 上記テストと既存maze/floor-lab/featuresを実行して、T-258を含むコミットを作る。

## Task 2: コルク・難易度・記録

**Files:** 変更 `src/world/materials.js`、`src/render/materialAppearance.js`、`src/render/toyWorld.js`、`src/game/progression.js`、`src/game/challenge.js`、`src/config/gameConfig.js`、`src/record/storage.js`、`src/ui/runScreens.js`。テスト `test/challenge.test.js`、`test/storage.test.js`、新規 `test/floor-difficulty.test.js`。

**Interfaces:** `stageTimeLimitSec(maze, difficulty, stage=null)` は床の経路負荷込みの制限秒を返す。`loadRunBests`/`saveRunBest` は新ルールを扱い、`loadLegacyRunBests(level)` が旧キーを読み取り専用で返す。

- [x] コルクの低ダメージと通常壁相当の反発、最低時間、通常10面の到達余裕、旧記録保存を先に検証する。

```js
const normal = createStagePlay(7919, challengeDifficulty(10, 'normal'));
assert.ok(normal.limitSec >= 25);
assert.equal(getMaterial('cork').restitutionK, getMaterial('default').restitutionK);
assert.ok(getMaterial('cork').damageK < getMaterial('default').damageK);
localStorage.setItem('corogalism-run-bests', JSON.stringify(legacy));
saveRunBest({stages: 3, totalTimeMs: 12000, usedContinue: false, level: 'normal'});
assert.deepEqual(JSON.parse(localStorage.getItem('corogalism-run-bests')), legacy);
```

- [x] 失敗を確認してから、コルク係数0.25・反発1.0と独立した粒模様のCanvas描画を実装する。既存atlasの標準壁へフォールバックしてコルクに見えなくなることを避ける。
- [x] 時間0.8→0.55秒/セルを40面で補間し、最低通常25秒・やさしい30秒、折れ数・砂セル・妨害場数・初登場の加算をconfigへ集約する。通常ダメージ0.65、やさしい0.4、上限倍率1.4、折れ数HP係数4.0、通常回復40%を初期値にする。
- [x] 新規キー `corogalism-run-bests-floor-v1[-easy]` を使い、保存に `rulesVersion:'floor-v1'` を付ける。旧記録は結果／記録一覧の小さな旧ルール欄で読めるようにする。
- [x] ストレージ不正値・書込拒否、通常／やさしい、ノーコン／コンティニューの独立性を検証し、既存HP/physics/storageと新テストを実行してコミットする。

## Task 3: 共通描画・アイキャッチ・通常限定予告

**Files:** 新規 `src/render/floorVisuals.js`、`src/ui/floorPresentation.js`、`src/audio/floorJingle.js`、変更 `src/lab/floorVisuals.js`、`src/render/canvasRenderer.js`、`src/audio/soundManager.js`、`src/main.js`、`src/ui/clearScreen.js`、`src/ui/runScreens.js`、`index.html`、`style.css`。

**Interfaces:** 共通床描画は既存lab描画の引数形を維持する。`createFloorPresentation(root)` は `setStage(theme,{firstVisit})`、`setResult(result)`、`resetRun()` を返す。`createFloorJingle(context, special=false)` は0.8秒以内のAudioBufferを返す。`sound.tick(number, cue=null)` と `sound.clear(special=false)` を既存呼出と互換に拡張する。

- [x] 共通化後に本編・labの同じ素材が同じ描画になること、停止中は力場の描画時計も停止することをブラウザで確認する。
- [x] READY／カウントダウンの既存枠内へ素材画と一言を載せる。テーマ初登場をラン内で記録し、コンティニューとPAUSE再開で再紹介しない。
- [x] Web Audioで短い音階のジングルを作り、スタートSEと置き換える。BGM開始規則・音OFF・SE音量・非表示停止を維持する。コルクの接触音も既存wall音の低い音色として追加する。
- [x] 通常特別面のゴール粒演出を実装し、reduced-motionでは静止表示にする。
- [x] 結果の予告は8面クリア後、3回に1回以下、保存不可はページ内1回。結果画面が初めから操作でき、予告には押すボタンを設けない。
- [x] 予告表示頻度、音声失敗、PAUSE→ガイド→閉じる→再開、コンティニュー、音OFFの回帰を実行してコミットする。

## Task 4: 楽しさを伝えるガイド

**Files:** 変更 `src/ui/guide.js`、`style.css`。描画は `src/render/floorVisuals.js`、`src/render/toyWorld.js` を利用。ブラウザ確認 `tools/browser-floor-guide.mjs`。

**Interfaces:** `initGuide(canOpen)` と `drawGuideArt(canvas,id)` を維持し、素材一覧にコルク・氷・砂・重力・反重力を追加する。

- [x] 既存ガイドのDOM・フォーカス・スクロール復帰を読んで、新素材の追加で壊れないことを確認する。
- [x] 冒頭に3つの絵「すべる」「曲がる」「軌道が変わる」を置く。床の比較、6壁の2列カード、3アイテムの短いカード、ひとやすみ／とりもちを配置する。
- [x] 色だけに頼らない内向き／外向き矢印と「引く／押す」を描き、氷の慣性・砂の減速を短文にする。コルク・ゴム・こけの反発差を絵と文で説明する。
- [x] 320×568／390×844／576×1024で全ガイドをスクロールして読む。横はみ出し、文字切れ、絵の識別、上の閉じる操作と最下部の閉じる操作を確認する。

```js
await page.locator('#btn-guide').click();
assert.equal(await page.locator('#play-guide').isVisible(), true);
assert.equal(await page.locator('[data-guide-art="cork"]').count(), 1);
assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await page.locator('.guide-close').click();
assert.equal(await page.locator('#btn-guide').evaluate(el => el === document.activeElement), true);
```

- [x] スクリーンショットで、スクロール量より楽しさの伝達が優先されたか確認し、必要なら絵や文量を調整する。guide/challengeの回帰を実行してコミットする。

## Task 5: プレイ検証・調整・公開

**Files:** 新規 `tools/balance-floor-challenge.mjs`、`tools/browser-floor-playthrough.mjs`、`docs/verification/floor-challenge.md`。変更 `tools/balance.mjs`、既存ブラウザテスト、`docs/tasks.md`、`docs/handoff-codex.md`、`docs/remaining-work.md`、`docs/deployment.md`、`package.json`、`index.html`、`precache.js`。

- [x] balance.mjsで生成前mazeを保持したまま加工後stageを操縦しないよう、path/goal/HP/timeをstage.mazeから読む。
- [x] 30シード×両難易度×1–20面を、通常の操縦に加え180ms程度の遅れ・曲がり損ね・遅いブレーキで測定する。失敗をdead/timeout/進路回復失敗に分類し、初登場・通常10面までの時間と配置を調整する。
- [x] ブラウザではCanvas上のpointer入力で通しプレイする。開発用にstage/経路を読むことは許すが、teleport・HP書換え・途中の面飛ばしをクリア根拠にしない。実操作のシード、クリア時間、残りげんき、失敗と立て直しを記録する。
- [x] 個別テーマ・記録保存・センサー拒否/無信号・音声・オフライン・全画面とガイドを確認する。古いテーマ順や旧記録を前提とした既存テストは新仕様に更新し、検証の目的を削らない。
- [x] `node --test`、新ブラウザ検証、既存tutorial/floor-lab/audio/portraitを実行し、失敗を直す。人間の傾き体感は未検証と明記する。
- [x] バージョンをv0.6.0へ更新し、`node tools/update-precache.mjs`、差分確認を行う。実測値とガイド画像を記録してT-258コミットを作る。
- [x] mainをpushしてPages成功を待ち、公開URLでガイド・通常10面の特別表示・主要操作・実行資材一致を確認する。公開証跡と残る実機評価を文書へ反映する。

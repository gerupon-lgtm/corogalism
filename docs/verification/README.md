# フェーズ2の検証（2026-09-12）

## v0.2.8 スタートSE後のBGM

- `node --test`: 83件成功。
- `browser-audio.mjs`: スタートSE0.8秒＋間0.2秒の待機後にBGM開始。初回・再開・次面・コンティニューで確認。
- 待機中のポーズ・設定・クリア・終了・ミュートで遅延BGMが鳴らないこと、操作開始・SE・保存・音源失敗時の動作も確認。未処理例外0。

## v0.2.7 BGM再生条件

- `node --test`: 83件成功。
- `browser-audio.mjs`: BGMは3/2/1中に停止し操作開始時だけ再生、ポーズ復帰・次面・コンティニューも同じ。クリア・ゲームオーバー・設定・タイトル・ラン結果の停止とSE継続を確認。

## v0.2.6 サウンドとヘッダ

- `node --test`: 83件成功、失敗0。
- `browser-audio.mjs`: 音源14件のデコード、各イベント発音、停止・保存・失敗時の継続、音ボタン配置・注記維持を確認。
- `browser-ui-polish.mjs`: 5幅で最終行とロゴのベースライン一致、設定・フォント遮断時を確認。
- `browser-start-flow.mjs` / `browser-toy-visuals.mjs`: 4幅でカウント・停止再開・トースト中操作・スクロール不変が成功。
- 未処理例外0。実機試聴は未実施。公開確認は `../deployment.md`。

## v0.2.1 序盤の調整

`node --test` は76件成功（従来73件＋序盤の時間・HP・段階的な復帰の3件）。
1面目の時間を2.5倍、通常ダメージを半分、単発上限を20%とし、10面目で従来値に戻す。
100ラン×3条件のバランス結果は下表と同じ。詳細は `../run-and-score.md` §10。
ローカルと公開URLの両方で、2本のブラウザ確認スクリプトが成功。更新した設定・HP・難易度の配信内容もローカルと一致。
以下のv0.2.0の結果は初回公開時の記録として残す。

対象: `v0.2.0`。ローカルに加え、公開サイト `https://gerupon-lgtm.github.io/corogalism/` でも両ブラウザスクリプトが成功。

## 結果

- `node --test`: **73件成功、失敗0件**。
  既存60件（バランス回帰を含む）、保存6件、面の進行7件。
- `tools/browser-smoke.mjs`: Chromeで成功。プラクティス、ポインター入力、停止・設定・非表示、
  チャレンジのクリア・時間切れ、2回のコンティニュー、記録分離とリロード、画面サイズ、デバッグフック非公開を確認。
- `tools/browser-edge-cases.mjs`: Chromeで成功。実際の物理衝突による被弾・HP0、全回復、
  後半の素材、許可取得のユーザー操作起点、許可／拒否／値が届かない場合、再調整と保存、保存不可環境でのプレイを確認。
- ブラウザの未処理例外: 両スクリプトとも0件。
- `node tools/balance.mjs`: Windowsの起動判定を修正して実測。100ランずつで従来値と一致。

| urgency | 中央値 | HP0 | 時間切れ | 上限到達 |
|---|---:|---:|---:|---:|
| 1.00 | 12面 | 0 | 100 | 0 |
| 1.15 | 14面 | 9 | 91 | 0 |
| 1.30 | 15面 | 45 | 55 | 0 |

- 静的レビューで「微速のまま進むと時計が始まらない」を検出。
  再現テストの失敗を確認後、チャレンジの開始位置から0.02マス移動でも時計を開始するよう修正。
  回帰テスト成功、限定再レビューの追加指摘なし。

センサー許可とイベントはChrome上のモック。iPhone Safariの実センサー確認を代替するものではない。
375×812で盤面・HP・時間・停止ボタンが同時に見えることを確認。
320×568、390×844、1280×900でも横方向のはみ出しがないことを確認。

## 再実行（PowerShell、プロジェクト直下）

通常のゲームには依存パッケージ・ビルド・外部APIは不要。ブラウザ確認時だけPlaywrightを使用する。

```powershell
node --test
# 別ターミナルでローカル配信
python -m http.server 8765 --bind 127.0.0.1
```

今回の環境では検証用Playwrightを親フォルダの `.codex-browser` に分離している。

```powershell
npm.cmd install --prefix ../.codex-browser --cache ../.codex-browser/cache --no-save --no-package-lock playwright
$env:PLAYWRIGHT_MODULE = ([System.Uri](Resolve-Path ../.codex-browser/node_modules/playwright/index.mjs).Path).AbsoluteUri
$env:CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
node tools/browser-smoke.mjs
node tools/browser-edge-cases.mjs
```

公開版を確認する場合は実行前に `$env:BASE_URL = 'https://gerupon-lgtm.github.io/corogalism/'` を設定する。
ローカルへ戻す場合は `Remove-Item Env:BASE_URL -ErrorAction SilentlyContinue`。

ブラウザスクリプトはテスト専用の新規ブラウザコンテキストを使用し、ユーザーの普段の記録は変更しない。
時刻の制御と既存の `?debug=1` フックで終了条件を再現する。記録テストでは成功・失敗両方を確認する。

## 表示の記録

- [モード選択](mode-375.png)
- [チャレンジ1面目](challenge-375.png)
- [被弾](damage-375.png)
- [15面目の石・棘](materials-stage15-375.png)
- [クリア](clear-375.png)
- [時間切れ](over-375.png)
- [ラン結果](result-375.png)

ゴムは描画実装があるが、既存の配置では出現しない。標準・ゴム・石・棘・苔の5種類と縦横壁については
描画担当がモックCanvasでクリップ範囲を検証済み。素材を追加配置する場合はバランスの再測定が必要。

## 残る実機確認（T-209）

Pixel 6a（Chrome）とiPhone XR（Safari）で、HTTPSに公開した版を試遊する。
操作感・被弾の分かりやすさ・素材の識別・時間の厳しさ・腕の負担を確認する。
Git初期化・コミット・push・Pages公開は完了。デプロイ記録は `../deployment.md`。

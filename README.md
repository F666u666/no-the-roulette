# 脳THEルーレットの画面と素材制作

- [見本と画面・モーション設計](ART-DIRECTION.md)
- [演出プレビュー、単一HTML、素材制作の起動方法](media/README.md)

# v2.3.0 — 抽選結果を画面内に表示

大きなREADY TO FIGHT見出しと人数ポスターを削除。表示できる画面の高さに合わせて結果画像・名前・操作ボタンを配置し、1〜10人はページ全体のスクロールなしで表示します。人数が多い場合は名前の横へ実画像を配置。11人以上は読みやすい最低高さを保つため結果一覧の中でスクロールします。乱数・保存の処理は変更していません。

時刻・待ち時間・押す間隔・ROUNDを乱数に使わないことも再確認。説明は `RANDOM-SOURCE.md`、画面寸法と操作確認は `reports/results-fit-check.json`。実機iPhoneでの確認は未実施です。

# v2.2.1 — 表示整理と100万回の抽選検証

トップの横長の英文装飾帯と、最下部のブランド・「身内の大乱闘に」フッターを削除。抽選処理は変更していません。

40キャラ・前回除外ONで1万回を100セット、本番と同じdrawAllとWeb Cryptoで実行。100万回合計は各キャラ24,660〜25,310回（2.4660〜2.5310％）。前回キャラの連続出現は0回。50回の区間20,000件中、2種類以上が各5回以上出た区間は400件（2％）。詳細は `reports/million-draw-audit.json`、100セット全40体の回数は `reports/million-draw-counts.csv`。実機の過去の履歴そのものを再現した検査ではありません。

本番公開先: https://noujiru3.vercel.app/ （v2.2.0）。本番ビルド・画像178枚の配信・最新Service Workerを確認済み。再登場回数の検証は `REPEAT-FREQUENCY.md` を参照。

# 脳THEルーレット v2.2.0 — Blue Mist

ユーザー指定の白・黒・くすんだ青へ配色を更新。青みのある白 #f4f6f8、チャコール #20262d、スレートブルー #4d6c86 を基準に、透過ホワイトの操作面と淡い青の選択状態を統一しました。トップの装飾線も細くしています。候補・結果・設定・ダイアログ・PWAアイコンと起動画面まで同じ色系統です。抽選と保存の処理は変更していません。

# 脳THEルーレット v2.1.0 — ODDBALL

amananimatesの投稿 → Scrolltide → ODDBALLの公開プレビューを、今回の単一参照に固定。深緑・黄緑・中央の公式マリオ・巨大なROULETTEを再現しました。Motion 14.9.0（MIT）を実際に導入。詳細は `DESIGN-REFERENCES.md`。Figmaは旧案のままで同期していません。

今回の確認結果は `reports/oddball-ui-check.json`。390×844・320×568・1280×800・横844×390でレイアウトを確認。候補の画像タップ、英語検索、4人の抽選、個別再抽選、保存も実ブラウザで確認しています。全89体・178画像は検証済みで不足0件です。

更新直後の旧ページが参照するファイルを失わないよう、Service Workerは現在と直前の1世代を保持します。実機iPhoneでのインストールと機内モード検証は未実施です。ローカルプロジェクト用のGitHubリポジトリへの接続・公開も行っていません。

以下は過去バージョンの記録です。

# 脳THEルーレット v2.0.0 / Playroom

公式キャラのポスターを中心に、PC・スマホ両方のレイアウトを再設計。実装の参照とFigmaの未完了事項は `DESIGN-REFERENCES.md`、今回の検証記録は `reports/playroom-ui-check.json` を参照。

以下は以前のバージョンの記録です。

# 脳THEルーレット

## CARD ROOM — 2026-11-02 / v1.3.0

参考サイトの実画面・動画を確認して、白地とコバルトブルーのUIへ再構成。実キャラ3枚のカードスタック、開いたメンバー一覧、結果カードの出現演出に変更しました。参照と具体的な対応は `DESIGN-REFERENCES.md` を参照。実ブラウザーで縦390×844、横844×390を操作確認しています。公平性の抽選ロジックはv1.2を継続します。

## FOUNDATION — 2026-11-02

- 複数人の候補が異なる場合の抽選偏りを修正。調査・数値・制約は `RANDOMNESS-AND-UI.md`。
- 実乱数で1人×40体を10万回、4人×共通40体を10万回、非対称の小さな候補を6万回検証。`npm run audit:randomness` で再実行できます。統計結果は `reports/randomness-audit.json`。
- ロビーの余白・文字・配色を統一、結果を2列表示。候補に名前検索／選択中フィルターを追加。
- Figmaの `FOUNDATION / 2026-11` に編集可能な主要3画面を追加。
- 元の89体・画像178枚・保存データを継続利用。自動E2Eは引き続き実行環境のブラウザー起動制限により未完走です。以前の実ブラウザー確認は旧バージョンの記録です。

## ARENA EDITION — 2026-10-06

Figmaで主要5画面を再設計し、既存PWAに反映しました。

- [Figmaデザイン](https://www.figma.com/design/aWV70mXEqrQPDkaFveVLKG/?node-id=8-6)
- 黒・アイボリー・朱赤、Barlow Condensed / Noto Sans JP、実ファイター画像を用いた画面構成。
- プレイヤー選択、横10列の候補選択、全面画像の抽選結果、設定、プレイヤー詳細を更新。
- 横画面では選択画像のプレビューを固定し、89体のロスターを独立スクロール。
- フォントはローカル同梱し、画像と同様にオフラインキャッシュ対象。OFLライセンスは public/fonts/ に同梱。
- App.tsx、抽選ロジック、保存処理、データ型、ファイター定義は変更していません。

iPhoneのホーム画面から使う、身内用スマブラSPキャラ抽選PWA。広告・ログイン・外部バックエンドなし。Vite / React / TypeScript、IndexedDB保存、ビルド時に全アセットをキャッシュするService Workerで構成しています。

## 起動

Node.js 22.12以上のLTSを推奨。

```sh
npm ci
npm run dev
```

開発サーバー: http://localhost:5173 。開発中はService Workerを登録しません。

本番と同じPWA・オフライン動作を確認する場合:

```sh
npm run build
npm run preview
```

http://localhost:4173 を開きます。`dist/` が完成した静的配信ファイルです。HTMLのダブルクリックでは起動せず、HTTPサーバーまたはHTTPSホスティングで配信してください。

## Vercelへデプロイ

### GitHubから

1. このフォルダーの内容をGitHubリポジトリへ追加。
2. VercelのNew Projectからリポジトリをインポート。
3. Framework: **Vite**、Build Command: **npm run build**、Output Directory: **dist**。
4. 環境変数は不要。そのままDeploy。

モノレポの場合はこのフォルダーをRoot Directoryに指定します。`vercel.json` は同梱済みです。

### CLIから

このフォルダーで `npx vercel --prod` を実行し、案内に従ってログイン・プロジェクト作成します。ここでは実際の公開デプロイは行っていません。ビルド済みの `dist/` も同梱しています。

## iPhoneホーム画面

1. デプロイ後の **HTTPS URL** をiPhoneのSafariで開く。
2. 歯車の設定画面で「オフラインの準備完了」を確認。
3. Safariの共有メニュー → **ホーム画面に追加** → 追加。
4. ホーム画面の「脳汁」アイコンから起動。

初回キャッシュが完了した後は、機内モードでも主要機能が使えます。MacのLANアドレスをHTTPで開いた場合は、iPhone上でService Workerが使えません。iPhoneのPWA確認にはVercel等のHTTPS URLを使用してください。

## 操作と仕様

- 初期10人: いっさ / ジェン / NO6 / おろしポンズ / HERO / うろたんげだまや / ゴッホ / かば / ハリソン / はかせ。
- 最初の候補は全員89体。実際の持ちキャラに合わせて設定から調整できます。初回のメンバー選択は0人です。
- 名前からカラーと12種のオリジナル仮マスコットを決定。名前変更後もカラー・マスコットは維持。
- ファイターはDLC・ダッシュファイター・Mii3タイプを含む公式番号順の89体。ゼニガメ／フシギソウ／リザードン、ホムラ／ヒカリはそれぞれ個別の抽選対象です。色違い・コスチューム違いは同じ枠です。
- 抽選は条件を満たす重複なしの組み合わせを等確率で選びます。候補の連結成分を分離し、共通候補は均等シャッフル、12人以下の異なる候補は整数の成立数に応じた抽選を使います。13人以上で候補が異なる成分は一様な提案を重複時に棄却し、4096回で成立しない場合は計算上限を明示します。偏った割り当てへの切り替えはしません。
- 「前回キャラを除外」は初回STARTにも再抽選にも適用。除外後に不可能な場合はエラーを表示し、直前の結果を維持します。設定を勝手に緩和しません。
- 個別再抽選では、他プレイヤーが使用中のキャラを除外してその人だけ更新します。
- 演出は全体380ms、個別280ms、完了180ms。モーションを減らすOS設定に対応。
- 候補編集は縦4列・横10列。縦でも操作できます。最低1体選ぶまで完了不可。未完了の編集も即時保存し、再起動時に編集画面へ復帰します。
- 選択メンバー、候補、前回キャラ、SE設定などはバージョン付きIndexedDBへ保存。書き込み失敗を表示して再試行できます。
- 更新版のキャッシュが完成すると新しいService Workerへ切り替わり、画面を再読み込みします。直前の版のキャッシュも1世代保持し、更新をまたぐ読み込みに対応します。
- iOSでのVibration APIには依存しません。短いSEと発光・スケールでフィードバックします。

## 主要ファイル

```text
src/
  App.tsx                    画面遷移と抽選フロー
  screens/                   選択・結果・設定・詳細・候補編集
  components/                画像・ダイアログ・共通操作
  models/types.ts            型と保存スキーマ
  data/fighters.ts           全89体の唯一のキャラデータ定義
  data/defaults.ts           初期10人
  data/assets.ts             画像・SEの参照窓口
  data/asset-index.json       配置された画像の自動生成マップ
  services/lottery.ts         重複なし抽選
  services/storage.ts         IndexedDBとバージョン検証
  services/audio.ts           ユーザー操作からのWeb Audio再生
  services/pwa.ts             Service Worker登録と更新
  hooks/useStore.ts           保存キュー
  styles/app.css             Safe Area / ゲームUI / 横画面 / 短い演出
public/
  manifest.webmanifest       standalone設定
  fighters/                  全89体の実画像と選択用ポートレート
  assets/                    プレイヤー画像・SE・ホーム画面アイコン
scripts/
  sync-fighters.mjs          公式ロスターと全画像の自動取得
  verify-fighter-assets.mjs  登録・画像・キャッシュの照合
  prepare-assets.mjs         プレイヤー画像の参照マップを生成
  build-sw.mjs               全成果物のハッシュとプリキャッシュを生成
  create-icons.mjs           元SVGからアイコンPNGを生成
```

## 全ファイターの実画像

公式の最終ロスター84エントリーを取得し、ポケモントレーナー3体・Mii3タイプ・ホムラ／ヒカリを個別に展開した **89体すべて** を登録しています。DLC・ダッシュファイターを含みます。

- 全身画像: `public/fighters/mario.webp` など89ファイル。
- 選択用画像: `public/fighters/portraits/mario.webp` など89ファイル。候補カードに顔のわかる実画像を表示します。
- 81体はスマブラ公式サイトの画像を使用。公式サイトで集合画像になっている8体（ゼニガメ、フシギソウ、リザードン、Mii3タイプ、ホムラ、ヒカリ）は、SmashWikiに掲載された個別の公式アートを使用しています。
- 画像ごとの取得元URL・加工内容・SHA-256は `sources/fighter-assets.json`、取得時の公式一覧は `sources/smashbros-fighters.json` に保存。
- 加工は余白除去・サイズ調整・WebP変換のみ。キャラの生成・番号・イニシャル等による画像代用はありません。

画像を1人ずつ用意する必要はありません。再取得も自動です。

```sh
npm run assets:sync   # 公式一覧と全画像を取得・変換・登録・検証
npm run assets:verify
npm run build        # 画像検証とService Workerへの全画像登録も検証
```

ネットワークが必要なのは再取得時のみです。配布済み画像を使った通常のビルドは再取得しません。全身・選択用の **178画像すべて** をService Workerでプリキャッシュし、初回準備完了後は外部サイトへの接続なしで表示します。

`reports/fighter-assets-audit-build.json` に公式ロスターとの照合結果を出力します。現在は登録89体・全身89枚・検証178枚・キャッシュ178枚・不足0件・不一致0件です。不足時は `reports/missing-fighter-assets.json` に名称を記録し、ビルドを失敗させます。実行中の画像読み込み失敗も `missing-fighter-assets: キャラ名` と明示します。

## プレイヤー素材・アイコン・SE

プレイヤー用のマスコット、ホーム画面の「脳汁」ロゴ、短い電子音は従来のオリジナル素材です。ファイターの画像とは別です。

### 初期プレイヤー専用画像

`public/assets/players/` に以下のファイルを配置します。

| ファイル        | プレイヤー       |
| --------------- | ---------------- |
| initial-1.webp  | いっさ           |
| initial-2.webp  | ジェン           |
| initial-3.webp  | NO6              |
| initial-4.webp  | おろしポンズ     |
| initial-5.webp  | HERO             |
| initial-6.webp  | うろたんげだまや |
| initial-7.webp  | ゴッホ           |
| initial-8.webp  | かば             |
| initial-9.webp  | ハリソン         |
| initial-10.webp | はかせ           |

未配置の場合は名前で決まるマスコットを表示。新規プレイヤーも保存されたIDをファイル名にして差し替えできます。12種の仮マスコットは `public/assets/mascots/0.svg` 〜 `11.svg`。

### アイコン

`public/assets/icons/` の `icon-192.png`、`icon-512.png`、`icon-maskable.png`、`apple-touch-icon.png`（180角）を差し替えてください。`source.svg` を変更し `node scripts/create-icons.mjs` でも再生成できます。maskableは中央の安全領域内に文字を配置してください。

### SE

`public/assets/sounds/start.wav`（200ms）、`reroll.wav`（140ms）、`select.wav`（45ms）を上書きできます。形式を変更する場合のみ `src/data/assets.ts` を編集してください。実行時に音量を30%へ抑え、ユーザー操作のタイミングでAudioContextを再開します。再生失敗でも抽選は継続します。

素材を差し替えたら `npm run build` → 再デプロイ。既存端末は設定画面の更新ボタンを押します。

## 確認

```sh
npm run lint
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

19件の単体テストに通過。700種類の候補集合と総当たり探索の照合、89人割り当て、重複・直前除外・個別再抽選、保存復元と未知のデータバージョン拒否を検証しています。

作成環境では自動E2E用のChrome/WebKitプロセスが起動制限で終了したため、E2E完走済みとはしていません。代わりに実ブラウザで、メンバー選択／全員・個別再抽選／保存復元／追加／名前変更／削除確認／候補0体の復元／844×390の横画面を操作確認しました。macOS Safari本体でサーバーを停止し、再読み込み後の画像表示と抽選も確認しています。iPhone実機のホーム画面起動と実機SEは未確認です。

保存領域は配信元ごとに独立します。Safariとホーム画面版の保存領域の扱いはOSに依存するため、普段使うホーム画面版でメンバーを設定してください。サイトデータ削除やOSによる削除時は端末データも消えます。

参照: [スマブラSP公式ファイター一覧](https://www.smashbros.com/ja_JP/fighter/index.html)、[Viteの静的デプロイ](https://vite.dev/guide/static-deploy.html)。

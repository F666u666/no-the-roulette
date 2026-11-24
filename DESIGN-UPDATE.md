# ARENA EDITION — 変更・検証記録

主要5画面をFigmaで作成した後、既存PWAへ反映しました。

## Figma

- [プレイヤー選択](https://www.figma.com/design/aWV70mXEqrQPDkaFveVLKG/?node-id=8-6)
- [横画面のキャラ選択](https://www.figma.com/design/aWV70mXEqrQPDkaFveVLKG/?node-id=8-72)
- [抽選結果](https://www.figma.com/design/aWV70mXEqrQPDkaFveVLKG/?node-id=8-539)
- [設定](https://www.figma.com/design/aWV70mXEqrQPDkaFveVLKG/?node-id=8-563)
- [プレイヤー詳細](https://www.figma.com/design/aWV70mXEqrQPDkaFveVLKG/?node-id=8-599)

Figmaには全89体の実画像をPNGで配置。PWAは既存のWebP画像を継続利用しています。文字・画像・階層を編集でき、ロスターはコンポーネント化済み。主要ナビゲーションとスクロール領域、動きの時間・イージング仕様も含みます。

## 変更範囲

既存アプリの src/screens/{Members,Results,Settings,Detail,Editor}.tsx と src/styles/app.css を変更。public/fonts/ にフォントとOFLを追加。README更新、dist再生成。

App.tsx、src/services/、src/hooks/、src/models/、src/data/ は変更前のファイルとバイト単位で同一。抽選条件、人数、保存スキーマ、候補IDを維持しています。

## 検証

- Lint、TypeScriptチェック、本番ビルド：成功
- 既存単体テスト：13/13成功
- 全89体・178画像：不足0、不一致0、キャッシュ登録178
- 実ブラウザ：個別再抽選で他の結果維持、全員再抽選、選択保存、追加、名前変更、候補0体で完了不可、編集中の再読み込み復元、候補保存、削除確認とキャンセルを確認
- 320/375/430px：横はみ出しなし、START表示。844×390：画像ロスターとプレビューを確認
- macOS Safari：配信サーバー停止後に再読み込み、抽選、ファイター実画像表示を確認
- 自動E2E：Chromium/WebKitの起動が実行環境の制限で終了し、完走できず。上記の実ブラウザ確認で補完
- iPhone実機のホーム画面起動と実機SEは未確認

## 起動

ZIPを展開し、no-the-roulette/ で npm ci、npm run dev。
本番同等の確認は npm run build、npm run preview。dist/ は静的配信可能な完成物です。

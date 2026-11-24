# ルーレットの演出と素材制作

「設定 → 演出プレビュー」を開くと、スピン（anime.js / D3）、紙吹雪（PixiJS / Matter.js）、光の波紋（p5.js）、3Dメダル（Three.js）、スタンプ（Lottie Web）、結果タイトル（Remotion）を切り替えられます。切り替えは react-spring、効果音の試聴は Tone.js です。プレビューの素材は開いたときに読み込みます。

単一HTML版は `npm run build:standalone` で作成します。ルーレット本体のコード・CSS・キャラクター画像・書体・効果音を同梱します。作品制作ツールと追加の演出プレビューは通常の開発・PWA環境で使用します。Web版と同じIndexedDBの名前と形式を使いますが、ブラウザの保存先はURLのオリジンごとに分かれます。

## 動画

- Motion Canvas。 `npm ci --prefix media/motion-canvas`、`npm --prefix media/motion-canvas run studio`。 `reveal` シーンを開き、Video SettingsのExporterでFFmpegかPNGを選択してRender。
- Remotion。ルートで `npm ci` 後、`npx remotion render media/remotion/index.tsx RouletteReveal work/roulette-reveal.mp4 --is-production=false`。同じコンポジションは演出プレビューの「結果タイトル」で再生できます。
- 公式Remotion Skillsと図版ディレクションスキルはプロジェクト単位で導入済みです。別のチェックアウトでも `npx remotion skills add --agent codex`、`npx skills add RNA4219/anything-frontend-art-direction --agent codex --yes` で再導入できます。

## 3D素材

Blender 4.5でモデルを作成するには、ルートで `blender --background --python media/python/blender_medal.py -- effects/scenes/medal.glb`。再ビルド後、3DメダルのプレビューがGLBを読み込みます。Apple Siliconのローカル検証ではBlender Pythonの初期化が終了するため、GLB書き出しは未確認です。

## AI素材

Python 3.11、FFmpeg、作業用の仮想環境を使います。次のコマンドはリポジトリのルートで実行します。

```sh
python3.11 -m venv work/media-venv
work/media-venv/bin/python -m pip install -r media/python/requirements.txt

git clone https://github.com/hzwer/ECCV2022-RIFE.git work/rife-upstream
git -C work/rife-upstream checkout 5d8adbdd40e12c2c8f91930eff838aebe561c086
work/media-venv/bin/gdown --no-cookies 1APIzVeI-4ZZCEuIRE1m6WYfSCaOsi_7_ -O work/rife-weights.zip
shasum -a 256 work/rife-weights.zip
unzip -o work/rife-weights.zip 'train_log/*.py' 'train_log/flownet.pkl' -d work/rife-upstream
work/media-venv/bin/python media/python/rife.py work/reveal.mp4 work/reveal-2x.mp4

HF_HOME="$PWD/work/huggingface" work/media-venv/bin/python media/python/musicgen.py work/reveal-cue.wav
```

RIFEの公式HDモデルアーカイブのSHA-256は `4d4970b0953ca679ce5d5c972d47a041be10d12fa29fe86f1408b4497b2558e8` です。入力は24・30・60など整数のフレームレートの映像を使います。

MusicGenはMetaの `facebook/musicgen-small` を使います。macOSではTransformers経由、AudioCraftが使えるLinux環境ではAudioCraft 1.3.0を別のPython 3.9環境にインストールし、同じスクリプトを `--backend audiocraft` 付きで実行できます。モデルの重みはCC BY-NC 4.0です。生成サンプルと重みは制作環境に保存します。

- [Motion Canvas](https://github.com/motion-canvas/motion-canvas)
- [Remotion](https://github.com/remotion-dev/remotion) / [Remotion Skills](https://github.com/remotion-dev/skills)
- [Blender](https://github.com/blender/blender)
- [ECCV2022-RIFE](https://github.com/hzwer/ECCV2022-RIFE)
- [AudioCraft](https://github.com/facebookresearch/audiocraft) / [MusicGen small](https://huggingface.co/facebook/musicgen-small)

# zuraji — 自分用メモ

[852wa/JIZURA](https://github.com/852wa/JIZURA)（MIT License）を手元で改造し、仲間内に公開するためのメモ。

## 全体の流れ

```
src/ app/ を編集 ──保存──▶ ローカル（serve.bat）が自動ビルド＋ブラウザ自動リロード
        │
   git commit → git push
        │
        ▼
GitHub Actions が自動ビルド → GitHub Pages に公開（1〜2分）
        ▼
https://nemico.github.io/zuraji/   ← 仲間に渡す URL
```

## リモートの構成

| 名前 | 向き先 | 用途 |
|---|---|---|
| `upstream` | https://github.com/852wa/JIZURA | 本家。更新を取り込むだけ（push しない） |
| `origin` | https://github.com/nemico/zuraji | 自分の公開用リポジトリ。push すると自動で公開される |

## ローカルで使う・改造する

- `serve.bat` をダブルクリック → http://localhost:8765/ が開く（英語版は `/en/`）。終了は窓を閉じるか Ctrl+C。
- 起動中に `src/` `app/` `vendor/` `VERSION` を保存すると、自動でビルドし直し、開いているタブが自動でリロードされる。
- ビルドした結果は `_site/` に出る（git 管理外）。リポジトリに入っている `index.html` などは本家のまま触らない。
- 必要なもの：Node.js（ローカルサーバー）と Python 3（ビルド）。フォントは Google Fonts から読むのでネット接続は要る。

### `python -m http.server` を使わない理由

このPCでは AdGuard が `localhost` の通信にも割り込んで `<script>` を差し込むが、元の長さ（`Content-Length`）を残すので 2.4MB のページの末尾が切れてアプリが起動しない（Python のサーバーだと固まる）。`tools/serve.js` は長さを付けずに分割転送で送るのでこの影響を受けない。
どうしても他のサーバーを使うなら、AdGuard の設定で `localhost` / `127.0.0.1` をフィルタリング対象から除外する。

## 公開する（push するだけ）

```sh
git add -A
git commit -m "変更内容"
git push
```

push すると GitHub Actions（`.github/workflows/pages.yml`）が動き、ビルドして Pages に公開する。
進み具合は GitHub のリポジトリの「Actions」タブ、またはコマンド `gh run watch` で見られる。失敗したら同じ場所にエラーが出る。

公開版の設定：
- 検索エンジンに載らないように `noindex` を付ける。本家の Search Console 用のファイルや `sitemap.xml` は公開しない。
- `no-referrer` を付ける。アプリ内のリンクから本家 GitHub などに飛んでも、本家のアクセス解析にこのサイトの URL は出ない。
- AE パネル（`JIZURA_AE*.jsx` / `JIZURA_CEP*.zip`）はリポジトリにあるものをそのまま一緒に公開する。AE 側を改造したときは `python build_ae.py` / `python build_cep.py` で作り直してからコミットする。

### 仲間に渡す URL

- 日本語版：https://nemico.github.io/zuraji/
- English：https://nemico.github.io/zuraji/en/
- ほか：`/ko/` `/zh-hant/` `/zh-hans/` `/id/` `/vi/`

**GitHub Pages は URL を知っていれば誰でも見られる**（パスワードは付けられない）。検索には出ないようにしてあるが、秘密にしたい内容は載せないこと。
無料プランではリポジトリ（ソースコード）も公開になる。ソースを隠したい場合は有料プラン（Pro）でリポジトリを private にする（それでもページ自体は誰でも見られる）。

### 本家から辿られにくくするために

- このリポジトリは本家の **fork ではない**（独立したリポジトリ）。本家の「Forks」一覧には載らない。今後も GitHub の「Fork」ボタンは使わない。
- 本家に Pull Request や Issue を出すと、自分のアカウントとリポジトリが本家から見えるので出さない。
- このリポジトリのコミットは GitHub の匿名アドレス（`48612450+nemico@users.noreply.github.com`）で記録する設定にしてある（`git config user.email`、このリポジトリだけ）。
- 限界：public リポジトリなので、GitHub 内を「JIZURA」で検索すれば見つかる可能性はある。完全に隠したい場合はリポジトリを private にする（Pages を使うには Pro が必要）。

### 初回だけ必要な設定（済んでいれば不要）

```sh
gh repo create nemico/zuraji --public --source . --remote origin --push
gh api -X POST repos/nemico/zuraji/pages -f build_type=workflow
gh workflow run pages.yml   # 初回の公開を手動で走らせる
```

ブラウザでやるなら：GitHub でリポジトリを作成 → `git remote add origin https://github.com/nemico/zuraji.git` → `git push -u origin main` → Settings → Pages → Source を「GitHub Actions」にする。

## 本家の更新を取り込む

```sh
git fetch upstream
git merge upstream/main     # 自分の変更とぶつかったら解決して commit
git push                    # 自動で公開される
```

本家と衝突しにくいように、改造は `src/` `app/` で行い、生成物（ルートの `index.html`、各言語フォルダ、`sitemap.xml`）は手で直さない（公開版は毎回 Actions がソースから作るので、生成物が古くても問題ない）。

## 本家から変えたところ

- `app/i18n.py`：公開 URL を環境変数 `JIZURA_BASE` で指定できる（未指定なら本家と同じ）。
- `build.py`：`JIZURA_NOINDEX=1` で検索除けの meta を入れる。`JIZURA_OUT=<フォルダ>` で出力先を変える（未指定なら本家と同じ場所）。
- `src/12_ui.js`：▶ボタン／Space で一時停止すると、再生を始めた位置に戻る（`stopToStart()`）。再生中にジャンプした場合はジャンプ先が開始位置になる。ドラッグ・書き出し・タップ同期・最後まで再生したときの停止は今まで通りその場で止まる。
- 追加：`serve.bat`、`tools/serve.js`（ローカルサーバー）、`.github/workflows/pages.yml`（自動公開）、`.gitattributes`、`CUSTOM.md`。`.gitignore` に `_site/`。

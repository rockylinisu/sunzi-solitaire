# 孫子兵法接龍 GitHub Pages 發布包

這個資料夾可直接放到 GitHub Pages repository 根目錄。

## 必要內容

- `index.html`
- `styles.css`
- `script.js`
- `cards/`：有數字牌面 52 張
- `cards-n/`：無數字牌面 52 張，檔名前面有 `N`
- `.nojekyll`

## GitHub Pages 設定

在 repository 的 `Settings` -> `Pages` 設定：

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

完成後等待 GitHub Pages 建置完成。

## 牌圖命名

- 有數字牌：`cards/C01.jpg`
- 無數字牌：`cards-n/NC01.jpg`

無數字牌以 `N` 前綴區別，避免人工整理時和有數字牌混淆。

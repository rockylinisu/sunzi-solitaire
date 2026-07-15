# 孫子兵法接龍 GitHub Pages 發布包

這個資料夾可直接上傳到 GitHub Pages。

## 內容

- `index.html`
- `styles.css`
- `script.js`
- `cards/`：有數字牌面 52 張
- `cards-n/`：無數字牌面 52 張
- `.nojekyll`：避免 GitHub Pages 處理靜態檔案時干擾資料夾

## GitHub Pages 發布步驟

1. 在 GitHub 建立新 repository，例如 `sunzi-solitaire`。
2. 把本資料夾內所有檔案上傳到 repository 根目錄。
3. 到 repository 的 `Settings`。
4. 選 `Pages`。
5. 在 `Build and deployment` 選：
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. 儲存後等待 1 到 3 分鐘。
7. 網址通常會是：
   `https://你的帳號.github.io/sunzi-solitaire/`

## 更新方式

之後修改遊戲時，只要用新版檔案覆蓋 repository 內的同名檔案，GitHub Pages 會自動重新發布。

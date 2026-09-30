# WordLoop · 单词浏览

![React 19](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black) ![TypeScript 5](https://img.shields.io/badge/TypeScript_5-3178C6?logo=typescript&logoColor=white) ![Vite 6](https://img.shields.io/badge/Vite_6-646CFF?logo=vite&logoColor=white) ![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white) ![PWA](https://img.shields.io/badge/PWA-5A0FC8?logo=pwa&logoColor=white) ![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare_Pages-F38020?logo=cloudflarepages&logoColor=white) ![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

纯前端、离线可用的英语词书浏览器。选一本词书，翻看单词卡片。没有账号、没有后端，数据只存在你自己的浏览器里。

## 功能

- 8 本词书（中考 / 高考 / 四级 / 六级 / 考研 / 托福 / 雅思 / GRE），数据来自 ECDICT
- 单词卡片浏览：音标 + 中文释义 + 浏览器朗读（TTS）
- 键盘操作：`←` / `F` 上一个，`→` / `J` 下一个，`空格` 朗读，`/` 搜索；移动端用按钮翻页
- 搜索单词或中文释义：浏览页搜当前词书，书架页跨全部词书全局搜；纯查询，不影响浏览进度
- 每本词书自动记住上次浏览位置（localStorage）
- 浅色 / 深色主题（跟随系统，可手动切换）
- PWA：安装到桌面或手机后完全离线可用

## 本地开发

```bash
# 1. 生成词书数据（只需在词库数据需要更新时重新执行）
#    首次运行自动从 GitHub (skywind3000/ECDICT) 下载 csv 到 .cache/，
#    之后复用缓存；--refresh 强制重新下载；--csv 可指定本地文件
node scripts/build-data.mjs

# 2. 安装依赖并启动
npm install
npm run dev
```

可选参数：

```bash
node scripts/build-data.mjs --refresh            # 更新到 ECDICT 最新版
node scripts/build-data.mjs --csv /path/to.csv   # 使用本地 csv
```

## 构建

```bash
npm run build   # 产物在 dist/
npm run preview # 本地预览构建产物
```

`npm run build` 是纯离线打包：只使用仓库内已提交的 `public/data/`，**不会**下载 csv。网络下载只发生在显式运行 `npm run build:data` 时（默认缓存到 `.cache/`）。

需要更新线上词库时：本地跑 `npm run build:data -- --refresh`，把 `public/data` 的变更提交推送即可。

## 部署到 Cloudflare Pages

两种方式任选：

1. **推荐：提交生成好的 `public/data/`**（约 3.4MB）。构建命令 `npm run build`，输出目录 `dist`。构建快，不依赖外部网络。
2. 每次构建时在线生成：构建命令改为 `npm run build:data && npm run build`。CF 构建环境会从 GitHub 拉取 csv（约 60MB，多花 20 秒左右），始终使用最新词库。

CF Pages 对 SPA 路由自动回退到 `index.html`，无需额外配置。首次访问后词书数据会被 Service Worker 缓存，之后断网也能正常浏览。

## 目录结构

```
scripts/build-data.mjs   ECDICT csv -> public/data/*.json 转换脚本（默认自动从 GitHub 下载源数据）
.cache/                  下载的 ECDICT csv 缓存（已 gitignore）
public/data/             词书数据（manifest.json + 每本书一个 JSON）
src/pages/               BookshelfPage（书架）、BrowsePage（浏览卡片）
src/lib/books.ts         数据加载 + 位置记忆
src/hooks/               键盘 / 主题 / 朗读
```

# 高性价比人生指南 · 检索与收藏网站

基于开源项目 [eternity4719/HowToLiveBetter](https://github.com/eternity4719/HowToLiveBetter)（「高性价比人生指南」，正文以 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.zh) 许可发布）构建的纯静态检索网站。

**在线版**：<https://wooluo.github.io/rs/> （GitHub Pages 自动部署，上游更新后每周自动同步）

## 功能

- **关键词搜索**：即时搜索（防抖 160ms），支持空格分隔多关键词（AND 匹配），命中词高亮；搜索范围覆盖标题、说人话、成本、收益、备注和章节名。按 `/` 聚焦搜索框，`Esc` 清空。
- **多维度筛选**：34 个章节、证据等级（A/B/C）、花钱多少、费时多少、要不要毅力、收益大小、换回什么（死亡率/时间/金钱/自由）。
- **收藏**：条目右侧 ☆/★ 一键收藏，存 localStorage，刷新不丢；顶栏「收藏」按钮只看收藏；「导出收藏」生成按章节分组的 Markdown 文件。
- **分享**：
  - 每条建议右侧 🔗：**复制链接**（直达单条，形如 `#e=1-7`，打开自动定位并高亮闪烁）、**复制文字**（标题+说人话+出处，可直接粘进聊天）、**生成分享图片**（Canvas 绘制的 1080px 卡片图，含标题/说人话/标签/证据等级/出处，可下载或长按保存）、**系统分享**（手机上调起微信等分享面板）。
  - 顶栏「🔗 分享本页」：把当前搜索+筛选结果整个分享出去（对方打开看到一样的视图）。
- **其他**：🎲 随机一条（滚动定位 + 高亮闪烁）、URL hash 同步视图状态（可收藏/分享链接，如 `#q=血压&ev=A&fav=1`）、移动端响应式、暗色模式跟随系统。

## 目录结构

```
site/           网站本体（index.html + style.css + app.js + data.js）
src/            上游仓库内容（book/ 34 节 markdown + README + LICENSE）
build_data.py   解析 src/book/*.md → site/data.js（672 条）
extract.py      从 GitHub tarball 解出 src/（首次获取数据用）
```

## 运行

纯静态、零依赖。两种方式任选：

```bash
# 方式一：本地服务器
python -m http.server 8741 --directory site
# 打开 http://127.0.0.1:8741

# 方式二：直接双击 site/index.html（数据内嵌在 data.js，file:// 也能用）
```

## 自动部署与自动同步（GitHub Actions）

推送到 `main` 分支即自动部署到 GitHub Pages。`.github/workflows/pages.yml` 还包含**每周二的定时任务**：重新下载上游 HowToLiveBetter → 重建 `site/data.js` → 有变化就提交回仓库 → 重新部署。也可以在仓库 Actions 页面手动触发（workflow_dispatch）。

首次启用需把 Pages 的 Build source 设为 **GitHub Actions**（Settings → Pages）。

## 手动更新数据

```bash
python extract.py --download  # 下载上游最新内容并解出 src/
python build_data.py          # 重新生成 site/data.js
```

## 许可与署名

正文内容 © eternity4719/HowToLiveBetter，CC BY 4.0：本站在其基础上重新排版并增加搜索、筛选、收藏功能，页脚保留署名与许可链接。

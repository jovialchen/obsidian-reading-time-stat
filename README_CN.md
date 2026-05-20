# Obsidian 阅读时间统计

[English](README.md) | 简体中文

<a href="https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json">
  <img src="https://img.shields.io/badge/Obsidian-Community%20Plugin-7C3AED?style=flat-square&logo=obsidian" alt="Obsidian Community Plugin">
</a>
<a href="https://github.com/jovialchen/obsidian-reading-time-stat/releases">
  <img src="https://img.shields.io/github/v/release/jovialchen/obsidian-reading-time-stat?style=flat-square" alt="Release">
</a>
<a href="https://github.com/jovialchen/obsidian-reading-time-stat/blob/main/LICENSE">
  <img src="https://img.shields.io/github/license/jovialchen/obsidian-reading-time-stat?style=flat-square" alt="License">
</a>

> 特别感谢我的朋友 **LC** 分享这个创意，感谢 **CosmoBite Labs** 进行测试和反馈。

追踪你的阅读习惯，发现 Obsidian 中最有价值的笔记。这个插件自动记录每篇笔记的阅读时间，并根据阅读时长、频率和最近访问时间计算热度。

## ✨ 功能特性

### 📊 自动追踪
- **实时追踪** - 自动记录每个 Markdown 笔记的阅读时间
- **零配置** - 开箱即用，无需手动干预
- **智能排除** - 可排除特定文件夹或文件模式（如看板、模板）

### 🔥 热门笔记发现
- **热度算法** - 综合阅读时长、频率和新鲜度计算
- **时间范围筛选** - 查看今日、近7天、近30天等时间段的热门笔记
- **实时更新** - 随时查看当前阅读进度

### 🎨 精美界面
- **侧边栏面板** - 快速查看阅读统计概览
- **热门笔记弹窗** - 完整排名表格与详细数据
- **现代设计** - 简洁直观的界面，带有视觉反馈

### ⚙️ 可自定义
- **可调权重** - 精细调整热度算法参数
- **排除规则** - 设置要忽略的文件夹和文件模式
- **会话设置** - 设置计入阅读会话的最短时间

## 🚀 安装

### 从 Obsidian 社区插件安装（推荐）
1. 打开 Obsidian 设置
2. 进入 **社区插件** → **浏览**
3. 搜索 "Reading Time Statistics"
4. 点击 **安装**，然后 **启用**

### 手动安装
1. 从 [最新发布](https://github.com/jovialchen/obsidian-reading-time-stat/releases) 下载 `main.js`、`styles.css` 和 `manifest.json`
2. 在你的库的 `.obsidian/plugins/` 目录下创建 `reading-time-stat` 文件夹
3. 将下载的文件复制到该文件夹
4. 在 Obsidian 设置 → 社区插件中启用此插件

### 从源码构建
```bash
git clone https://github.com/jovialchen/obsidian-reading-time-stat.git
cd obsidian-reading-time-stat
npm install
npm run build
```

## 📖 使用

### 命令

| 命令 | 描述 |
|------|------|
| `打开统计视图` | 打开侧边栏面板，显示统计概览 |
| `显示热门笔记` | 打开完整排名表格弹窗 |
| `显示阅读分析` | 打开热力图、连续天数、高峰时段和导出选项 |
| `导出统计数据` | 将统计数据保存为 JSON 文件 |
| `清除所有统计` | 重置所有追踪数据 |
| `清理孤立数据` | 移除已删除文件的统计数据 |

### 侧边栏面板

侧边栏显示：
- **概览** - 追踪笔记总数、总时间、会话数
- **连续天数与高峰** - 当前连续阅读天数和最高效时段
- **时间范围筛选** - 按时间段筛选热门笔记
- **热门笔记** - 热门笔记及快速统计
- **当前追踪** - 实时会话信息，带有动态计时器

### 分析弹窗

通过命令面板或侧边栏"查看分析"按钮打开：

- **连续天数** - 当前连续阅读天数和最长连续记录
- **高峰时段** - 你最高效的阅读时间
- **周/月总结** - 时间、会话数、活跃天数
- **热力图** - 90天日历展示每日阅读活动
- **时段图表** - 阅读时间的小时分布
- **导出** - CSV（电子表格）和 Markdown（日记）

### 热度计算公式

```
热度 = (阅读时长 / 60) × 时间权重 + 阅读次数 × 次数权重 - 距今天数 × 衰减因子
```

热度越高 = 越热门的笔记。

## ⚙️ 设置

| 设置 | 描述 | 默认值 |
|------|------|--------|
| **阅读时长权重** | 每分钟在热度计算中的权重 | `1.0` |
| **阅读次数权重** | 每次阅读会话的权重 | `5.0` |
| **新鲜度衰减因子** | 每天扣除的热度分值 | `0.05` |
| **热门笔记上限** | 排名显示的最大笔记数 | `20` |
| **最短会话时间** | 计入会话的最少秒数 | `5` |
| **排除文件夹** | 要排除的文件夹路径（每行一个） | - |
| **排除文件模式** | 带 `*` 通配符的文件模式 | - |

### 排除示例

**文件夹：**
```
Kanban/
Templates/
Archive/
```

**文件模式：**
```
todo-*
*-kanban
Daily Note*
```

## 🎨 主题适配

插件大量使用 Obsidian 的 CSS 变量（`--text-normal`、`--interactive-accent` 等），可自动跟随主题色。排名徽章额外提供专用变量，可通过 CSS 代码片段覆盖，无需修改插件源码。

在 **设置 → 外观 → CSS 代码片段** 中添加：

```css
/* 让徽章跟随主题强调色 */
:root {
    --rts-rank-gold-1: var(--interactive-accent);
    --rts-rank-gold-2: var(--interactive-accent-hover);
    --rts-rank-silver-1: var(--text-muted);
    --rts-rank-silver-2: var(--text-faint);
    --rts-rank-bronze-1: var(--text-accent);
    --rts-rank-bronze-2: var(--text-accent-hover);
    --rts-rank-text: var(--text-on-accent);
}
```

可覆盖的变量：

| 变量 | 默认值 | 用途 |
|------|--------|------|
| `--rts-rank-gold-1` / `-2` | `#f1c40f` / `#f39c12` | 第一名徽章 |
| `--rts-rank-silver-1` / `-2` | `#bdc3c7` / `#95a5a6` | 第二名徽章 |
| `--rts-rank-bronze-1` / `-2` | `#d35400` / `#e67e22` | 第三名徽章 |
| `--rts-rank-text` | `#fff` | 徽章文字颜色 |
| `--rts-top-row-tint` / `-hover` | 金色 8% / 12% | 弹窗中第一名行底色 |
| `--rts-first-item-tint` / `-hover` | 绿色 8% / 12% | 侧边栏第一项底色 |

## 📁 数据存储

统计数据存储在 `.obsidian/plugins/reading-time-stat/data.json`：

```json
{
  "settings": { ... },
  "stats": {
    "notes": {
      "path/to/note.md": {
        "totalReadingTime": 1200,
        "readingCount": 5,
        "firstReadAt": "2024-01-01T10:00:00Z",
        "lastReadAt": "2024-04-08T15:30:00Z",
        "hasEdited": true
      }
    },
    "trackingStartedAt": "2024-01-01T10:00:00Z",
    "version": 1
  }
}
```

## 🔧 开发

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 生产构建
npm run build

# 类型检查
npx tsc --noEmit
```

### 项目结构

```
src/
├── main.ts         # 插件入口、UI 组件
├── types.ts        # TypeScript 接口定义
├── tracker.ts      # 阅读时间追踪逻辑
├── stats.ts        # 统计数据管理
├── popularity.ts   # 热度计算
└── exclusions.ts   # 排除规则匹配
```

## 🤝 参与贡献

欢迎贡献代码！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 详情见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- 特别感谢我的朋友 **LC** 分享这个创意
- 感谢 **CosmoBite Labs** 进行测试和宝贵反馈
- 使用 [Obsidian Plugin API](https://docs.obsidian.md/Reference/TypeScript+API) 构建

---

<p align="center">
  用 ❤️ 为 Obsidian 用户打造
</p>
# Obsidian 阅读时间统计

[English](README.md) | 简体中文

<a href="https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json">
  <img src="https://img.shields.io/badge/Obsidian-Community%20Plugin-7C3AED?style=flat-square&logo=obsidian" alt="Obsidian Community Plugin">
</a>
<a href="https://github.com/your-username/obsidian-reading-time-stat/releases">
  <img src="https://img.shields.io/github/v/release/your-username/obsidian-reading-time-stat?style=flat-square" alt="Release">
</a>
<a href="https://github.com/your-username/obsidian-reading-time-stat/blob/main/LICENSE">
  <img src="https://img.shields.io/github/license/your-username/obsidian-reading-time-stat?style=flat-square" alt="License">
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
1. 从 [最新发布](https://github.com/your-username/obsidian-reading-time-stat/releases) 下载 `main.js`、`styles.css` 和 `manifest.json`
2. 在你的库的 `.obsidian/plugins/` 目录下创建 `reading-time-stat` 文件夹
3. 将下载的文件复制到该文件夹
4. 在 Obsidian 设置 → 社区插件中启用此插件

### 从源码构建
```bash
git clone https://github.com/your-username/obsidian-reading-time-stat.git
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
| `导出统计数据` | 将统计数据保存为 JSON 文件 |
| `清除所有统计` | 重置所有追踪数据 |

### 侧边栏面板

侧边栏显示：
- **概览** - 追踪笔记总数、总时间、会话数
- **时间范围筛选** - 按时间段筛选热门笔记
- **热门笔记** - 前10名笔记及快速统计
- **当前追踪** - 实时会话信息，带有动态计时器

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
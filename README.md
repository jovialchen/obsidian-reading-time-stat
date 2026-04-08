# Obsidian Reading Time Statistics

English | [简体中文](README_CN.md)

<a href="https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json">
  <img src="https://img.shields.io/badge/Obsidian-Community%20Plugin-7C3AED?style=flat-square&logo=obsidian" alt="Obsidian Community Plugin">
</a>
<a href="https://github.com/your-username/obsidian-reading-time-stat/releases">
  <img src="https://img.shields.io/github/v/release/your-username/obsidian-reading-time-stat?style=flat-square" alt="Release">
</a>
<a href="https://github.com/your-username/obsidian-reading-time-stat/blob/main/LICENSE">
  <img src="https://img.shields.io/github/license/your-username/obsidian-reading-time-stat?style=flat-square" alt="License">
</a>

> Special thanks to my friend **LC** for sharing this brilliant idea, and **CosmoBite Labs** for testing and feedback.

Track your reading habits and discover your most valuable notes in Obsidian. This plugin automatically records time spent on each note and calculates popularity based on reading time, frequency, and recency.

## ✨ Features

### 📊 Automatic Tracking
- **Real-time tracking** - Automatically records time spent on each markdown note
- **Zero configuration** - Works out of the box, no manual intervention needed
- **Smart exclusion** - Exclude folders or file patterns from tracking (e.g., Kanban, Templates)

### 🔥 Popular Notes Discovery
- **Popularity algorithm** - Combines reading time, frequency, and recency
- **Time range filtering** - View popular notes for Today, Last 7 Days, Last 30 Days, etc.
- **Real-time updates** - See your reading progress as it happens

### 🎨 Beautiful UI
- **Sidebar panel** - Quick overview of your reading statistics
- **Popular notes modal** - Full ranking table with detailed metrics
- **Modern design** - Clean, intuitive interface with visual feedback

### ⚙️ Customizable
- **Adjustable weights** - Fine-tune the popularity algorithm
- **Exclusion rules** - Folders and file patterns to ignore
- **Session settings** - Minimum time to count as a reading session

## 🚀 Installation

### From Obsidian (Recommended)
1. Open Obsidian Settings
2. Go to **Community plugins** → **Browse**
3. Search for "Reading Time Statistics"
4. Click **Install**, then **Enable**

### Manual Installation
1. Download `main.js`, `styles.css`, and `manifest.json` from the [latest release](https://github.com/your-username/obsidian-reading-time-stat/releases)
2. Create a folder `reading-time-stat` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into that folder
4. Enable the plugin in Obsidian Settings → Community plugins

### From Source
```bash
git clone https://github.com/your-username/obsidian-reading-time-stat.git
cd obsidian-reading-time-stat
npm install
npm run build
```

## 📖 Usage

### Commands

| Command | Description |
|---------|-------------|
| `Open Statistics View` | Open the sidebar panel with overview stats |
| `Show Popular Notes` | Open a modal with full ranking table |
| `Export Statistics` | Save stats as JSON file |
| `Clear All Statistics` | Reset all tracked data |

### Sidebar Panel

The sidebar shows:
- **Overview** - Total notes tracked, total time, sessions count
- **Time Range Filter** - Filter popular notes by time period
- **Popular Notes** - Top 10 notes with quick stats
- **Currently Tracking** - Real-time session info with live timer

### Popularity Formula

```
Score = (ReadingTime / 60) × TimeWeight + ReadingCount × CountWeight - DaysSinceLastRead × DecayFactor
```

Higher score = more popular note.

## ⚙️ Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Reading Time Weight** | Weight per minute in popularity calculation | `1.0` |
| **Reading Count Weight** | Weight per reading session | `5.0` |
| **Recency Decay Factor** | Points lost per day since last read | `0.05` |
| **Popular Notes Limit** | Max notes to show in ranking | `20` |
| **Minimum Session Time** | Seconds required to count as a session | `5` |
| **Excluded Folders** | Folder paths to exclude (one per line) | - |
| **Excluded File Patterns** | File patterns with `*` wildcard | - |

### Exclusion Examples

**Folders:**
```
Kanban/
Templates/
Archive/
```

**Patterns:**
```
todo-*
*-kanban
Daily Note*
```

## 📁 Data Storage

Statistics are stored in `.obsidian/plugins/reading-time-stat/data.json`:

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

## 🔧 Development

```bash
# Install dependencies
npm install

# Development mode (watch for changes)
npm run dev

# Production build
npm run build

# Type check
npx tsc --noEmit
```

### Project Structure

```
src/
├── main.ts         # Plugin entry point, UI components
├── types.ts        # TypeScript interfaces
├── tracker.ts      # Reading time tracking logic
├── stats.ts        # Statistics data management
├── popularity.ts   # Popularity calculation
└── exclusions.ts   # Exclusion rule matching
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Special thanks to my friend **LC** for sharing this brilliant idea
- Thanks to **CosmoBite Labs** for testing and valuable feedback
- Built with [Obsidian Plugin API](https://docs.obsidian.md/Reference/TypeScript+API)

---

<p align="center">
  Made with ❤️ for Obsidian users
</p>
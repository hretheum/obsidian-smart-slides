# Smart Slides for Obsidian

AI-powered presentation generator for Obsidian with zero configuration. Creates beautiful slides using Obsidian Slides Extended syntax.

## 🚀 Features

- **Zero Configuration**: Just type your prompt and get a complete presentation
- **AI-Powered**: Uses LLM to generate content and structure
- **Smart Layouts**: Automatically selects optimal layouts based on content
- **Image Generation**: Creates relevant images using AI
- **Slides Extended Compatible**: Full support for advanced layouts and animations
- **Hybrid Intelligence**: Combines local analysis with LLM capabilities

## 📋 Prerequisites

### Required Plugins

1. **Text Generator Plugin** - For LLM integration
   - Install from Community Plugins
   - Configure with your OpenAI/Anthropic API key

2. **DALL-E Plugin** (or alternative image generator)
   - Install from Community Plugins
   - Configure with your API key

3. **Slides Extended Plugin** - For viewing presentations
   - Install from Community Plugins
   - No configuration needed

## 🔧 Installation

### From Community Plugins (Coming Soon)
1. Open Settings → Community Plugins
2. Search for "Smart Slides"
3. Install and enable

### Manual Installation
1. Download the latest release from GitHub
2. Extract files to `.obsidian/plugins/smart-slides/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

### Development Setup
```bash
# Clone repository
git clone https://github.com/yourusername/obsidian-smart-slides
cd obsidian-smart-slides

# Install dependencies
npm install

# Build plugin
npm run build

# Link to your vault for testing
npm run link-vault /path/to/your/vault

# Development mode with hot reload
npm run dev
```

## 🎯 Usage

### Quick Start

1. **Open Command Palette** (Cmd/Ctrl + P)
2. **Run "Generate Smart Slides"**
3. **Enter your prompt**, for example:
   - "Presentation about AI in healthcare for hospital executives"
   - "Educational slides about climate change for students"
   - "Pitch deck for my startup that makes sustainable packaging"
4. **Wait 30-60 seconds** while AI generates your presentation
5. **Done!** Your presentation opens automatically

### Prompt Tips

#### Be Specific About:
- **Audience**: "for executives", "for students", "for investors"
- **Purpose**: "to educate", "to persuade", "to inform"
- **Length**: "brief 5-slide", "comprehensive 15-slide"
- **Style**: "formal", "casual", "technical"

#### Good Prompts:
✅ "Sales presentation about our new CRM software for enterprise clients, focusing on ROI and integration capabilities"

✅ "Educational presentation about photosynthesis for high school biology students with diagrams and examples"

✅ "Investor pitch for AI-powered food delivery startup, emphasizing market size and traction"

#### Poor Prompts:
❌ "Make slides about computers" (too vague)

❌ "Presentation" (no context)

## ⚙️ Configuration

### Settings

Access via Settings → Plugin Options → Smart Slides

| Setting | Description | Default |
|---------|-------------|---------|
| Text Generator Plugin | Plugin ID for text generation | `obsidian-textgenerator-plugin` |
| Image Generator Plugin | Plugin ID for image generation | `dalle-plugin` |
| Default Slide Count | Number of slides to generate | 10 |
| Language | Default language for content | Polish |
| Image Style | Style for generated images | Photorealistic |
| Output Folder | Where to save presentations | `Presentations` |
| Debug Mode | Enable detailed logging | Off |

## 📁 Output Structure

```
Presentations/
├── 2025-01-09-ai-in-healthcare/
│   ├── slides.md          # Main presentation file
│   └── images/
│       ├── slide-1-title-1.png
│       ├── slide-2-diagram-1.png
│       └── ...
```

## 🎨 Layout Intelligence

The plugin automatically selects layouts based on content:

| Content Type | Layout | Example |
|--------------|--------|---------|
| Title | Grid centered with gradient | Opening slide |
| Comparison | Split even columns | Before vs After |
| Timeline | Grid with animations | Historical progression |
| Data | Large grid with white background | Charts and graphs |
| Lists | Split with wrapping | Multiple bullet points |

## 🤖 How It Works

1. **Local Analysis**: Analyzes your prompt to understand context
2. **LLM Processing**: Generates content structure and text
3. **Layout Engine**: Selects optimal layouts for each slide
4. **Image Generation**: Creates relevant images in parallel
5. **Composition**: Assembles everything into Slides Extended format

## 🐛 Troubleshooting

### "Plugin not found" error
- Ensure Text Generator and Image Generator plugins are installed
- Check plugin IDs in settings match installed plugins

### "API key invalid" error
- Configure API keys in Text Generator plugin settings
- Verify keys are active and have credits

### Images not generating
- Check Image Generator plugin is configured
- Verify API has sufficient credits
- Plugin will continue without images as fallback

### Slow generation
- Normal generation time is 30-60 seconds
- Image generation is the slowest part
- Consider reducing slide count in settings

## 🚧 Limitations

- Requires internet connection for API calls
- API costs apply (OpenAI/DALL-E usage)
- Max 20 slides per presentation
- Some Slides Extended features may not be supported

## 🗺️ Roadmap

- [ ] Multiple language support (beyond PL/EN)
- [ ] Custom templates
- [ ] Batch generation
- [ ] Local LLM support
- [ ] Export to PowerPoint
- [ ] Presentation themes
- [ ] Citation management

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Credits

- Built for [Obsidian](https://obsidian.md)
- Uses [Slides Extended](https://github.com/MSzturc/obsidian-advanced-slides) syntax
- Integrates with [Text Generator](https://github.com/nhaouari/obsidian-textgenerator-plugin)
- Inspired by [Gamma.app](https://gamma.app)

## 💬 Support

- [GitHub Issues](https://github.com/yourusername/obsidian-smart-slides/issues)
- [Discord Community](https://discord.gg/obsidian)
- [Documentation](https://github.com/yourusername/obsidian-smart-slides/wiki)

---

Made with ❤️ for the Obsidian community
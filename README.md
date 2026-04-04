# Title Generator

Generate titles for your [Obsidian](https://obsidian.md) notes using AI.

Supports multiple providers: **OpenAI**, **Google Gemini**, **Anthropic Claude**, **OpenRouter**, **Z.ai**, **Qwen**, and **Kimi**.

Generate titles for one or multiple notes at a time based on their content. Generating a title will set the note's title directly. Run multiple times for variations.

## Three ways to use

### Command Palette

If a note is active in either editing or reading mode, there will be an entry in the command palette: `Title Generator: Generate title`

![Command palette](img/command-palette.png)

### Editor Menu

If a note is active in either editing or reading mode, there will be an entry in the editor dropdown menu: `Generate title`

![Editor menu](img/editor-menu.png)

### File Menu

If you right click on a file name in the file menu there will be an entry in the contextual menu: `Generate title`.

With multiple files selected, right click on a file name and there will be an entry in the contextual menu: `Generate titles`

![File menu](img/file-menu.png)

## Settings

### Provider

Select your AI provider from the dropdown. Each provider requires its own API key.

| Provider | Models | API Key |
|----------|--------|---------|
| [OpenAI](https://platform.openai.com/api-keys) | GPT-5.4 mini, GPT-5.3 Instant | OpenAI API key |
| [Google Gemini](https://aistudio.google.com/apikey) | Gemini 3.1 Flash, Gemini 3.1 Flash Lite | Google AI API key |
| [Anthropic Claude](https://console.anthropic.com/settings/keys) | Claude Sonnet 4.6, Claude Haiku 4.5 | Anthropic API key |
| [OpenRouter](https://openrouter.ai/keys) | Any model (freeform ID) | OpenRouter API key |
| [Z.ai](https://open.bigmodel.cn/) | GLM-4.6, GLM-4.7 Flash | Z.ai API key |
| [Qwen](https://dashscope.console.aliyun.com/) | Qwen3 Max, Qwen3.5 Flash | Qwen API key |
| [Kimi](https://platform.moonshot.cn/) | Kimi K2.5 | Kimi API key |

### Model

Select a model from the dropdown for your chosen provider. OpenRouter allows entering any model ID (e.g. `anthropic/claude-sonnet-4-6`).

### Lower-case titles

Toggle to make all generated titles lower-case.

## Privacy and data

This plugin sends a portion of your note content (up to 10,000 characters) to the selected AI provider's API to generate a title. Your data is processed according to each provider's terms of service.

**Provider locations:**
- US-based: OpenAI, Anthropic, Google, OpenRouter
- China-based: Z.ai (Zhipu AI), Qwen (Alibaba Cloud), Kimi (Moonshot AI)

Choose a provider whose data handling policies meet your requirements.

## Security

API keys are stored in plaintext in Obsidian's `data.json` file within your vault at `.obsidian/plugins/title-generator/data.json`. This is a limitation of the Obsidian plugin platform. Be aware of this if you:

- Sync your vault to a cloud service (iCloud, Dropbox, etc.)
- Back up your vault to a shared location
- Use version control on your vault

Use API keys with minimal permissions and set spending limits where possible.

## Upgrading from v1.x

If you are upgrading from v1.x, your existing OpenAI API key will be preserved automatically. The plugin now defaults to OpenAI, so your setup should continue to work without changes. You can switch to a different provider at any time in settings.

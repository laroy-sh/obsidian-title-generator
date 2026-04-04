import {
  App,
  Editor,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  normalizePath,
  requestUrl,
} from 'obsidian';

// --- Types ---

type Provider =
  | 'openai'
  | 'google'
  | 'anthropic'
  | 'openrouter'
  | 'zai'
  | 'qwen'
  | 'kimi';

type ApiType = 'openai-compat' | 'google' | 'anthropic';

interface ModelOption {
  id: string;
  name: string;
}

interface ProviderConfig {
  name: string;
  baseUrl: string;
  models: ModelOption[];
  apiType: ApiType;
  apiKeyField: keyof TitleGeneratorSettings;
  freeformModel?: boolean;
}

interface TitleGeneratorSettings {
  openAiApiKey: string;
  googleApiKey: string;
  anthropicApiKey: string;
  openRouterApiKey: string;
  zaiApiKey: string;
  qwenApiKey: string;
  kimiApiKey: string;
  provider: Provider;
  model: string;
  openRouterModel: string;
  lowerCaseTitles: boolean;
}

// --- Constants ---

const PROVIDERS: Record<Provider, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-5.4-mini', name: 'GPT-5.4 mini' },
      { id: 'gpt-5.3-chat-latest', name: 'GPT-5.3 Instant' },
    ],
    apiType: 'openai-compat',
    apiKeyField: 'openAiApiKey',
  },
  google: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      { id: 'gemini-3.1-flash', name: 'Gemini 3.1 Flash' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite' },
    ],
    apiType: 'google',
    apiKeyField: 'googleApiKey',
  },
  anthropic: {
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
    ],
    apiType: 'anthropic',
    apiKeyField: 'anthropicApiKey',
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [],
    apiType: 'openai-compat',
    apiKeyField: 'openRouterApiKey',
    freeformModel: true,
  },
  zai: {
    name: 'Z.ai',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    models: [
      { id: 'glm-4.6', name: 'GLM-4.6' },
      { id: 'glm-4.7-flash', name: 'GLM-4.7 Flash' },
    ],
    apiType: 'openai-compat',
    apiKeyField: 'zaiApiKey',
  },
  qwen: {
    name: 'Qwen',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen3-max', name: 'Qwen3 Max' },
      { id: 'qwen3.5-flash', name: 'Qwen3.5 Flash' },
    ],
    apiType: 'openai-compat',
    apiKeyField: 'qwenApiKey',
  },
  kimi: {
    name: 'Kimi',
    baseUrl: 'https://api.moonshot.ai/v1',
    models: [{ id: 'kimi-k2.5', name: 'Kimi K2.5' }],
    apiType: 'openai-compat',
    apiKeyField: 'kimiApiKey',
  },
};

const DEFAULT_SETTINGS: TitleGeneratorSettings = {
  openAiApiKey: '',
  googleApiKey: '',
  anthropicApiKey: '',
  openRouterApiKey: '',
  zaiApiKey: '',
  qwenApiKey: '',
  kimiApiKey: '',
  provider: 'openai',
  model: 'gpt-5.4-mini',
  openRouterModel: '',
  lowerCaseTitles: false,
};

const SYSTEM_PROMPT =
  'You are a title generator. Respond with only the title, nothing else. No quotes, no punctuation at the end.';

const MAX_CONTENT_LENGTH = 10000;

// --- API Functions ---

async function openaiCompatGenerate(
  baseUrl: string,
  apiKey: string,
  model: string,
  content: string
): Promise<string> {
  const response = await requestUrl({
    url: `${baseUrl}/chat/completions`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content },
      ],
    }),
  });
  const text = response.json?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new Error('Unexpected response from provider');
  }
  return text.trim();
}

async function googleGenerate(
  baseUrl: string,
  apiKey: string,
  model: string,
  content: string
): Promise<string> {
  const response = await requestUrl({
    url: `${baseUrl}/models/${encodeURIComponent(model)}:generateContent`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: content }] }],
    }),
  });
  const text = response.json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error(
      'Unexpected response from Google (possibly blocked by safety filter)'
    );
  }
  return text.trim();
}

async function anthropicGenerate(
  baseUrl: string,
  apiKey: string,
  model: string,
  content: string
): Promise<string> {
  const response = await requestUrl({
    url: `${baseUrl}/messages`,
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 100,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    }),
  });
  const text = response.json?.content?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error('Unexpected response from Anthropic');
  }
  return text.trim();
}

async function callProvider(
  provider: ProviderConfig,
  apiKey: string,
  model: string,
  content: string
): Promise<string> {
  const truncated =
    content.length > MAX_CONTENT_LENGTH
      ? content.substring(0, MAX_CONTENT_LENGTH)
      : content;

  switch (provider.apiType) {
    case 'openai-compat':
      return openaiCompatGenerate(provider.baseUrl, apiKey, model, truncated);
    case 'google':
      return googleGenerate(provider.baseUrl, apiKey, model, truncated);
    case 'anthropic':
      return anthropicGenerate(provider.baseUrl, apiKey, model, truncated);
    default:
      throw new Error(`Unsupported API type: ${provider.apiType}`);
  }
}

// --- Settings Tab ---

class TitleGeneratorSettingTab extends PluginSettingTab {
  plugin: TitleGeneratorPlugin;

  constructor(app: App, plugin: TitleGeneratorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const providerConfig = PROVIDERS[this.plugin.settings.provider];

    // Provider dropdown
    new Setting(containerEl).setName('AI provider').addDropdown((dropdown) => {
      const providerKeys = Object.keys(PROVIDERS) as Provider[];
      providerKeys.forEach((key) => {
        dropdown.addOption(key, PROVIDERS[key].name);
      });
      dropdown
        .setValue(this.plugin.settings.provider)
        .onChange(async (value: string) => {
          const newProvider = value as Provider;
          this.plugin.settings.provider = newProvider;
          const newConfig = PROVIDERS[newProvider];
          if (!newConfig.freeformModel && newConfig.models.length > 0) {
            this.plugin.settings.model = newConfig.models[0].id;
          }
          await this.plugin.saveSettings();
          this.display();
        });
    });

    // Model selection
    if (providerConfig.freeformModel) {
      new Setting(containerEl)
        .setName('Model')
        .setDesc('Enter any model ID (e.g. anthropic/claude-sonnet-4-6)')
        .addText((text) => {
          text
            .setPlaceholder('provider/model-name')
            .setValue(this.plugin.settings.openRouterModel)
            .onChange(async (value) => {
              this.plugin.settings.openRouterModel = value;
              await this.plugin.saveSettings();
            });
        });
    } else {
      new Setting(containerEl).setName('Model').addDropdown((dropdown) => {
        providerConfig.models.forEach((m) => {
          dropdown.addOption(m.id, m.name);
        });
        dropdown
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            this.plugin.settings.model = value;
            await this.plugin.saveSettings();
          });
      });
    }

    // API key for the selected provider
    const keyField = providerConfig.apiKeyField;
    new Setting(containerEl)
      .setName(`${providerConfig.name} API key`)
      .addText((text) => {
        text.inputEl.type = 'password';
        text.inputEl.style.width = '100%';
        text
          .setPlaceholder('API Key')
          .setValue(this.plugin.settings[keyField] as string)
          .onChange(async (value) => {
            (this.plugin.settings[keyField] as string) = value;
            await this.plugin.saveSettings();
          });
      });

    // Lower-case titles toggle
    new Setting(containerEl)
      .setName('Lower-case titles')
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.lowerCaseTitles)
          .onChange(async (value) => {
            this.plugin.settings.lowerCaseTitles = value;
            await this.plugin.saveSettings();
          });
      });
  }
}

// --- Plugin ---

export default class TitleGeneratorPlugin extends Plugin {
  settings: TitleGeneratorSettings;

  private statusBarEl: HTMLElement | null = null;

  private async generateTitle(file: TFile, content: string) {
    const providerConfig = PROVIDERS[this.settings.provider];
    const apiKey = this.settings[providerConfig.apiKeyField] as string;

    if (!apiKey) {
      new Notice(
        `Please set your ${providerConfig.name} API key in Title Generator settings.`
      );
      return;
    }

    const model = providerConfig.freeformModel
      ? this.settings.openRouterModel
      : this.settings.model;

    if (!model) {
      new Notice('Please set a model in Title Generator settings.');
      return;
    }

    if (!this.statusBarEl) {
      this.statusBarEl = this.addStatusBarItem();
    }
    this.statusBarEl.setText('Generating title...');

    try {
      let title = await callProvider(providerConfig, apiKey, model, content);

      if (this.settings.lowerCaseTitles) {
        title = title.toLowerCase();
      }

      // Sanitize title for safe use as a filename
      title = title
        .replace(/[/\\?*:|"<>]/g, '')
        .replace(/^\.+|\.+$/g, '')
        .trim();
      if (title.length > 200) title = title.substring(0, 200).trim();
      if (!title) title = 'Untitled';

      const dir = file.parent?.path ?? '';
      const ext = file.extension ? `.${file.extension}` : '';
      let newPath = normalizePath(`${dir}/${title}${ext}`);

      // If a file with that name already exists, append a number
      let counter = 1;
      while (
        this.app.vault.getAbstractFileByPath(newPath) &&
        newPath !== file.path
      ) {
        if (counter > 100) {
          throw new Error(`Could not find a unique filename for "${title}"`);
        }
        newPath = normalizePath(`${dir}/${title} ${counter}${ext}`);
        counter += 1;
      }

      await this.app.fileManager.renameFile(file, newPath);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Title generation failed:', err);
      new Notice(`Unable to generate title: ${message}`);
    } finally {
      if (this.statusBarEl) {
        this.statusBarEl.setText('');
      }
    }
  }

  private async generateTitleFromFile(file: TFile) {
    const content = await file.vault.cachedRead(file);
    return this.generateTitle(file, content);
  }

  private async generateTitleFromEditor(editor: Editor) {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('No active file to generate a title for.');
      return;
    }

    const content = editor.getValue();
    await this.generateTitle(activeFile, content);
  }

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: 'title-generator-generate-title',
      name: 'Generate title',
      editorCallback: (editor) => this.generateTitleFromEditor(editor),
    });

    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (!(file instanceof TFile)) {
          return;
        }

        menu.addItem((item) => {
          item
            .setTitle('Generate title')
            .setIcon('lucide-edit-3')
            .onClick(() => this.generateTitleFromFile(file));
        });
      })
    );

    this.registerEvent(
      this.app.workspace.on('files-menu', (menu, files) => {
        const tFiles = files.filter((f) => f instanceof TFile) as TFile[];
        if (tFiles.length < 1) {
          return;
        }

        menu.addItem((item) => {
          item
            .setTitle('Generate titles')
            .setIcon('lucide-edit-3')
            .onClick(() =>
              tFiles.reduce(
                (chain, f) => chain.then(() => this.generateTitleFromFile(f)),
                Promise.resolve()
              )
            );
        });
      })
    );

    this.addSettingTab(new TitleGeneratorSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
    if (!PROVIDERS[this.settings.provider]) {
      this.settings.provider = DEFAULT_SETTINGS.provider;
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

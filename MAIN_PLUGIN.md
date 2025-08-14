# Główny plugin - main.ts

```typescript
import { 
    App, 
    Plugin, 
    PluginSettingTab, 
    Setting, 
    Notice,
    Modal,
    TextComponent
} from 'obsidian';

import { PresentationOrchestrator } from './core/PresentationOrchestrator';
import { AnalyzerService } from './services/AnalyzerService';
import { LayoutService } from './services/LayoutService';
import { StyleService } from './services/StyleService';
import { SlideComposer } from './generators/SlideComposer';
import { TextGeneratorAdapter } from './integrations/TextGeneratorAdapter';
import { ImageGeneratorAdapter } from './integrations/ImageGeneratorAdapter';
import { DependencyContainer } from './core/DependencyContainer';
import { EventBus, DomainEvent } from './core/EventBus';
import { CacheManager } from './core/CacheManager';
import { CircuitBreaker } from './core/CircuitBreaker';
import { InputValidator } from './utils/InputValidator';

interface SmartSlidesSettings {
    textGeneratorPlugin: string;
    imageGeneratorPlugin: string;
    defaultSlideCount: number;
    defaultLanguage: 'pl' | 'en';
    imageStyle: 'photorealistic' | 'illustration' | 'diagram';
    outputFolder: string;
    debugMode: boolean;
}

const DEFAULT_SETTINGS: SmartSlidesSettings = {
    textGeneratorPlugin: 'text-generator',
    imageGeneratorPlugin: 'dall-e-plugin',
    defaultSlideCount: 10,
    defaultLanguage: 'pl',
    imageStyle: 'photorealistic',
    outputFolder: 'Presentations',
    debugMode: false
}

export default class SmartSlidesPlugin extends Plugin {
    settings: SmartSlidesSettings;
    
    private container: DependencyContainer;
    private orchestrator: PresentationOrchestrator;
    private eventBus: EventBus;
    private cache: CacheManager;
    private circuitBreaker: CircuitBreaker;
    
    async onload() {
        await this.loadSettings();
        
        // Initialize dependency container and components
        this.initializeDependencies();
        
        // Add ribbon icon
        this.addRibbonIcon('presentation', 'Generate Smart Slides', () => {
            this.showPromptModal();
        });
        
        // Add command
        this.addCommand({
            id: 'generate-smart-slides',
            name: 'Generate presentation from prompt',
            callback: () => {
                this.showPromptModal();
            }
        });
        
        // Add settings tab
        this.addSettingTab(new SmartSlidesSettingTab(this.app, this));
        
        // Check dependencies on startup
        this.checkDependencies();
    }
    
    private initializeDependencies() {
        // Initialize core services
        this.eventBus = new EventBus();
        this.cache = new CacheManager();
        this.circuitBreaker = new CircuitBreaker();
        
        // Initialize dependency container
        this.container = new DependencyContainer();
        this.container.register('eventBus', this.eventBus);
        this.container.register('cache', this.cache);
        this.container.register('circuitBreaker', this.circuitBreaker);
        
        // Register services
        this.container.register('analyzerService', new AnalyzerService(this.eventBus));
        this.container.register('layoutService', new LayoutService(this.eventBus));
        this.container.register('styleService', new StyleService(this.eventBus));
        this.container.register('slideComposer', new SlideComposer());
        
        // Initialize adapters with error handling
        try {
            const textGenerator = new TextGeneratorAdapter(
                this.app, 
                this.settings.textGeneratorPlugin,
                this.circuitBreaker
            );
            const imageGenerator = new ImageGeneratorAdapter(
                this.app,
                this.settings.imageGeneratorPlugin,
                this.circuitBreaker
            );
            
            this.container.register('textGenerator', textGenerator);
            this.container.register('imageGenerator', imageGenerator);
            
        } catch (error) {
            console.error('[SmartSlides] Failed to initialize adapters:', error);
            this.eventBus.publish({
                id: crypto.randomUUID(),
                type: 'AdapterInitializationFailed',
                timestamp: new Date(),
                data: { error: error.message }
            });
        }
        
        // Initialize orchestrator
        this.orchestrator = new PresentationOrchestrator(this.container);
    }
    
    private checkDependencies(): boolean {
        const missingPlugins: string[] = [];
        
        if (!this.app.plugins.plugins[this.settings.textGeneratorPlugin]) {
            missingPlugins.push('Text Generator Plugin');
        }
        
        if (!this.app.plugins.plugins[this.settings.imageGeneratorPlugin]) {
            missingPlugins.push('Image Generator Plugin');
        }
        
        if (missingPlugins.length > 0) {
            new Notice(
                `⚠️ Smart Slides wymaga: ${missingPlugins.join(', ')}. ` +
                `Zainstaluj z Community Plugins.`,
                8000
            );
            return false;
        }
        
        return true;
    }
    
    private showPromptModal() {
        new PromptModal(this.app, async (prompt: string) => {
            await this.generatePresentation(prompt);
        }).open();
    }
    
    async generatePresentation(prompt: string) {
        // Validate input
        const validation = InputValidator.validatePrompt(prompt);
        if (!validation.isValid) {
            new Notice(`❌ ${validation.errors[0]}`, 5000);
            return;
        }
        
        // Check dependencies first
        if (!this.checkDependencies()) {
            return;
        }
        
        const progressModal = new ProgressModal(this.app);
        progressModal.open();
        
        try {
            // Publish start event
            this.eventBus.publish({
                id: crypto.randomUUID(),
                type: 'PresentationGenerationStarted',
                timestamp: new Date(),
                data: { prompt: validation.sanitized }
            });
            
            // Use orchestrator for clean separation
            const presentation = await this.orchestrator.createPresentation(
                validation.sanitized,
                this.settings,
                (status: string) => progressModal.setStatus(status)
            );
            
            // Step 6: Save to vault
            progressModal.setStatus('Zapisuję pliki...');
            const filePath = await this.savePresentation(presentation.markdown, presentation.title);
            
            progressModal.close();
            
            // Success notification
            new Notice(`✅ Prezentacja gotowa: ${filePath}`, 5000);
            
            // Publish success event
            this.eventBus.publish({
                id: crypto.randomUUID(),
                type: 'PresentationGenerationCompleted',
                timestamp: new Date(),
                data: { filePath, title: presentation.title }
            });
            
            // Open the file
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (file) {
                await this.app.workspace.getLeaf().openFile(file);
            }
            
        } catch (error) {
            this.handleGenerationError(error, progressModal);
        }
    }
    
    private handleGenerationError(error: unknown, progressModal: ProgressModal) {
        progressModal.close();
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[SmartSlides] Generation failed:', errorMessage);
        
        // Publish error event
        this.eventBus.publish({
            id: crypto.randomUUID(),
            type: 'PresentationGenerationFailed',
            timestamp: new Date(),
            data: { error: errorMessage }
        });
        
        new Notice(`❌ Błąd generowania: ${errorMessage}`, 8000);
    }
    
    private async savePresentation(markdown: string, title: string): Promise<string> {
        const timestamp = new Date().toISOString().slice(0, 10);
        const safeTitle = InputValidator.sanitizeFileName(title);
        const folderPath = `${this.settings.outputFolder}/${timestamp}-${safeTitle}`;
        const filePath = `${folderPath}/slides.md`;
        
        // Create folder if it doesn't exist
        if (!await this.app.vault.adapter.exists(folderPath)) {
            await this.app.vault.createFolder(folderPath);
        }
        
        // Create images subfolder
        const imagesFolderPath = `${folderPath}/images`;
        if (!await this.app.vault.adapter.exists(imagesFolderPath)) {
            await this.app.vault.createFolder(imagesFolderPath);
        }
        
        // Save the markdown file
        await this.app.vault.create(filePath, markdown);
        
        return filePath;
    }
    
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    
    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class PromptModal extends Modal {
    private onSubmit: (prompt: string) => void;
    
    constructor(app: App, onSubmit: (prompt: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }
    
    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'Smart Slides Generator' });
        
        contentEl.createEl('p', { 
            text: 'Opisz o czym ma być prezentacja:',
            cls: 'smart-slides-description'
        });
        
        const inputContainer = contentEl.createDiv('smart-slides-input-container');
        
        const textArea = inputContainer.createEl('textarea', {
            placeholder: 'np. "Prezentacja o sztucznej inteligencji w medycynie dla studentów"',
            cls: 'smart-slides-prompt-input'
        });
        textArea.rows = 4;
        
        const buttonContainer = contentEl.createDiv('smart-slides-button-container');
        
        const cancelButton = buttonContainer.createEl('button', { 
            text: 'Anuluj',
            cls: 'smart-slides-button-secondary'
        });
        cancelButton.onclick = () => this.close();
        
        const generateButton = buttonContainer.createEl('button', { 
            text: '✨ Generuj prezentację',
            cls: 'smart-slides-button-primary'
        });
        generateButton.onclick = () => {
            const prompt = textArea.value.trim();
            if (prompt.length < 10) {
                new Notice('Prompt musi mieć minimum 10 znaków');
                return;
            }
            this.close();
            this.onSubmit(prompt);
        };
        
        // Focus on textarea
        textArea.focus();
        
        // Submit on Ctrl+Enter
        textArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                generateButton.click();
            }
        });
    }
    
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class ProgressModal extends Modal {
    private statusEl: HTMLElement;
    
    onOpen() {
        const { contentEl } = this;
        
        contentEl.createEl('h2', { text: 'Generowanie prezentacji' });
        
        this.statusEl = contentEl.createEl('p', {
            text: 'Inicjalizacja...',
            cls: 'smart-slides-status'
        });
        
        // Add spinner
        contentEl.createDiv('smart-slides-spinner');
        
        // Prevent closing by clicking outside
        this.modalEl.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    setStatus(status: string) {
        if (this.statusEl) {
            this.statusEl.setText(status);
        }
    }
    
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class SmartSlidesSettingTab extends PluginSettingTab {
    plugin: SmartSlidesPlugin;
    
    constructor(app: App, plugin: SmartSlidesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    
    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        
        containerEl.createEl('h2', { text: 'Smart Slides - Ustawienia' });
        
        // Text Generator Plugin
        new Setting(containerEl)
            .setName('Text Generator Plugin')
            .setDesc('ID pluginu do generowania tekstu')
            .addText(text => text
                .setPlaceholder('obsidian-textgenerator-plugin')
                .setValue(this.plugin.settings.textGeneratorPlugin)
                .onChange(async (value) => {
                    this.plugin.settings.textGeneratorPlugin = value;
                    await this.plugin.saveSettings();
                }));
        
        // Image Generator Plugin
        new Setting(containerEl)
            .setName('Image Generator Plugin')
            .setDesc('ID pluginu do generowania obrazów')
            .addText(text => text
                .setPlaceholder('dalle-plugin')
                .setValue(this.plugin.settings.imageGeneratorPlugin)
                .onChange(async (value) => {
                    this.plugin.settings.imageGeneratorPlugin = value;
                    await this.plugin.saveSettings();
                }));
        
        // Default slide count
        new Setting(containerEl)
            .setName('Domyślna liczba slajdów')
            .setDesc('Ile slajdów generować domyślnie')
            .addSlider(slider => slider
                .setLimits(6, 20, 1)
                .setValue(this.plugin.settings.defaultSlideCount)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.defaultSlideCount = value;
                    await this.plugin.saveSettings();
                }));
        
        // Language
        new Setting(containerEl)
            .setName('Język')
            .setDesc('Domyślny język prezentacji')
            .addDropdown(dropdown => dropdown
                .addOption('pl', 'Polski')
                .addOption('en', 'English')
                .setValue(this.plugin.settings.defaultLanguage)
                .onChange(async (value: 'pl' | 'en') => {
                    this.plugin.settings.defaultLanguage = value;
                    await this.plugin.saveSettings();
                }));
        
        // Image style
        new Setting(containerEl)
            .setName('Styl obrazów')
            .setDesc('Domyślny styl generowanych obrazów')
            .addDropdown(dropdown => dropdown
                .addOption('photorealistic', 'Fotorealistyczny')
                .addOption('illustration', 'Ilustracja')
                .addOption('diagram', 'Diagram')
                .setValue(this.plugin.settings.imageStyle)
                .onChange(async (value: any) => {
                    this.plugin.settings.imageStyle = value;
                    await this.plugin.saveSettings();
                }));
        
        // Output folder
        new Setting(containerEl)
            .setName('Folder wyjściowy')
            .setDesc('Gdzie zapisywać prezentacje')
            .addText(text => text
                .setPlaceholder('Presentations')
                .setValue(this.plugin.settings.outputFolder)
                .onChange(async (value) => {
                    this.plugin.settings.outputFolder = value;
                    await this.plugin.saveSettings();
                }));
        
        // Debug mode
        new Setting(containerEl)
            .setName('Tryb debugowania')
            .setDesc('Włącz szczegółowe logi w konsoli')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.saveSettings();
                }));
    }
}
```
# Code Quality Standards & Style Guidelines

## 🎯 **Objective**
This document establishes comprehensive coding standards and style guidelines for the Obsidian Smart Slides Plugin, ensuring consistent, maintainable, and high-quality code across all contributors.

## 📋 **Language & Framework Standards**

### **TypeScript Standards**
```typescript
// ✅ GOOD: Strict typing with interfaces
interface PresentationConfig {
    readonly theme: string;
    readonly slideCount: number;
    readonly audience: 'students' | 'executives' | 'technical' | 'general';
    readonly options?: Partial<PresentationOptions>;
}

// ❌ BAD: Any types and loose interfaces
interface Config {
    theme: any;
    slides: number;
    audience: string;
    opts: any;
}
```

**Required TypeScript Configuration:**
- **Strict Mode:** `"strict": true` in tsconfig.json
- **No Implicit Any:** All variables must have explicit types
- **Null Safety:** Use `strictNullChecks: true`
- **No Unused Variables:** Enable `noUnusedLocals` and `noUnusedParameters`

---

## 🔌 **Obsidian Plugin Development Patterns**

### **Plugin Lifecycle Management**
```typescript
// ✅ GOOD: Proper plugin lifecycle with cleanup
export default class SmartSlidesPlugin extends Plugin {
    private orchestrator: PresentationOrchestrator;
    private container: DependencyContainer;
    private eventBusCleanup: (() => void)[] = [];

    async onload(): Promise<void> {
        // Initialize dependency container
        this.container = new DependencyContainer();
        await this.initializeServices();
        
        // Register commands and UI elements
        this.registerCommands();
        this.setupEventListeners();
        
        // Load user settings
        await this.loadSettings();
    }

    async onunload(): Promise<void> {
        // CRITICAL: Proper cleanup prevents memory leaks
        this.eventBusCleanup.forEach(cleanup => cleanup());
        await this.orchestrator?.dispose();
        this.container?.dispose();
        
        // Clean up UI elements
        this.removeStatusBarItems();
        this.closeModals();
    }
}

// ❌ BAD: Missing cleanup in onunload
export default class SmartSlidesPlugin extends Plugin {
    async onload(): Promise<void> {
        // Setup without cleanup planning
        new PresentationOrchestrator(); // Memory leak risk
    }
    
    // Missing onunload() method
}
```

### **Settings Management Patterns**
```typescript
// ✅ GOOD: Versioned settings with migration
interface PluginSettings {
    version: string;
    theme: string;
    apiKeys: Record<string, string>;
    performance: PerformanceSettings;
}

interface PerformanceSettings {
    maxConcurrentRequests: number;
    timeoutMs: number;
    cacheEnabled: boolean;
}

class SettingsManager {
    async loadSettings(): Promise<PluginSettings> {
        const data = await this.plugin.loadData();
        return this.migrateSettings(data || this.getDefaultSettings());
    }
    
    private migrateSettings(settings: any): PluginSettings {
        // Handle settings schema migrations
        if (settings.version === '1.0.0') {
            settings.performance = { ...DEFAULT_PERFORMANCE_SETTINGS };
            settings.version = '1.1.0';
        }
        return settings;
    }
}
```

### **Vault Operations Best Practices**
```typescript
// ✅ GOOD: Safe file operations with error handling
class VaultOperations {
    async createPresentationFile(
        content: string, 
        fileName: string
    ): Promise<Result<TFile>> {
        try {
            // Validate file path within vault
            const sanitizedPath = this.sanitizeFilePath(fileName);
            if (!this.isWithinVault(sanitizedPath)) {
                return { 
                    success: false, 
                    error: new Error('Path outside vault boundary') 
                };
            }
            
            // Atomic file creation
            const file = await this.app.vault.create(sanitizedPath, content);
            return { success: true, data: file };
            
        } catch (error) {
            if (error.message.includes('already exists')) {
                return this.handleFileConflict(fileName, content);
            }
            return { success: false, error: error as Error };
        }
    }
}
```

### **UI Component Standards**
```typescript
// ✅ GOOD: Accessible modal with proper focus management
class PromptModal extends Modal {
    constructor(app: App, private onSubmit: (prompt: string) => void) {
        super(app);
    }
    
    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        
        // Proper heading hierarchy for screen readers
        contentEl.createEl('h2', { text: 'Create Smart Slides' });
        
        const form = contentEl.createEl('form');
        const textarea = form.createEl('textarea', {
            attr: {
                placeholder: 'Enter your presentation topic...',
                'aria-label': 'Presentation topic',
                rows: '5'
            }
        });
        
        // Focus management
        textarea.focus();
        
        // Keyboard navigation
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.onSubmit(textarea.value);
            this.close();
        });
    }
}
```

---

## 🏗️ **Architecture Patterns**

### **Clean Architecture Layers**
```
┌─────────────────────────────────────┐
│         UI Layer (Obsidian)         │
├─────────────────────────────────────┤
│      Application Layer (Services)   │
├─────────────────────────────────────┤
│       Domain Layer (Core Logic)     │
├─────────────────────────────────────┤
│    Infrastructure (External APIs)   │
└─────────────────────────────────────┘
```

**Layer Dependency Rules:**
- UI → Application → Domain → Infrastructure
- No reverse dependencies allowed
- Domain layer must be framework-agnostic
- Infrastructure depends only on interfaces

### **SOLID Principles Implementation**

#### **Single Responsibility Principle**
```typescript
// ✅ GOOD: Single responsibility
class ContentAnalyzer {
    analyze(prompt: string): ContentAnalysis {
        return this.performAnalysis(prompt);
    }
}

class ThemeSelector {
    selectTheme(analysis: ContentAnalysis): string {
        return this.determineOptimalTheme(analysis);
    }
}

// ❌ BAD: Multiple responsibilities
class ContentProcessor {
    analyze(prompt: string): ContentAnalysis { /* ... */ }
    selectTheme(analysis: ContentAnalysis): string { /* ... */ }
    generateSlides(content: string): Slide[] { /* ... */ }
    saveToFile(slides: Slide[]): void { /* ... */ }
}
```

#### **Open/Closed Principle**
```typescript
// ✅ GOOD: Extensible through interfaces
interface LayoutStrategy {
    selectLayout(content: SlideContent): LayoutDecision;
}

class TitleLayoutStrategy implements LayoutStrategy {
    selectLayout(content: SlideContent): LayoutDecision {
        // Title-specific layout logic
    }
}

class ComparisonLayoutStrategy implements LayoutStrategy {
    selectLayout(content: SlideContent): LayoutDecision {
        // Comparison-specific layout logic
    }
}
```

#### **Dependency Injection**
```typescript
// ✅ GOOD: Constructor injection with interfaces
class PresentationOrchestrator {
    constructor(
        private readonly analyzer: ContentAnalyzer,
        private readonly layoutService: LayoutService,
        private readonly styleService: StyleService,
        private readonly eventBus: EventBus
    ) {}
}

// ❌ BAD: Direct instantiation
class PresentationOrchestrator {
    private analyzer = new ContentAnalyzer();
    private layoutService = new LayoutService();
    // Creates tight coupling
}
```

---

## 🎨 **Code Style Guidelines**

### **Naming Conventions**

#### **Classes and Interfaces**
```typescript
// ✅ GOOD: PascalCase for classes and interfaces
class EventBus {}
interface ContentAnalysis {}
abstract class BaseAdapter {}

// ❌ BAD: Inconsistent casing
class eventBus {}
interface contentAnalysis {}
class base_adapter {}
```

#### **Variables and Functions**
```typescript
// ✅ GOOD: camelCase with descriptive names
const suggestedSlideCount = 12;
const isComparisonContent = content.type === 'comparison';
function calculateFormality(prompt: string): number {}

// ❌ BAD: Non-descriptive or inconsistent naming
const cnt = 12;
const is_comp = true;
function calc(p: string): number {}
```

#### **Constants**
```typescript
// ✅ GOOD: SCREAMING_SNAKE_CASE for constants
const MAX_SLIDE_COUNT = 20;
const DEFAULT_THEME = 'night';
const API_TIMEOUT_MS = 5000;

// ❌ BAD: Mixed case for constants
const maxSlideCount = 20;
const Default_Theme = 'night';
```

### **Function Design Patterns**

#### **Pure Functions (Preferred)**
```typescript
// ✅ GOOD: Pure function - predictable output
function calculateFormality(prompt: string, patterns: FormalityPattern[]): number {
    let score = 5;
    patterns.forEach(pattern => {
        if (pattern.regex.test(prompt)) {
            score += pattern.weight;
        }
    });
    return Math.max(1, Math.min(10, score));
}

// ❌ BAD: Impure function - side effects
function calculateFormality(prompt: string): number {
    this.lastPrompt = prompt; // Side effect
    console.log('Analyzing:', prompt); // Side effect
    return Math.random() * 10; // Non-deterministic
}
```

#### **Error Handling**
```typescript
// ✅ GOOD: Explicit error handling with Result types
type Result<T, E = Error> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};

async function analyzeContent(prompt: string): Promise<Result<ContentAnalysis>> {
    try {
        const analysis = await performAnalysis(prompt);
        return { success: true, data: analysis };
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error : new Error('Unknown error')
        };
    }
}

// ❌ BAD: Swallowing errors or unclear error handling
async function analyzeContent(prompt: string): Promise<ContentAnalysis> {
    try {
        return await performAnalysis(prompt);
    } catch {
        return getDefaultAnalysis(); // Error information lost
    }
}
```

---

## ✅ **Testing Standards**

### **Test Structure (AAA Pattern)**
```typescript
// ✅ GOOD: Arrange-Act-Assert pattern
describe('ContentAnalyzer', () => {
    it('should detect executive audience from business keywords', () => {
        // Arrange
        const analyzer = new ContentAnalyzer(mockEventBus);
        const prompt = 'Board meeting presentation for CEO and executives';
        
        // Act
        const analysis = await analyzer.analyze(prompt);
        
        // Assert
        expect(analysis.audience).toBe('executives');
        expect(analysis.formality).toBeGreaterThan(7);
    });
});
```

### **Test Coverage Requirements**
- **Unit Tests:** >80% coverage (critical paths >95%)
- **Integration Tests:** >70% coverage
- **E2E Tests:** All critical user workflows
- **Performance Tests:** All services with <100ms response time

### **Mock Guidelines**
```typescript
// ✅ GOOD: Interface-based mocking
const mockEventBus: jest.Mocked<EventBus> = {
    publish: jest.fn(),
    publishTyped: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
};

// ❌ BAD: Implementation-specific mocking
const mockEventBus = {
    someInternalMethod: jest.fn() // Testing implementation details
};
```

---

## 🛡️ **Security Standards**

### **Input Validation**
```typescript
// ✅ GOOD: Comprehensive input validation
function validatePromptInput(input: string): Result<string> {
    if (!input || typeof input !== 'string') {
        return { success: false, error: new Error('Input must be a non-empty string') };
    }
    
    if (input.length > MAX_PROMPT_LENGTH) {
        return { success: false, error: new Error('Input exceeds maximum length') };
    }
    
    // Sanitize HTML and potential XSS
    const sanitized = input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .trim();
    
    return { success: true, data: sanitized };
}
```

### **XSS Prevention**
```typescript
// ✅ GOOD: Proper escaping for markdown output
function escapeMarkdown(text: string): string {
    return text
        .replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ❌ BAD: Direct string interpolation
function generateSlide(title: string): string {
    return `# ${title}`; // Potential XSS if title contains malicious content
}
```

---

## 📊 **Performance Standards**

### **Async/Await Best Practices**
```typescript
// ✅ GOOD: Parallel processing for independent operations
async function generatePresentation(prompt: string): Promise<Presentation> {
    const analysis = await analyzer.analyze(prompt);
    
    // Process slides in parallel
    const slidePromises = analysis.suggestedSlides.map(slideData => 
        this.generateSlide(slideData)
    );
    const slides = await Promise.all(slidePromises);
    
    return { analysis, slides };
}

// ❌ BAD: Sequential processing of independent operations
async function generatePresentation(prompt: string): Promise<Presentation> {
    const analysis = await analyzer.analyze(prompt);
    const slides: Slide[] = [];
    
    for (const slideData of analysis.suggestedSlides) {
        const slide = await this.generateSlide(slideData); // Blocks subsequent iterations
        slides.push(slide);
    }
    
    return { analysis, slides };
}
```

### **Memory Management**
```typescript
// ✅ GOOD: Proper cleanup and resource management
class CacheManager {
    private cache = new Map<string, CacheEntry>();
    private cleanupTimer: NodeJS.Timer;
    
    constructor() {
        // Automatic cleanup every 5 minutes
        this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
    
    dispose(): void {
        clearInterval(this.cleanupTimer);
        this.cache.clear();
    }
}
```

---

## 🔧 **Tool Configuration**

### **ESLint Configuration** (`.eslintrc.js`)
```javascript
module.exports = {
    extends: [
        '@typescript-eslint/recommended',
        '@typescript-eslint/recommended-requiring-type-checking'
    ],
    rules: {
        '@typescript-eslint/no-any': 'error',
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-unused-vars': 'error',
        'complexity': ['error', 10],
        'max-lines-per-function': ['error', 50],
        'max-depth': ['error', 4]
    }
};
```

### **Prettier Configuration** (`.prettierrc`)
```json
{
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "printWidth": 100,
    "tabWidth": 4,
    "useTabs": false
}
```

### **Pre-commit Hooks**
```bash
#!/bin/sh
# .husky/pre-commit
npm run lint
npm run format
npm run test:unit
npm run security:scan
```

---

## 📝 **Documentation Standards**

### **TSDoc Comments**
```typescript
/**
 * Analyzes content prompt to determine audience, formality, and domain characteristics.
 * 
 * @param prompt - The input text to analyze (max 10,000 characters)
 * @returns Promise resolving to comprehensive content analysis
 * @throws {ValidationError} When prompt is empty or exceeds length limits
 * @throws {AnalysisError} When analysis fails due to processing issues
 * 
 * @example
 * ```typescript
 * const analyzer = new ContentAnalyzer(eventBus);
 * const analysis = await analyzer.analyze('Create a tech presentation for developers');
 * console.log(analysis.audience); // 'technical'
 * ```
 */
async analyze(prompt: string): Promise<ContentAnalysis> {
    // Implementation
}
```

### **README Structure Requirements**
- **Installation instructions** with prerequisites
- **Quick start guide** with minimal example
- **API documentation** with all public methods
- **Configuration options** with examples
- **Troubleshooting section** with common issues

---

## ⚡ **Performance Benchmarks**

### **Response Time Targets**
- **Content Analysis:** <100ms for typical prompts
- **Layout Selection:** <50ms per slide
- **Theme Selection:** <25ms per analysis
- **Full Presentation Generation:** <30 seconds for 15 slides

### **Memory Usage Limits**
- **Plugin Bundle Size:** <300KB
- **Runtime Memory:** <50MB during generation
- **Cache Memory:** <10MB maximum
- **Memory Leak Detection:** 0 leaks in 1000+ generations

---

## 🏷️ **Code Review Checklist**

### **Before Submitting PR:**
- [ ] All new code has unit tests (>80% coverage)
- [ ] TypeScript strict mode passes without errors
- [ ] ESLint and Prettier formatting applied
- [ ] No security vulnerabilities in dependencies
- [ ] Performance benchmarks meet requirements
- [ ] Documentation updated for public APIs
- [ ] Self-review completed with focus on edge cases

### **During Code Review:**
- [ ] **Architecture:** Follows Clean Architecture layers
- [ ] **SOLID Principles:** No violations detected
- [ ] **Security:** Input validation and XSS prevention
- [ ] **Performance:** No obvious bottlenecks or memory leaks
- [ ] **Testability:** Code is easy to test and mock
- [ ] **Readability:** Code is self-documenting and clear
- [ ] **Error Handling:** All error scenarios handled gracefully

---

## 🎯 **Quality Metrics Automation**

### **CI/CD Pipeline Checks:**
```yaml
# .github/workflows/quality-check.yml
- name: Code Quality Checks
  run: |
    npm run lint -- --max-warnings 0
    npm run test:coverage -- --threshold 80
    npm run security:audit
    npm run performance:benchmark
```

### **Automated Quality Reports:**
- **Daily:** Code coverage trends and quality metrics
- **Weekly:** Technical debt analysis and refactoring suggestions
- **Monthly:** Security vulnerability assessment and dependency updates

---

## 📈 **Continuous Improvement**

### **Code Quality Metrics Tracking:**
- **Cyclomatic Complexity:** Track per function/class
- **Test Coverage:** Monitor trends and coverage gaps
- **Technical Debt:** Measure and plan reduction
- **Code Duplication:** Identify and consolidate

### **Team Knowledge Sharing:**
- **Weekly:** Code review insights and pattern discussions
- **Monthly:** Architecture decision reviews and lessons learned
- **Quarterly:** Standards review and best practices updates

---

## ✅ **Validation Checklist**

- [ ] TypeScript strict mode configuration verified
- [ ] ESLint and Prettier rules enforced automatically
- [ ] Pre-commit hooks prevent non-compliant code
- [ ] CI/CD pipeline validates all quality standards
- [ ] Documentation generated automatically from code
- [ ] Security scanning integrated into development workflow
- [ ] Performance benchmarks monitored continuously
- [ ] Code review process includes quality checklist

---

## 🚨 **Emergency Procedures**

### **Plugin Crash Recovery**
```typescript
// Global error handler for unhandled plugin errors
class ErrorRecoveryManager {
    static setupGlobalErrorHandling(plugin: Plugin): void {
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection in Smart Slides:', event.reason);
            // Graceful degradation - disable plugin features
            this.enterSafeMode(plugin);
        });
        
        window.addEventListener('error', (event) => {
            if (event.error?.stack?.includes('smart-slides')) {
                console.error('Smart Slides plugin error:', event.error);
                this.enterSafeMode(plugin);
            }
        });
    }
    
    private static enterSafeMode(plugin: Plugin): void {
        // Disable all plugin features
        // Show user-friendly error notice
        // Log diagnostic information
    }
}
```

### **Long-Running Operation Cancellation**
```typescript
// Cancellable operation pattern
class CancellableOperation {
    private abortController = new AbortController();
    
    async generateWithCancellation(
        prompt: string
    ): Promise<Result<Presentation>> {
        try {
            const analysis = await this.analyzer.analyze(
                prompt, 
                { signal: this.abortController.signal }
            );
            
            if (this.abortController.signal.aborted) {
                return { success: false, error: new Error('Operation cancelled') };
            }
            
            // Continue with other operations...
            
        } catch (error) {
            if (error.name === 'AbortError') {
                return { success: false, error: new Error('Operation cancelled by user') };
            }
            throw error;
        }
    }
    
    cancel(): void {
        this.abortController.abort();
    }
}
```

**Last Updated:** 2025-08-14
**Owner:** Tech Lead & Development Team
**Review Frequency:** Quarterly (or when major patterns emerge)
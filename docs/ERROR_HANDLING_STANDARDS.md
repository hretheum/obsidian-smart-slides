# Error Handling & Logging Standards

## 🎯 **Objective**
This document establishes comprehensive error handling and logging standards for the Obsidian Smart Slides Plugin, ensuring consistent error management, actionable user feedback, and effective debugging support across all components.

## 🚨 **Error Classification Framework**

### **Error Severity Levels**

#### **Error Type Taxonomy**
```typescript
enum ErrorSeverity {
    CRITICAL = 'critical',     // Plugin/system failure, data loss risk
    HIGH = 'high',            // Major feature broken, user cannot proceed  
    MEDIUM = 'medium',        // Feature limitation, user can work around
    LOW = 'low',              // Minor issue, cosmetic problems
    INFO = 'info'             // Informational, no user impact
}

enum ErrorCategory {
    // System-level errors
    INITIALIZATION = 'initialization',
    CONFIGURATION = 'configuration', 
    DEPENDENCY = 'dependency',
    
    // User input errors
    VALIDATION = 'validation',
    PERMISSION = 'permission',
    AUTHENTICATION = 'authentication',
    
    // External service errors  
    NETWORK = 'network',
    API = 'api',
    TIMEOUT = 'timeout',
    RATE_LIMIT = 'rate-limit',
    
    // Data handling errors
    PARSING = 'parsing',
    SERIALIZATION = 'serialization',
    FILE_OPERATION = 'file-operation',
    
    // Business logic errors
    GENERATION = 'generation',
    ANALYSIS = 'analysis',
    RENDERING = 'rendering',
    
    // Infrastructure errors
    MEMORY = 'memory',
    PERFORMANCE = 'performance',
    CONCURRENCY = 'concurrency'
}
```

### **Structured Error Model**

#### **Base Error Interface**
```typescript
interface BaseError extends Error {
    readonly id: string;                    // Unique error identifier
    readonly timestamp: Date;               // When error occurred
    readonly severity: ErrorSeverity;       // Error severity level
    readonly category: ErrorCategory;       // Error category
    readonly component: string;             // Component where error originated
    readonly operation: string;             // Operation being performed
    readonly userMessage: string;           // User-friendly error message
    readonly technicalMessage: string;      // Technical details for logging
    readonly recoverable: boolean;          // Whether error can be recovered from
    readonly retryable: boolean;           // Whether operation can be retried
    readonly context: ErrorContext;        // Additional context information
    readonly stack: string;                // Stack trace
    readonly cause?: Error;                // Root cause error
}

interface ErrorContext {
    userId?: string;                       // User identifier (if applicable)
    sessionId: string;                     // Session identifier
    requestId?: string;                    // Request identifier for tracing
    pluginVersion: string;                 // Plugin version
    obsidianVersion: string;              // Obsidian version
    operationId?: string;                 // Operation tracking ID
    additionalData?: Record<string, any>; // Context-specific data
}
```

#### **Custom Error Classes**
```typescript
// Base application error
class SmartSlidesError extends Error implements BaseError {
    readonly id: string;
    readonly timestamp: Date;
    readonly severity: ErrorSeverity;
    readonly category: ErrorCategory;
    readonly component: string;
    readonly operation: string;
    readonly userMessage: string;
    readonly technicalMessage: string;
    readonly recoverable: boolean;
    readonly retryable: boolean;
    readonly context: ErrorContext;
    readonly cause?: Error;
    
    constructor(params: ErrorParams) {
        super(params.technicalMessage);
        this.name = 'SmartSlidesError';
        this.id = params.id || crypto.randomUUID();
        this.timestamp = new Date();
        this.severity = params.severity;
        this.category = params.category;
        this.component = params.component;
        this.operation = params.operation;
        this.userMessage = params.userMessage;
        this.technicalMessage = params.technicalMessage;
        this.recoverable = params.recoverable ?? false;
        this.retryable = params.retryable ?? false;
        this.context = this.buildContext(params.context);
        this.cause = params.cause;
        
        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SmartSlidesError);
        }
    }
    
    private buildContext(context: Partial<ErrorContext> = {}): ErrorContext {
        return {
            sessionId: this.generateSessionId(),
            pluginVersion: '1.0.0', // TODO: Get from manifest
            obsidianVersion: '0.15.0', // TODO: Get from app
            ...context
        };
    }
    
    toJSON(): object {
        return {
            id: this.id,
            name: this.name,
            message: this.technicalMessage,
            userMessage: this.userMessage,
            severity: this.severity,
            category: this.category,
            component: this.component,
            operation: this.operation,
            timestamp: this.timestamp.toISOString(),
            recoverable: this.recoverable,
            retryable: this.retryable,
            context: this.context,
            stack: this.stack,
            cause: this.cause?.message
        };
    }
}

// Validation specific error
class ValidationError extends SmartSlidesError {
    readonly field?: string;
    readonly value?: any;
    readonly constraint?: string;
    
    constructor(params: ValidationErrorParams) {
        super({
            ...params,
            category: ErrorCategory.VALIDATION,
            severity: params.severity || ErrorSeverity.MEDIUM
        });
        this.name = 'ValidationError';
        this.field = params.field;
        this.value = params.value;
        this.constraint = params.constraint;
    }
}

// Network/API specific error
class ApiError extends SmartSlidesError {
    readonly statusCode?: number;
    readonly endpoint?: string;
    readonly requestId?: string;
    readonly responseBody?: any;
    
    constructor(params: ApiErrorParams) {
        super({
            ...params,
            category: ErrorCategory.API,
            severity: params.severity || ErrorSeverity.HIGH,
            retryable: params.retryable ?? true
        });
        this.name = 'ApiError';
        this.statusCode = params.statusCode;
        this.endpoint = params.endpoint;
        this.requestId = params.requestId;
        this.responseBody = params.responseBody;
    }
}

// Generation specific error
class GenerationError extends SmartSlidesError {
    readonly step?: string;
    readonly inputData?: any;
    readonly partialResult?: any;
    
    constructor(params: GenerationErrorParams) {
        super({
            ...params,
            category: ErrorCategory.GENERATION,
            severity: params.severity || ErrorSeverity.HIGH,
            recoverable: params.recoverable ?? true
        });
        this.name = 'GenerationError';
        this.step = params.step;
        this.inputData = params.inputData;
        this.partialResult = params.partialResult;
    }
}
```

---

## 📊 **Logging Framework**

### **Structured Logging System**

#### **Log Level Hierarchy**
```typescript
enum LogLevel {
    TRACE = 0,    // Detailed execution flow
    DEBUG = 1,    // Debug information for development
    INFO = 2,     // General information about operations
    WARN = 3,     // Warning conditions that might need attention
    ERROR = 4,    // Error conditions that need immediate attention
    FATAL = 5     // Critical errors that may cause plugin to fail
}

interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    logger: string;              // Logger name/component
    message: string;             // Log message
    context: LogContext;         // Structured context
    metadata?: LogMetadata;      // Additional structured data
    error?: BaseError;          // Associated error object
    correlationId?: string;      // For tracing across operations
    userId?: string;            // User identifier (if applicable)
    sessionId: string;          // Session identifier
}

interface LogContext {
    component: string;           // Component generating log
    operation: string;           // Operation being logged
    operationId?: string;        // Unique operation identifier
    parentOperationId?: string;  // Parent operation for nesting
    duration?: number;           // Operation duration in ms
    success?: boolean;          // Operation success status
}
```

#### **Logger Implementation**
```typescript
class Logger {
    private readonly loggers = new Map<string, ComponentLogger>();
    private readonly config: LoggingConfig;
    private readonly outputs: LogOutput[] = [];
    
    constructor(config: LoggingConfig) {
        this.config = config;
        this.initializeOutputs();
    }
    
    getLogger(component: string): ComponentLogger {
        if (!this.loggers.has(component)) {
            this.loggers.set(component, new ComponentLogger(component, this));
        }
        return this.loggers.get(component)!;
    }
    
    async log(entry: LogEntry): Promise<void> {
        // Filter by log level
        if (entry.level < this.config.level) {
            return;
        }
        
        // Apply filters
        if (!this.shouldLog(entry)) {
            return;
        }
        
        // Enhance with additional context
        const enhancedEntry = await this.enhanceLogEntry(entry);
        
        // Output to all configured outputs
        await Promise.all(
            this.outputs.map(output => output.write(enhancedEntry))
        );
        
        // Handle special cases
        await this.handleSpecialCases(enhancedEntry);
    }
    
    private shouldLog(entry: LogEntry): boolean {
        // Check component filters
        if (this.config.componentFilters?.length) {
            const allowed = this.config.componentFilters.some(filter =>
                entry.logger.startsWith(filter)
            );
            if (!allowed) return false;
        }
        
        // Check error filters
        if (entry.error && this.config.errorFilters?.length) {
            const allowed = this.config.errorFilters.includes(entry.error.category);
            if (!allowed) return false;
        }
        
        // Rate limiting for high-frequency logs
        return this.checkRateLimit(entry);
    }
    
    private async handleSpecialCases(entry: LogEntry): Promise<void> {
        // Auto-report critical errors
        if (entry.level === LogLevel.FATAL || 
            (entry.error && entry.error.severity === ErrorSeverity.CRITICAL)) {
            await this.reportCriticalError(entry);
        }
        
        // Performance monitoring
        if (entry.context.duration && entry.context.duration > 1000) {
            await this.reportSlowOperation(entry);
        }
        
        // Security monitoring
        if (entry.error && this.isSecurityRelated(entry.error)) {
            await this.reportSecurityEvent(entry);
        }
    }
}

class ComponentLogger {
    constructor(
        private component: string, 
        private parentLogger: Logger
    ) {}
    
    trace(message: string, context: Partial<LogContext> = {}, metadata?: LogMetadata): void {
        this.log(LogLevel.TRACE, message, context, metadata);
    }
    
    debug(message: string, context: Partial<LogContext> = {}, metadata?: LogMetadata): void {
        this.log(LogLevel.DEBUG, message, context, metadata);
    }
    
    info(message: string, context: Partial<LogContext> = {}, metadata?: LogMetadata): void {
        this.log(LogLevel.INFO, message, context, metadata);
    }
    
    warn(message: string, context: Partial<LogContext> = {}, metadata?: LogMetadata): void {
        this.log(LogLevel.WARN, message, context, metadata);
    }
    
    error(message: string, error?: BaseError, context: Partial<LogContext> = {}, metadata?: LogMetadata): void {
        this.log(LogLevel.ERROR, message, context, metadata, error);
    }
    
    fatal(message: string, error?: BaseError, context: Partial<LogContext> = {}, metadata?: LogMetadata): void {
        this.log(LogLevel.FATAL, message, context, metadata, error);
    }
    
    // Operation tracking
    startOperation(operationName: string, context: Partial<LogContext> = {}): OperationTracker {
        const operationId = crypto.randomUUID();
        this.info(`Starting operation: ${operationName}`, {
            ...context,
            operation: operationName,
            operationId
        });
        
        return new OperationTracker(this, operationName, operationId, context);
    }
    
    private async log(
        level: LogLevel, 
        message: string, 
        context: Partial<LogContext> = {}, 
        metadata?: LogMetadata,
        error?: BaseError
    ): Promise<void> {
        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            logger: this.component,
            message,
            context: {
                component: this.component,
                ...context
            } as LogContext,
            metadata,
            error,
            sessionId: this.generateSessionId()
        };
        
        await this.parentLogger.log(entry);
    }
}
```

### **Operation Tracking**

#### **Distributed Tracing Support**
```typescript
class OperationTracker {
    private startTime: number;
    
    constructor(
        private logger: ComponentLogger,
        private operationName: string,
        private operationId: string,
        private initialContext: Partial<LogContext>
    ) {
        this.startTime = performance.now();
    }
    
    addContext(context: Partial<LogContext>): void {
        this.initialContext = { ...this.initialContext, ...context };
    }
    
    step(stepName: string, context: Partial<LogContext> = {}): void {
        this.logger.debug(`Operation step: ${stepName}`, {
            ...this.initialContext,
            ...context,
            operation: this.operationName,
            operationId: this.operationId,
            step: stepName,
            duration: performance.now() - this.startTime
        });
    }
    
    success(result?: any, context: Partial<LogContext> = {}): void {
        const duration = performance.now() - this.startTime;
        this.logger.info(`Operation completed: ${this.operationName}`, {
            ...this.initialContext,
            ...context,
            operation: this.operationName,
            operationId: this.operationId,
            duration,
            success: true
        }, result ? { result } : undefined);
    }
    
    failure(error: BaseError, context: Partial<LogContext> = {}): void {
        const duration = performance.now() - this.startTime;
        this.logger.error(`Operation failed: ${this.operationName}`, error, {
            ...this.initialContext,
            ...context,
            operation: this.operationName,
            operationId: this.operationId,
            duration,
            success: false
        });
    }
    
    // Create child operation tracker
    child(childOperationName: string, context: Partial<LogContext> = {}): OperationTracker {
        return new OperationTracker(
            this.logger,
            childOperationName,
            crypto.randomUUID(),
            {
                ...this.initialContext,
                ...context,
                parentOperationId: this.operationId
            }
        );
    }
}
```

---

## 🔄 **Error Recovery Patterns**

### **Retry Mechanisms**

#### **Exponential Backoff Retry**
```typescript
interface RetryConfig {
    maxAttempts: number;          // Maximum retry attempts
    initialDelay: number;         // Initial delay in ms
    maxDelay: number;            // Maximum delay in ms
    backoffMultiplier: number;    // Backoff multiplier
    jitter: boolean;             // Add random jitter
    retryableErrors: ErrorCategory[]; // Which errors to retry
}

class RetryHandler {
    private readonly logger: ComponentLogger;
    
    constructor(
        private config: RetryConfig,
        logger: Logger
    ) {
        this.logger = logger.getLogger('RetryHandler');
    }
    
    async execute<T>(
        operation: () => Promise<T>,
        context: { operationName: string; operationId?: string }
    ): Promise<T> {
        const tracker = this.logger.startOperation(
            `retry-${context.operationName}`,
            { operationId: context.operationId }
        );
        
        let lastError: BaseError;
        let attempt = 0;
        
        while (attempt < this.config.maxAttempts) {
            attempt++;
            
            try {
                tracker.step(`attempt-${attempt}`, { attempt });
                const result = await operation();
                tracker.success(result, { totalAttempts: attempt });
                return result;
                
            } catch (error) {
                lastError = this.normalizeError(error);
                
                // Check if error is retryable
                if (!this.isRetryable(lastError) || attempt >= this.config.maxAttempts) {
                    tracker.failure(lastError, { 
                        totalAttempts: attempt,
                        finalAttempt: true
                    });
                    throw lastError;
                }
                
                // Calculate delay with exponential backoff
                const delay = this.calculateDelay(attempt);
                
                tracker.step(`retry-delay`, { 
                    attempt, 
                    delay, 
                    error: lastError.message 
                });
                
                await this.sleep(delay);
            }
        }
        
        tracker.failure(lastError!, { totalAttempts: attempt });
        throw lastError!;
    }
    
    private isRetryable(error: BaseError): boolean {
        if (!error.retryable) return false;
        return this.config.retryableErrors.includes(error.category);
    }
    
    private calculateDelay(attempt: number): number {
        let delay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
        delay = Math.min(delay, this.config.maxDelay);
        
        if (this.config.jitter) {
            delay += Math.random() * delay * 0.1; // Add 0-10% jitter
        }
        
        return Math.floor(delay);
    }
    
    private normalizeError(error: any): BaseError {
        if (error instanceof SmartSlidesError) {
            return error;
        }
        
        return new SmartSlidesError({
            component: 'RetryHandler',
            operation: 'normalize-error',
            userMessage: 'An unexpected error occurred',
            technicalMessage: error.message || 'Unknown error',
            severity: ErrorSeverity.MEDIUM,
            category: ErrorCategory.DEPENDENCY,
            cause: error
        });
    }
}
```

### **Circuit Breaker Pattern**

#### **Circuit Breaker for External Services**
```typescript
enum CircuitState {
    CLOSED = 'closed',       // Normal operation
    OPEN = 'open',          // Failing, rejecting requests
    HALF_OPEN = 'half-open' // Testing if service recovered
}

interface CircuitBreakerConfig {
    failureThreshold: number;     // Failures to open circuit
    recoveryTimeout: number;      // Time before trying recovery
    monitoringWindow: number;     // Window for failure counting
    minimumRequests: number;      // Minimum requests before evaluation
    successThreshold: number;     // Successes needed to close circuit
}

class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failures: number = 0;
    private successes: number = 0;
    private lastFailureTime: number = 0;
    private requests: number = 0;
    private readonly logger: ComponentLogger;
    
    constructor(
        private name: string,
        private config: CircuitBreakerConfig,
        logger: Logger
    ) {
        this.logger = logger.getLogger(`CircuitBreaker-${name}`);
    }
    
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        const tracker = this.logger.startOperation('circuit-breaker-execute');
        
        try {
            // Check if circuit is open
            if (this.state === CircuitState.OPEN) {
                if (!this.shouldAttemptRecovery()) {
                    const error = new SmartSlidesError({
                        component: 'CircuitBreaker',
                        operation: 'execute',
                        userMessage: 'Service temporarily unavailable',
                        technicalMessage: `Circuit breaker is OPEN for ${this.name}`,
                        severity: ErrorSeverity.HIGH,
                        category: ErrorCategory.DEPENDENCY,
                        recoverable: true
                    });
                    
                    tracker.failure(error);
                    throw error;
                }\n                \n                // Transition to half-open\n                this.transitionTo(CircuitState.HALF_OPEN);\n            }\n            \n            // Execute operation\n            const result = await operation();\n            this.onSuccess();\n            \n            tracker.success(result, { circuitState: this.state });\n            return result;\n            \n        } catch (error) {\n            this.onFailure(error);\n            \n            const normalizedError = this.normalizeError(error);\n            tracker.failure(normalizedError, { circuitState: this.state });\n            throw normalizedError;\n        }\n    }\n    \n    private shouldAttemptRecovery(): boolean {\n        return Date.now() - this.lastFailureTime > this.config.recoveryTimeout;\n    }\n    \n    private onSuccess(): void {\n        this.requests++;\n        \n        if (this.state === CircuitState.HALF_OPEN) {\n            this.successes++;\n            \n            if (this.successes >= this.config.successThreshold) {\n                this.transitionTo(CircuitState.CLOSED);\n                this.resetCounters();\n            }\n        } else if (this.state === CircuitState.CLOSED) {\n            this.failures = 0; // Reset failure counter on success\n        }\n    }\n    \n    private onFailure(error: any): void {\n        this.requests++;\n        this.failures++;\n        this.lastFailureTime = Date.now();\n        \n        if (this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN) {\n            if (this.shouldOpenCircuit()) {\n                this.transitionTo(CircuitState.OPEN);\n            }\n        }\n    }\n    \n    private shouldOpenCircuit(): boolean {\n        return (\n            this.requests >= this.config.minimumRequests &&\n            this.failures >= this.config.failureThreshold\n        );\n    }\n    \n    private transitionTo(newState: CircuitState): void {\n        const oldState = this.state;\n        this.state = newState;\n        \n        this.logger.info(`Circuit breaker state transition: ${oldState} -> ${newState}`, {\n            operation: 'state-transition',\n            component: this.name\n        }, {\n            failures: this.failures,\n            successes: this.successes,\n            requests: this.requests\n        });\n        \n        if (newState === CircuitState.HALF_OPEN) {\n            this.successes = 0;\n        }\n    }\n    \n    private resetCounters(): void {\n        this.failures = 0;\n        this.successes = 0;\n        this.requests = 0;\n    }\n}\n```\n\n---\n\n## 🎨 **User-Facing Error Messages**\n\n### **Error Message Guidelines**\n\n#### **Message Quality Standards**\n```typescript\ninterface UserMessageGuidelines {\n    // DO: Clear, actionable messages\n    good: [\n        \"Your API key appears to be invalid. Please check your settings and try again.\",\n        \"Generation failed due to network issues. Please check your connection and retry.\",\n        \"The prompt is too long (1,500 characters max). Please shorten it and try again.\"\n    ];\n    \n    // DON'T: Technical jargon or vague messages\n    bad: [\n        \"HTTP 401 Unauthorized\",\n        \"Something went wrong\",\n        \"Error in ContentAnalyzer.analyze() at line 45\"\n    ];\n    \n    // Message structure requirements\n    structure: {\n        maxLength: 150;           // Maximum message length\n        includeAction: true;      // Must include what user can do\n        avoidTechnicalTerms: true; // No technical jargon\n        empathetic: true;         // Show understanding of user frustration\n    };\n}\n\nclass UserMessageGenerator {\n    private readonly messageTemplates = new Map<string, MessageTemplate>([\n        ['api-key-invalid', {\n            template: \"Your {service} API key appears to be invalid. Please check your settings and try again.\",\n            severity: ErrorSeverity.HIGH,\n            actions: [\"Check API key in settings\", \"Verify key permissions\"]\n        }],\n        ['network-timeout', {\n            template: \"Generation timed out due to network issues. Please check your connection and retry.\",\n            severity: ErrorSeverity.MEDIUM,\n            actions: [\"Check internet connection\", \"Try again\", \"Use shorter prompts\"]\n        }],\n        ['validation-failed', {\n            template: \"The {field} {constraint}. Please {action} and try again.\",\n            severity: ErrorSeverity.LOW,\n            actions: [\"Correct the input\", \"Try again\"]\n        }],\n        ['generation-failed', {\n            template: \"Couldn't generate your presentation. {reason}. Would you like to try again?\",\n            severity: ErrorSeverity.HIGH,\n            actions: [\"Try again\", \"Modify prompt\", \"Check settings\"]\n        }]\n    ]);\n    \n    generateUserMessage(error: BaseError): string {\n        const template = this.getTemplate(error);\n        if (!template) {\n            return this.getGenericMessage(error.severity);\n        }\n        \n        return this.populateTemplate(template, error);\n    }\n    \n    private populateTemplate(template: MessageTemplate, error: BaseError): string {\n        let message = template.template;\n        \n        // Replace placeholders with error-specific data\n        if (error instanceof ValidationError) {\n            message = message.replace('{field}', error.field || 'input');\n            message = message.replace('{constraint}', error.constraint || 'is invalid');\n            message = message.replace('{action}', this.getActionForConstraint(error.constraint));\n        } else if (error instanceof ApiError) {\n            message = message.replace('{service}', this.getServiceName(error.endpoint));\n            message = message.replace('{reason}', this.getApiErrorReason(error));\n        }\n        \n        return message;\n    }\n    \n    private getGenericMessage(severity: ErrorSeverity): string {\n        switch (severity) {\n            case ErrorSeverity.CRITICAL:\n                return \"A critical error occurred. Please restart the plugin and try again.\";\n            case ErrorSeverity.HIGH:\n                return \"Something went wrong with your request. Please try again.\";\n            case ErrorSeverity.MEDIUM:\n                return \"There was an issue processing your request. You can try again or modify your input.\";\n            default:\n                return \"A minor issue occurred. This shouldn't affect your work.\";\n        }\n    }\n}\n```\n\n### **Error UI Components**\n\n#### **Error Display Patterns**\n```typescript\nclass ErrorNotificationManager {\n    private readonly app: App;\n    private readonly logger: ComponentLogger;\n    private readonly messageGenerator: UserMessageGenerator;\n    \n    constructor(app: App, logger: Logger) {\n        this.app = app;\n        this.logger = logger.getLogger('ErrorNotificationManager');\n        this.messageGenerator = new UserMessageGenerator();\n    }\n    \n    showError(error: BaseError, context?: { operation?: string; canRetry?: boolean }): void {\n        const userMessage = this.messageGenerator.generateUserMessage(error);\n        \n        // Log the error for debugging\n        this.logger.error(`Displaying error to user: ${error.id}`, error, {\n            operation: 'show-error',\n            userMessage\n        });\n        \n        // Choose appropriate display method based on severity\n        switch (error.severity) {\n            case ErrorSeverity.CRITICAL:\n                this.showCriticalErrorDialog(error, userMessage, context);\n                break;\n                \n            case ErrorSeverity.HIGH:\n                this.showErrorNotice(userMessage, 8000, context); // 8 second notice\n                break;\n                \n            case ErrorSeverity.MEDIUM:\n                this.showWarningNotice(userMessage, 5000);\n                break;\n                \n            case ErrorSeverity.LOW:\n                this.showInfoNotice(userMessage, 3000);\n                break;\n                \n            default:\n                // Don't show info-level errors to users\n                break;\n        }\n    }\n    \n    private showCriticalErrorDialog(\n        error: BaseError, \n        message: string, \n        context?: { operation?: string; canRetry?: boolean }\n    ): void {\n        const modal = new ErrorModal(this.app, {\n            title: 'Critical Error',\n            message,\n            errorId: error.id,\n            showDetails: false,\n            actions: [\n                {\n                    text: 'Restart Plugin',\n                    action: () => this.restartPlugin(),\n                    primary: true\n                },\n                {\n                    text: 'Report Issue',\n                    action: () => this.reportIssue(error)\n                }\n            ]\n        });\n        \n        modal.open();\n    }\n    \n    private showErrorNotice(\n        message: string, \n        duration: number, \n        context?: { operation?: string; canRetry?: boolean }\n    ): void {\n        const fragment = document.createDocumentFragment();\n        \n        // Error message\n        const messageEl = fragment.createEl('div', { text: message });\n        \n        // Action buttons if applicable\n        if (context?.canRetry) {\n            const buttonContainer = fragment.createEl('div', { cls: 'error-actions' });\n            buttonContainer.createEl('button', {\n                text: 'Try Again',\n                cls: 'mod-cta'\n            }).addEventListener('click', () => {\n                this.retryLastOperation(context.operation);\n            });\n        }\n        \n        new Notice(fragment, duration);\n    }\n    \n    private async reportIssue(error: BaseError): Promise<void> {\n        const issueData = {\n            errorId: error.id,\n            message: error.technicalMessage,\n            stack: error.stack,\n            context: error.context,\n            timestamp: error.timestamp.toISOString()\n        };\n        \n        // Copy to clipboard for easy reporting\n        await navigator.clipboard.writeText(JSON.stringify(issueData, null, 2));\n        \n        new Notice('Error details copied to clipboard. Please include this when reporting the issue.', 10000);\n    }\n}\n```\n\n---\n\n## 📋 **Error Handling Best Practices**\n\n### **Implementation Patterns**\n\n#### **Service Layer Error Handling**\n```typescript\nclass ContentAnalyzer {\n    private readonly logger: ComponentLogger;\n    private readonly retryHandler: RetryHandler;\n    \n    constructor(eventBus: EventBus, logger: Logger) {\n        this.logger = logger.getLogger('ContentAnalyzer');\n        this.retryHandler = new RetryHandler(\n            {\n                maxAttempts: 3,\n                initialDelay: 1000,\n                maxDelay: 5000,\n                backoffMultiplier: 2,\n                jitter: true,\n                retryableErrors: [ErrorCategory.NETWORK, ErrorCategory.TIMEOUT]\n            },\n            logger\n        );\n    }\n    \n    async analyze(prompt: string): Promise<Result<ContentAnalysis>> {\n        const tracker = this.logger.startOperation('analyze-content');\n        \n        try {\n            // Input validation\n            const validationResult = this.validateInput(prompt);\n            if (!validationResult.success) {\n                tracker.failure(validationResult.error);\n                return validationResult;\n            }\n            \n            // Main analysis logic with retry\n            const analysis = await this.retryHandler.execute(\n                () => this.performAnalysis(prompt),\n                { operationName: 'perform-analysis', operationId: tracker.operationId }\n            );\n            \n            tracker.success(analysis);\n            return { success: true, data: analysis };\n            \n        } catch (error) {\n            const normalizedError = this.normalizeAnalysisError(error, prompt);\n            tracker.failure(normalizedError);\n            return { success: false, error: normalizedError };\n        }\n    }\n    \n    private validateInput(prompt: string): Result<void> {\n        if (!prompt || typeof prompt !== 'string') {\n            return {\n                success: false,\n                error: new ValidationError({\n                    component: 'ContentAnalyzer',\n                    operation: 'validate-input',\n                    field: 'prompt',\n                    value: prompt,\n                    constraint: 'must be a non-empty string',\n                    userMessage: 'Please enter a valid prompt for your presentation.',\n                    technicalMessage: `Invalid prompt type: ${typeof prompt}`,\n                    severity: ErrorSeverity.MEDIUM\n                })\n            };\n        }\n        \n        if (prompt.length > 10000) {\n            return {\n                success: false,\n                error: new ValidationError({\n                    component: 'ContentAnalyzer',\n                    operation: 'validate-input',\n                    field: 'prompt',\n                    value: prompt.length,\n                    constraint: 'must be less than 10,000 characters',\n                    userMessage: `Your prompt is too long (${prompt.length} characters). Please shorten it to under 10,000 characters.`,\n                    technicalMessage: `Prompt length ${prompt.length} exceeds maximum of 10,000`,\n                    severity: ErrorSeverity.MEDIUM\n                })\n            };\n        }\n        \n        return { success: true, data: undefined };\n    }\n    \n    private normalizeAnalysisError(error: any, prompt: string): BaseError {\n        if (error instanceof SmartSlidesError) {\n            return error;\n        }\n        \n        // Network/timeout errors\n        if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {\n            return new ApiError({\n                component: 'ContentAnalyzer',\n                operation: 'analyze',\n                userMessage: 'Analysis failed due to network issues. Please check your connection and try again.',\n                technicalMessage: `Network error during analysis: ${error.message}`,\n                severity: ErrorSeverity.HIGH,\n                cause: error,\n                retryable: true\n            });\n        }\n        \n        // Generic error\n        return new GenerationError({\n            component: 'ContentAnalyzer',\n            operation: 'analyze',\n            userMessage: 'Analysis failed unexpectedly. Please try again or contact support if the issue persists.',\n            technicalMessage: `Unexpected error during analysis: ${error.message}`,\n            severity: ErrorSeverity.HIGH,\n            cause: error,\n            inputData: { promptLength: prompt.length },\n            recoverable: true\n        });\n    }\n}\n```\n\n### **Async Operation Error Handling**\n\n#### **Promise Chain Error Management**\n```typescript\nclass PresentationOrchestrator {\n    private readonly logger: ComponentLogger;\n    private readonly errorNotifier: ErrorNotificationManager;\n    \n    async generatePresentation(prompt: string): Promise<Result<Presentation>> {\n        const tracker = this.logger.startOperation('generate-presentation');\n        let partialResults: Partial<Presentation> = {};\n        \n        try {\n            // Step 1: Analyze content\n            tracker.step('content-analysis');\n            const analysisResult = await this.analyzer.analyze(prompt);\n            if (!analysisResult.success) {\n                throw new GenerationError({\n                    component: 'PresentationOrchestrator',\n                    operation: 'generate-presentation',\n                    step: 'content-analysis',\n                    userMessage: 'Failed to analyze your prompt. Please try again or simplify your request.',\n                    technicalMessage: 'Content analysis failed',\n                    severity: ErrorSeverity.HIGH,\n                    cause: analysisResult.error,\n                    recoverable: true\n                });\n            }\n            \n            partialResults.analysis = analysisResult.data;\n            \n            // Step 2: Generate slides with error recovery\n            tracker.step('slide-generation');\n            const slidesResult = await this.generateSlidesWithFallback(\n                analysisResult.data,\n                tracker\n            );\n            \n            partialResults.slides = slidesResult;\n            \n            // Step 3: Apply styling\n            tracker.step('styling');\n            const theme = await this.styleService.selectTheme(analysisResult.data);\n            partialResults.theme = theme;\n            \n            const presentation: Presentation = {\n                title: analysisResult.data.title || 'Generated Presentation',\n                slides: slidesResult,\n                theme,\n                metadata: {\n                    generatedAt: new Date(),\n                    generationTime: tracker.getDuration(),\n                    slideCount: slidesResult.length\n                }\n            };\n            \n            tracker.success(presentation);\n            return { success: true, data: presentation };\n            \n        } catch (error) {\n            const normalizedError = this.normalizeOrchestrationError(error, partialResults);\n            \n            // Show user-friendly error\n            this.errorNotifier.showError(normalizedError, {\n                operation: 'generate-presentation',\n                canRetry: normalizedError.recoverable\n            });\n            \n            tracker.failure(normalizedError);\n            return { success: false, error: normalizedError };\n        }\n    }\n    \n    private async generateSlidesWithFallback(\n        analysis: ContentAnalysis,\n        tracker: OperationTracker\n    ): Promise<Slide[]> {\n        try {\n            return await this.slideGenerator.generateSlides(analysis);\n        } catch (error) {\n            tracker.step('fallback-generation');\n            \n            // Try fallback generation with simpler approach\n            this.logger.warn('Primary slide generation failed, attempting fallback', {\n                operation: 'fallback-generation'\n            }, { error: error.message });\n            \n            return await this.generateFallbackSlides(analysis);\n        }\n    }\n    \n    private async generateFallbackSlides(analysis: ContentAnalysis): Promise<Slide[]> {\n        // Simplified slide generation that doesn't rely on external APIs\n        return analysis.keyTopics.map((topic, index) => ({\n            id: `slide-${index}`,\n            title: `${topic.charAt(0).toUpperCase()}${topic.slice(1)}`,\n            content: `Content about ${topic} based on your prompt.`,\n            layout: 'content',\n            notes: 'Generated using fallback method due to API issues'\n        }));\n    }\n}\n```\n\n---\n\n## 🔍 **Error Monitoring & Analytics**\n\n### **Error Metrics Collection**\n\n#### **Error Analytics Dashboard**\n```typescript\ninterface ErrorMetrics {\n    totalErrors: number;\n    errorsByCategory: Record<ErrorCategory, number>;\n    errorsBySeverity: Record<ErrorSeverity, number>;\n    errorsByComponent: Record<string, number>;\n    averageResolutionTime: number;\n    userImpactScore: number;\n    topErrors: ErrorSummary[];\n    trends: {\n        hourly: number[];\n        daily: number[];\n        weekly: number[];\n    };\n}\n\nclass ErrorAnalytics {\n    private errorHistory: BaseError[] = [];\n    private readonly maxHistorySize = 10000;\n    private readonly logger: ComponentLogger;\n    \n    constructor(logger: Logger) {\n        this.logger = logger.getLogger('ErrorAnalytics');\n    }\n    \n    recordError(error: BaseError): void {\n        this.errorHistory.push(error);\n        \n        // Prevent memory buildup\n        if (this.errorHistory.length > this.maxHistorySize) {\n            this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);\n        }\n        \n        // Real-time alerting for critical errors\n        if (error.severity === ErrorSeverity.CRITICAL) {\n            this.triggerCriticalErrorAlert(error);\n        }\n        \n        // Pattern detection\n        this.detectErrorPatterns(error);\n    }\n    \n    generateErrorReport(period: { start: Date; end: Date }): ErrorMetrics {\n        const relevantErrors = this.errorHistory.filter(error => \n            error.timestamp >= period.start && error.timestamp <= period.end\n        );\n        \n        return {\n            totalErrors: relevantErrors.length,\n            errorsByCategory: this.groupBy(relevantErrors, 'category'),\n            errorsBySeverity: this.groupBy(relevantErrors, 'severity'),\n            errorsByComponent: this.groupBy(relevantErrors, 'component'),\n            averageResolutionTime: this.calculateAverageResolutionTime(relevantErrors),\n            userImpactScore: this.calculateUserImpactScore(relevantErrors),\n            topErrors: this.getTopErrors(relevantErrors),\n            trends: this.calculateTrends(relevantErrors, period)\n        };\n    }\n    \n    private detectErrorPatterns(error: BaseError): void {\n        const recentErrors = this.errorHistory.slice(-50); // Last 50 errors\n        \n        // Detect error spikes\n        const last5Minutes = recentErrors.filter(e => \n            Date.now() - e.timestamp.getTime() < 5 * 60 * 1000\n        );\n        \n        if (last5Minutes.length > 10) {\n            this.logger.warn('Error spike detected', {\n                operation: 'pattern-detection'\n            }, {\n                errorCount: last5Minutes.length,\n                timeWindow: '5 minutes'\n            });\n        }\n        \n        // Detect cascading failures\n        const sameCategory = recentErrors\n            .filter(e => e.category === error.category)\n            .slice(-5);\n        \n        if (sameCategory.length === 5) {\n            this.logger.warn('Cascading failure pattern detected', {\n                operation: 'pattern-detection'\n            }, {\n                category: error.category,\n                consecutiveErrors: 5\n            });\n        }\n    }\n    \n    private calculateUserImpactScore(errors: BaseError[]): number {\n        const impactWeights = {\n            [ErrorSeverity.CRITICAL]: 10,\n            [ErrorSeverity.HIGH]: 5,\n            [ErrorSeverity.MEDIUM]: 2,\n            [ErrorSeverity.LOW]: 1,\n            [ErrorSeverity.INFO]: 0\n        };\n        \n        const totalImpact = errors.reduce(\n            (sum, error) => sum + impactWeights[error.severity],\n            0\n        );\n        \n        return Math.min(100, totalImpact); // Cap at 100\n    }\n}\n```\n\n---\n\n## ✅ **Error Handling Checklist**\n\n### **Development Checklist**\n- [ ] All public methods return `Result<T>` type with proper error handling\n- [ ] Input validation implemented for all user-provided data\n- [ ] Network operations wrapped with timeout and retry logic\n- [ ] Async operations have proper error boundary handling\n- [ ] User-facing error messages are clear and actionable\n- [ ] Technical errors are logged with appropriate detail level\n- [ ] Error recovery mechanisms implemented where applicable\n- [ ] Circuit breakers configured for external service calls\n- [ ] Memory cleanup verified in all error paths\n- [ ] Error analytics and monitoring integrated\n\n### **Testing Checklist**\n- [ ] Unit tests cover all error scenarios and edge cases\n- [ ] Integration tests validate error propagation between layers\n- [ ] User experience tests verify error message quality\n- [ ] Performance tests validate error handling doesn't cause memory leaks\n- [ ] Security tests ensure errors don't expose sensitive information\n- [ ] Recovery tests validate system can recover from various error states\n- [ ] Load tests validate error handling under high concurrency\n- [ ] Chaos engineering tests validate resilience to infrastructure failures\n\n### **Production Checklist**\n- [ ] Error monitoring dashboard configured and accessible\n- [ ] Alerting rules set up for critical errors and error spikes\n- [ ] Log aggregation and search capabilities available\n- [ ] Error reporting mechanism available for user feedback\n- [ ] Performance impact of error handling measured and acceptable\n- [ ] Error analytics regularly reviewed for improvement opportunities\n- [ ] Incident response procedures defined and tested\n- [ ] Error documentation updated and accessible to support team\n\n**Last Updated:** 2025-08-14\n**Owner:** Development Team & Tech Lead\n**Review Frequency:** Monthly (patterns) / Quarterly (standards)\n**Next Review:** 2025-09-14
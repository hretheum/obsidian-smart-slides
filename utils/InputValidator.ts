export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    sanitized?: string;
}

export class InputValidator {
    private static readonly MIN_PROMPT_LENGTH = 10;
    private static readonly MAX_PROMPT_LENGTH = 5000;
    private static readonly MAX_FILENAME_LENGTH = 100;
    
    // Dangerous patterns that could indicate injection attempts
    private static readonly SUSPICIOUS_PATTERNS = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /data:text\/html/gi,
        /vbscript:/gi,
        /on\w+\s*=/gi, // Event handlers like onclick=
        /eval\s*\(/gi,
        /Function\s*\(/gi
    ];
    
    // File path injection patterns
    private static readonly PATH_INJECTION_PATTERNS = [
        /\.\./g, // Directory traversal
        /[<>:"\/\\|?*\x00-\x1f]/g, // Invalid filename characters
        /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i // Windows reserved names
    ];
    
    /**
     * Validate presentation prompt input
     */
    static validatePrompt(prompt: string): ValidationResult {
        const errors: string[] = [];
        
        if (typeof prompt !== 'string') {
            errors.push('Prompt must be a string');
            return { isValid: false, errors };
        }
        
        // Length validation
        if (prompt.length < this.MIN_PROMPT_LENGTH) {
            errors.push(`Prompt must be at least ${this.MIN_PROMPT_LENGTH} characters long`);
        }
        
        if (prompt.length > this.MAX_PROMPT_LENGTH) {
            errors.push(`Prompt too long (maximum ${this.MAX_PROMPT_LENGTH} characters)`);
        }
        
        // Security validation
        for (const pattern of this.SUSPICIOUS_PATTERNS) {
            if (pattern.test(prompt)) {
                errors.push('Prompt contains suspicious content that could be unsafe');
                break; // Don't reveal which pattern matched
            }
        }
        
        // Sanitize the prompt
        const sanitized = this.sanitizePrompt(prompt);
        
        return {
            isValid: errors.length === 0,
            errors,
            sanitized
        };
    }
    
    /**
     * Validate and sanitize filename
     */
    static validateFileName(fileName: string): ValidationResult {
        const errors: string[] = [];
        
        if (typeof fileName !== 'string') {
            errors.push('Filename must be a string');
            return { isValid: false, errors };
        }
        
        if (fileName.length === 0) {
            errors.push('Filename cannot be empty');
            return { isValid: false, errors };
        }
        
        if (fileName.length > this.MAX_FILENAME_LENGTH) {
            errors.push(`Filename too long (maximum ${this.MAX_FILENAME_LENGTH} characters)`);
        }
        
        // Check for reserved names and dangerous characters
        const dangerous = this.PATH_INJECTION_PATTERNS.some(pattern => pattern.test(fileName));
        if (dangerous) {
            errors.push('Filename contains invalid characters or reserved names');
        }
        
        const sanitized = this.sanitizeFileName(fileName);
        
        return {
            isValid: errors.length === 0,
            errors,
            sanitized
        };
    }
    
    /**
     * Validate folder path
     */
    static validateFolderPath(path: string): ValidationResult {
        const errors: string[] = [];
        
        if (typeof path !== 'string') {
            errors.push('Path must be a string');
            return { isValid: false, errors };
        }
        
        // Check for path traversal attempts
        if (path.includes('..')) {
            errors.push('Path traversal is not allowed');
        }
        
        // Check for absolute paths (should be relative to vault)
        if (path.startsWith('/') || path.match(/^[A-Za-z]:\\/)) {
            errors.push('Absolute paths are not allowed');
        }
        
        // Validate individual path components
        const components = path.split('/').filter(Boolean);
        for (const component of components) {
            const componentValidation = this.validateFileName(component);
            if (!componentValidation.isValid) {
                errors.push(`Invalid path component "${component}": ${componentValidation.errors[0]}`);
                break;
            }
        }
        
        const sanitized = components.map(comp => this.sanitizeFileName(comp)).join('/');
        
        return {
            isValid: errors.length === 0,
            errors,
            sanitized
        };
    }
    
    /**
     * Validate plugin ID
     */
    static validatePluginId(pluginId: string): ValidationResult {
        const errors: string[] = [];
        
        if (typeof pluginId !== 'string') {
            errors.push('Plugin ID must be a string');
            return { isValid: false, errors };
        }
        
        if (pluginId.length === 0) {
            errors.push('Plugin ID cannot be empty');
        }
        
        // Plugin IDs should only contain lowercase letters, numbers, and hyphens
        if (!/^[a-z0-9-]+$/.test(pluginId)) {
            errors.push('Plugin ID must contain only lowercase letters, numbers, and hyphens');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            sanitized: pluginId.toLowerCase().replace(/[^a-z0-9-]/g, '-')
        };
    }
    
    /**
     * Sanitize prompt content
     */
    static sanitizePrompt(prompt: string): string {
        if (typeof prompt !== 'string') return '';
        
        let sanitized = prompt;
        
        // Remove suspicious patterns
        for (const pattern of this.SUSPICIOUS_PATTERNS) {
            sanitized = sanitized.replace(pattern, '[REMOVED]');
        }
        
        // Trim whitespace and normalize line endings
        sanitized = sanitized.trim().replace(/\r\n/g, '\n');
        
        // Limit length
        if (sanitized.length > this.MAX_PROMPT_LENGTH) {
            sanitized = sanitized.substring(0, this.MAX_PROMPT_LENGTH) + '...';
        }
        
        return sanitized;
    }
    
    /**
     * Sanitize filename for safe filesystem operations
     */
    static sanitizeFileName(fileName: string): string {
        if (typeof fileName !== 'string') return 'untitled';
        
        // Remove or replace dangerous characters
        let sanitized = fileName.replace(/[<>:"\/\\|?*\x00-\x1f]/g, '-');
        
        // Handle Windows reserved names
        const reservedNamePattern = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
        if (reservedNamePattern.test(sanitized)) {
            sanitized = `file-${sanitized}`;
        }
        
        // Remove multiple consecutive dashes/dots
        sanitized = sanitized.replace(/[-\.]{2,}/g, '-');
        
        // Trim dashes and dots from start/end
        sanitized = sanitized.replace(/^[-\.]+|[-\.]+$/g, '');
        
        // Ensure minimum length
        if (sanitized.length === 0) {
            sanitized = 'untitled';
        }
        
        // Limit length
        if (sanitized.length > this.MAX_FILENAME_LENGTH) {
            sanitized = sanitized.substring(0, this.MAX_FILENAME_LENGTH);
        }
        
        return sanitized.toLowerCase();
    }
    
    /**
     * Escape HTML content to prevent XSS
     */
    static escapeHtml(unsafe: string): string {
        if (typeof unsafe !== 'string') return '';
        
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    /**
     * Validate and sanitize markdown content
     */
    static validateMarkdown(markdown: string): ValidationResult {
        const errors: string[] = [];
        
        if (typeof markdown !== 'string') {
            errors.push('Markdown must be a string');
            return { isValid: false, errors };
        }
        
        // Check for script tags in markdown (shouldn't be there but be safe)
        for (const pattern of this.SUSPICIOUS_PATTERNS) {
            if (pattern.test(markdown)) {
                errors.push('Markdown contains suspicious content');
                break;
            }
        }
        
        // Basic sanitization - remove script tags but preserve other HTML
        const sanitized = markdown.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        return {
            isValid: errors.length === 0,
            errors,
            sanitized
        };
    }
}
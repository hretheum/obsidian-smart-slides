import { EventBus, DomainEvents } from '../core/EventBus';
import { ContentAnalysis } from './AnalyzerService';

export interface ThemeDecision {
    name: string;
    colorScheme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    fontFamily: string;
    rationale: string;
}

export class StyleService {
    private readonly themeMapping = new Map([
        // Professional/Business themes
        ['business-formal', {
            name: 'business',
            colorScheme: 'light' as const,
            primaryColor: '#2563eb',
            fontFamily: 'Inter, sans-serif',
            rationale: 'Professional business presentation with clean, corporate aesthetics'
        }],
        
        ['executive-dark', {
            name: 'night',
            colorScheme: 'dark' as const,
            primaryColor: '#3b82f6',
            fontFamily: 'Inter, sans-serif',
            rationale: 'Executive-level presentation with sophisticated dark theme'
        }],
        
        // Technical/Development themes
        ['tech-modern', {
            name: 'github',
            colorScheme: 'light' as const,
            primaryColor: '#10b981',
            fontFamily: 'JetBrains Mono, monospace',
            rationale: 'Modern technical presentation with developer-friendly styling'
        }],
        
        ['developer-dark', {
            name: 'dracula',
            colorScheme: 'dark' as const,
            primaryColor: '#bd93f9',
            fontFamily: 'Fira Code, monospace',
            rationale: 'Developer-focused presentation with syntax highlighting aesthetics'
        }],
        
        // Educational themes
        ['academic-light', {
            name: 'white',
            colorScheme: 'light' as const,
            primaryColor: '#dc2626',
            fontFamily: 'Georgia, serif',
            rationale: 'Academic presentation with readable serif fonts and classic styling'
        }],
        
        ['student-friendly', {
            name: 'sky',
            colorScheme: 'light' as const,
            primaryColor: '#0ea5e9',
            fontFamily: 'Open Sans, sans-serif',
            rationale: 'Student-friendly presentation with approachable, clean design'
        }],
        
        // Creative/Inspirational themes
        ['creative-vibrant', {
            name: 'league',
            colorScheme: 'light' as const,
            primaryColor: '#f59e0b',
            fontFamily: 'Poppins, sans-serif',
            rationale: 'Creative presentation with vibrant colors and modern typography'
        }],
        
        ['minimalist-clean', {
            name: 'simple',
            colorScheme: 'light' as const,
            primaryColor: '#6b7280',
            fontFamily: 'Inter, sans-serif',
            rationale: 'Minimalist presentation focusing on content with clean aesthetics'
        }]
    ]);
    
    constructor(private eventBus: EventBus) {}
    
    async selectTheme(analysis: ContentAnalysis): Promise<string> {
        try {
            const themeKey = this.determineThemeKey(analysis);
            const theme = this.themeMapping.get(themeKey);
            
            if (!theme) {
                console.warn(`[StyleService] Theme not found for key: ${themeKey}, falling back to default`);
                return 'night'; // Safe fallback
            }
            
            // Publish style decision event
            await this.eventBus.publishTyped(DomainEvents.STYLE_DECISION_MADE, {
                analysis,
                themeKey,
                theme: theme.name,
                rationale: theme.rationale
            });
            
            return theme.name;
            
        } catch (error) {
            console.error('[StyleService] Theme selection failed:', error);
            return 'night'; // Safe fallback
        }
    }
    
    async getThemeDecision(analysis: ContentAnalysis): Promise<ThemeDecision> {
        const themeKey = this.determineThemeKey(analysis);
        const theme = this.themeMapping.get(themeKey);
        
        if (!theme) {
            return {
                name: 'night',
                colorScheme: 'dark',
                primaryColor: '#3b82f6',
                fontFamily: 'Inter, sans-serif',
                rationale: 'Default theme fallback'
            };
        }
        
        return theme;
    }
    
    private determineThemeKey(analysis: ContentAnalysis): string {
        // Prioritize by audience and domain
        if (analysis.audience === 'executives') {
            return analysis.formality > 7 ? 'business-formal' : 'executive-dark';
        }
        
        if (analysis.audience === 'technical') {
            return analysis.complexity === 'advanced' ? 'developer-dark' : 'tech-modern';
        }
        
        if (analysis.audience === 'students') {
            return analysis.domain === 'education' ? 'academic-light' : 'student-friendly';
        }
        
        // Fallback to domain-based selection
        switch (analysis.domain) {
            case 'business':
                return analysis.formality > 6 ? 'business-formal' : 'executive-dark';
                
            case 'technology':
                return analysis.tone === 'casual' ? 'tech-modern' : 'developer-dark';
                
            case 'education':
            case 'science':
                return 'academic-light';
                
            default:
                // Consider purpose and tone for general domains
                if (analysis.purpose === 'inspire') {
                    return 'creative-vibrant';
                }
                
                if (analysis.tone === 'formal') {
                    return 'business-formal';
                }
                
                return 'minimalist-clean';
        }
    }
    
    // Additional styling utilities
    getSuggestedColors(theme: string): {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    } {
        const colorSchemes = {
            'night': {
                primary: '#3b82f6',
                secondary: '#1e40af',
                accent: '#10b981',
                background: '#0f172a',
                text: '#f8fafc'
            },
            'business': {
                primary: '#2563eb',
                secondary: '#1d4ed8',
                accent: '#dc2626',
                background: '#ffffff',
                text: '#1f2937'
            },
            'github': {
                primary: '#10b981',
                secondary: '#059669',
                accent: '#f59e0b',
                background: '#ffffff',
                text: '#374151'
            },
            'default': {
                primary: '#6366f1',
                secondary: '#4f46e5',
                accent: '#06b6d4',
                background: '#ffffff',
                text: '#111827'
            }
        };
        
        return colorSchemes[theme as keyof typeof colorSchemes] || colorSchemes.default;
    }
    
    getFontRecommendations(analysis: ContentAnalysis): {
        heading: string;
        body: string;
        code?: string;
    } {
        if (analysis.domain === 'technology' || analysis.audience === 'technical') {
            return {
                heading: 'JetBrains Mono, monospace',
                body: 'Inter, sans-serif',
                code: 'Fira Code, monospace'
            };
        }
        
        if (analysis.domain === 'education' || analysis.tone === 'academic') {
            return {
                heading: 'Playfair Display, serif',
                body: 'Georgia, serif'
            };
        }
        
        if (analysis.audience === 'executives' || analysis.tone === 'business') {
            return {
                heading: 'Inter, sans-serif',
                body: 'Inter, sans-serif'
            };
        }
        
        // Default modern styling
        return {
            heading: 'Poppins, sans-serif',
            body: 'Open Sans, sans-serif'
        };
    }
    
    getLayoutModifiers(analysis: ContentAnalysis): {
        spacing: 'tight' | 'normal' | 'loose';
        emphasis: 'subtle' | 'normal' | 'strong';
        animations: boolean;
    } {
        return {
            spacing: analysis.complexity === 'advanced' ? 'tight' : 'normal',
            emphasis: analysis.purpose === 'persuade' ? 'strong' : 'normal',
            animations: analysis.audience !== 'executives' // Executives prefer static
        };
    }
}
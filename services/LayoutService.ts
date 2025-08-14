import { EventBus, DomainEvents } from '../core/EventBus';

export interface LayoutDecision {
    type: 'title' | 'content' | 'split' | 'image-focus' | 'comparison' | 'list' | 'quote';
    params: {
        columns?: number;
        even?: boolean;
        gap?: string;
        alignment?: 'left' | 'center' | 'right';
        imagePosition?: 'left' | 'right' | 'top' | 'bottom';
        backgroundColor?: string;
    };
    rationale: string;
}

export interface SlideContent {
    type?: string;
    title: string;
    text?: string;
    tags?: string[];
    imagePrompt?: string;
    bullets?: string[];
}

export interface LayoutRule {
    condition: (content: SlideContent) => boolean;
    layout: Omit<LayoutDecision, 'rationale'>;
    rationale: string;
    priority: number; // Higher number = higher priority
}

export class LayoutService {
    private readonly layoutRules: LayoutRule[] = [
        // High priority rules
        {
            condition: (content) => this.isTitle(content),
            layout: { 
                type: 'title', 
                params: { alignment: 'center', backgroundColor: 'primary' } 
            },
            rationale: 'Title slide for presentation opening',
            priority: 100
        },
        
        {
            condition: (content) => this.isComparison(content),
            layout: { 
                type: 'split', 
                params: { columns: 2, even: true, gap: '3' } 
            },
            rationale: 'Split layout for comparison content',
            priority: 90
        },
        
        {
            condition: (content) => this.isQuote(content),
            layout: { 
                type: 'quote', 
                params: { alignment: 'center', backgroundColor: 'secondary' } 
            },
            rationale: 'Centered quote layout for impactful statements',
            priority: 85
        },
        
        // Medium priority rules
        {
            condition: (content) => this.hasList(content),
            layout: { 
                type: 'list', 
                params: { alignment: 'left' } 
            },
            rationale: 'List layout for bullet points and enumeration',
            priority: 70
        },
        
        {
            condition: (content) => this.hasImage(content),
            layout: { 
                type: 'image-focus', 
                params: { imagePosition: 'right', columns: 2 } 
            },
            rationale: 'Image-focused layout with supporting text',
            priority: 60
        },
        
        // Low priority / default rules
        {
            condition: (content) => this.isLongContent(content),
            layout: { 
                type: 'content', 
                params: { alignment: 'left' } 
            },
            rationale: 'Standard content layout for text-heavy slides',
            priority: 30
        },
        
        {
            condition: () => true, // Default fallback
            layout: { 
                type: 'content', 
                params: { alignment: 'center' } 
            },
            rationale: 'Default centered content layout',
            priority: 10
        }
    ];
    
    constructor(private eventBus: EventBus) {}
    
    async selectLayout(content: SlideContent): Promise<LayoutDecision> {
        try {
            // Find the highest priority rule that matches
            const matchingRule = this.layoutRules
                .filter(rule => rule.condition(content))
                .sort((a, b) => b.priority - a.priority)[0];
            
            const decision: LayoutDecision = {
                ...matchingRule.layout,
                rationale: matchingRule.rationale
            };
            
            // Publish layout decision event
            await this.eventBus.publishTyped(DomainEvents.LAYOUT_DECISION_MADE, {
                content,
                decision,
                rule: {
                    priority: matchingRule.priority,
                    rationale: matchingRule.rationale
                }
            });
            
            return decision;
            
        } catch (error) {
            console.error('[LayoutService] Layout selection failed:', error);
            
            // Return safe default
            return {
                type: 'content',
                params: { alignment: 'center' },
                rationale: 'Fallback layout due to error'
            };
        }
    }
    
    async selectLayoutsBatch(slides: SlideContent[]): Promise<LayoutDecision[]> {
        const decisions: LayoutDecision[] = [];
        
        // Process slides in parallel for better performance
        const promises = slides.map(slide => this.selectLayout(slide));
        const results = await Promise.all(promises);
        
        return results;
    }
    
    // Layout detection methods
    private isTitle(content: SlideContent): boolean {
        return (
            content.type === 'title' ||
            (!content.text && !content.bullets) ||
            (content.title.length < 50 && !content.text)
        );
    }
    
    private isComparison(content: SlideContent): boolean {
        if (content.tags?.includes('#COMPARISON')) return true;
        
        const comparisonKeywords = [
            'vs', 'versus', 'compared to', 'porównanie', 'różnice',
            'similarities', 'differences', 'pros and cons', 'zalety i wady'
        ];
        
        const text = `${content.title} ${content.text || ''}`.toLowerCase();
        return comparisonKeywords.some(keyword => text.includes(keyword));
    }
    
    private isQuote(content: SlideContent): boolean {
        const text = content.text || '';
        
        return (
            text.startsWith('"') && text.endsWith('"') ||
            text.startsWith("'") && text.endsWith("'") ||
            text.includes('— ') || // Quote attribution
            content.tags?.includes('#QUOTE')
        );
    }
    
    private hasList(content: SlideContent): boolean {
        return !!(
            content.bullets?.length ||
            content.text?.includes('•') ||
            content.text?.includes('- ') ||
            content.text?.match(/^\d+\./m) // Numbered lists
        );
    }
    
    private hasImage(content: SlideContent): boolean {
        return !!(
            content.imagePrompt ||
            content.tags?.includes('#IMAGE') ||
            content.text?.includes('[image')
        );
    }
    
    private isLongContent(content: SlideContent): boolean {
        const textLength = (content.text || '').length;
        const titleLength = content.title.length;
        
        return textLength > 200 || (titleLength + textLength) > 300;
    }
    
    // Utility methods for advanced layout decisions
    getLayoutStats(slides: SlideContent[]): Promise<{
        layoutCounts: { [key: string]: number };
        averageComplexity: number;
        recommendedFlow: string[];
    }> {
        return Promise.resolve({
            layoutCounts: {},
            averageComplexity: 0,
            recommendedFlow: []
        });
    }
    
    optimizeLayoutFlow(layouts: LayoutDecision[]): LayoutDecision[] {
        // Ensure good visual rhythm
        // Avoid too many similar layouts in a row
        // Add variety while maintaining coherence
        
        const optimized = [...layouts];
        
        for (let i = 1; i < optimized.length - 1; i++) {
            const prev = optimized[i - 1];
            const current = optimized[i];
            const next = optimized[i + 1];
            
            // Avoid three consecutive slides of same type
            if (prev.type === current.type && current.type === next.type) {
                // Try to find a different but appropriate layout
                if (current.type === 'content') {
                    optimized[i] = {
                        ...current,
                        type: 'split',
                        rationale: 'Layout variety optimization'
                    };
                }
            }
        }
        
        return optimized;
    }
}
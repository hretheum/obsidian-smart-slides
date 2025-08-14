import { EventBus, DomainEvents } from '../core/EventBus';

export interface ContentAnalysis {
    audience: 'students' | 'executives' | 'technical' | 'general';
    formality: number; // 1-10 scale
    domain: string;
    purpose: 'inform' | 'persuade' | 'educate' | 'inspire';
    complexity: 'beginner' | 'intermediate' | 'advanced';
    suggestedSlideCount: number;
    keyTopics: string[];
    tone: 'formal' | 'casual' | 'academic' | 'business';
}

export class AnalyzerService {
    private readonly audiencePatterns = new Map([
        ['students', /student|uczni|edukac|nauka|szko|uczelni|uniwersytet/i],
        ['executives', /zarząd|dyrekc|CEO|management|kierown|board/i],
        ['technical', /developer|program|kod|API|technic|inżynier/i]
    ]);
    
    private readonly purposePatterns = new Map([
        ['educate', /nauc|edukac|wyjaśn|pokaż|jak|tutorial|guide/i],
        ['persuade', /przekon|sprzeda|promuj|zachęc|motywuj/i],
        ['inspire', /inspir|motywuj|vision|przyszłość|innowac/i]
    ]);
    
    private readonly domainPatterns = new Map([
        ['technology', /tech|IT|software|AI|machine|digital|cyber/i],
        ['business', /biznes|firma|market|sales|strategy|finance/i],
        ['medicine', /medyc|health|lekarz|patient|treatment|diagnos/i],
        ['education', /edukac|szko|uniwersytet|nauc|student|teacher/i],
        ['science', /nauk|research|experiment|analys|study|data/i]
    ]);
    
    constructor(private eventBus: EventBus) {}
    
    async analyze(prompt: string): Promise<ContentAnalysis> {
        const startTime = Date.now();
        
        try {
            const analysis: ContentAnalysis = {
                audience: this.detectAudience(prompt),
                formality: this.calculateFormality(prompt),
                domain: this.detectDomain(prompt),
                purpose: this.detectPurpose(prompt),
                complexity: this.assessComplexity(prompt),
                suggestedSlideCount: this.suggestSlideCount(prompt),
                keyTopics: this.extractKeyTopics(prompt),
                tone: this.detectTone(prompt)
            };
            
            const analysisTime = Date.now() - startTime;
            
            // Publish analysis completed event
            await this.eventBus.publishTyped(DomainEvents.CONTENT_ANALYSIS_COMPLETED, {
                prompt,
                analysis,
                analysisTimeMs: analysisTime
            });
            
            return analysis;
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[AnalyzerService] Analysis failed:', errorMessage);
            
            // Return default analysis on error
            return this.getDefaultAnalysis();
        }
    }
    
    private detectAudience(prompt: string): ContentAnalysis['audience'] {
        for (const [audience, pattern] of this.audiencePatterns) {
            if (pattern.test(prompt)) {
                return audience as ContentAnalysis['audience'];
            }
        }
        return 'general';
    }
    
    private calculateFormality(prompt: string): number {
        let formalityScore = 5; // Start with neutral
        
        // Formal indicators
        const formalPatterns = [
            /proszę|szanowni|oficjalny|protokół|zarząd|raport/i,
            /\b(Pan|Pani|Państwo)\b/g,
            /w związku z|zgodnie z|w nawiązaniu do/i
        ];
        
        // Casual indicators  
        const casualPatterns = [
            /fajny|super|cool|spoko|git|czesc/i,
            /emoji|😀|👍|🚀/g,
            /no to|a wiec|tak wiec/i
        ];
        
        // Count formal patterns
        formalPatterns.forEach(pattern => {
            const matches = prompt.match(pattern);
            if (matches) {
                formalityScore += matches.length;
            }
        });
        
        // Count casual patterns
        casualPatterns.forEach(pattern => {
            const matches = prompt.match(pattern);
            if (matches) {
                formalityScore -= matches.length;
            }
        });
        
        // Clamp between 1-10
        return Math.max(1, Math.min(10, formalityScore));
    }
    
    private detectDomain(prompt: string): string {
        for (const [domain, pattern] of this.domainPatterns) {
            if (pattern.test(prompt)) {
                return domain;
            }
        }
        return 'general';
    }
    
    private detectPurpose(prompt: string): ContentAnalysis['purpose'] {
        for (const [purpose, pattern] of this.purposePatterns) {
            if (pattern.test(prompt)) {
                return purpose as ContentAnalysis['purpose'];
            }
        }
        return 'inform';
    }
    
    private assessComplexity(prompt: string): ContentAnalysis['complexity'] {
        const complexWords = prompt.match(/\b\w{12,}\b/g) || [];
        const technicalTerms = prompt.match(/API|algorithm|architecture|implementation|optimization/gi) || [];
        const avgWordLength = prompt.split(/\s+/).reduce((sum, word) => sum + word.length, 0) / prompt.split(/\s+/).length;
        
        if (complexWords.length > 5 || technicalTerms.length > 3 || avgWordLength > 6) {
            return 'advanced';
        } else if (complexWords.length > 2 || technicalTerms.length > 1 || avgWordLength > 5) {
            return 'intermediate';
        }
        return 'beginner';
    }
    
    private suggestSlideCount(prompt: string): number {
        const wordCount = prompt.split(/\s+/).length;
        const baseSlides = Math.max(6, Math.min(20, Math.ceil(wordCount / 20)));
        
        // Adjust based on complexity
        const complexity = this.assessComplexity(prompt);
        switch (complexity) {
            case 'advanced': return Math.min(20, baseSlides + 3);
            case 'intermediate': return baseSlides;
            case 'beginner': return Math.max(6, baseSlides - 2);
            default: return baseSlides;
        }
    }
    
    private extractKeyTopics(prompt: string): string[] {
        // Simple keyword extraction - in real implementation, this could use NLP libraries
        const words = prompt.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3);
        
        // Count word frequency
        const frequency: { [key: string]: number } = {};
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });
        
        // Get top 5 most frequent words
        return Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word);
    }
    
    private detectTone(prompt: string): ContentAnalysis['tone'] {
        const formalityScore = this.calculateFormality(prompt);
        const domain = this.detectDomain(prompt);
        
        if (domain === 'business' && formalityScore > 7) return 'business';
        if (domain === 'education' || domain === 'science') return 'academic';
        if (formalityScore > 7) return 'formal';
        return 'casual';
    }
    
    private getDefaultAnalysis(): ContentAnalysis {
        return {
            audience: 'general',
            formality: 5,
            domain: 'general',
            purpose: 'inform',
            complexity: 'intermediate',
            suggestedSlideCount: 10,
            keyTopics: [],
            tone: 'casual'
        };
    }
}
# Przykładowa implementacja - Smart Slides

## ContentAnalyzer.ts

```typescript
export interface AnalysisResult {
    audience: 'students' | 'executives' | 'technical' | 'general';
    formality: number; // 1-10
    domain: string;
    purpose: 'inform' | 'persuade' | 'educate' | 'inspire';
    keywords: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
    dataIntensity: 'low' | 'medium' | 'high';
}

export class ContentAnalyzer {
    private readonly audiencePatterns = {
        students: /student|uczni|uczniów|szkoł|edukac|lekcj|wykład|nauczanie/i,
        executives: /zarząd|dyrekc|CEO|CFO|CTO|management|kadra|kierownictw|szef/i,
        technical: /developer|programist|kod|engineer|technicz|architekt|DevOps/i,
        investors: /inwestor|pitch|funding|VC|anioł|startup|akcjonariusz/i
    };
    
    private readonly domainPatterns = {
        healthcare: /medyc|szpital|zdrow|pacjent|diagnoz|terapia|lek|doctor/i,
        education: /edukac|szkol|nauczanie|uczenie|student|uniwersytet/i,
        technology: /AI|ML|software|kod|aplikac|system|cyber|blockchain/i,
        business: /biznes|firma|sprzedaż|marketing|ROI|KPI|strategia/i,
        science: /nauk|badani|eksperyment|hipotez|teori|odkryc/i
    };
    
    analyze(prompt: string): AnalysisResult {
        return {
            audience: this.detectAudience(prompt),
            formality: this.calculateFormality(prompt),
            domain: this.detectDomain(prompt),
            purpose: this.detectPurpose(prompt),
            keywords: this.extractKeywords(prompt),
            sentiment: this.analyzeSentiment(prompt),
            dataIntensity: this.detectDataIntensity(prompt)
        };
    }
    
    private detectAudience(prompt: string): AnalysisResult['audience'] {
        for (const [audience, pattern] of Object.entries(this.audiencePatterns)) {
            if (pattern.test(prompt)) {
                return audience as AnalysisResult['audience'];
            }
        }
        return 'general';
    }
    
    private calculateFormality(prompt: string): number {
        let score = 5; // baseline
        
        // Increase formality
        if (/zarząd|oficjaln|formal|profesjonaln/i.test(prompt)) score += 3;
        if (/raport|analiza|sprawozdanie/i.test(prompt)) score += 2;
        
        // Decrease formality
        if (/casual|luźn|prosty|łatw|fajn|cool/i.test(prompt)) score -= 3;
        if (/😊|😎|🚀|✨/.test(prompt)) score -= 2;
        
        return Math.max(1, Math.min(10, score));
    }
    
    private detectDomain(prompt: string): string {
        for (const [domain, pattern] of Object.entries(this.domainPatterns)) {
            if (pattern.test(prompt)) {
                return domain;
            }
        }
        return 'general';
    }
    
    private detectPurpose(prompt: string): AnalysisResult['purpose'] {
        if (/przekona|sprzeda|pitch|invest/i.test(prompt)) return 'persuade';
        if (/naucz|eduk|wyjaśni|tutorial/i.test(prompt)) return 'educate';
        if (/motyw|inspir|wizj|przyszłość/i.test(prompt)) return 'inspire';
        return 'inform';
    }
    
    private extractKeywords(prompt: string): string[] {
        // Remove common words
        const stopWords = new Set(['i', 'o', 'w', 'z', 'na', 'dla', 'do', 'the', 'a', 'an', 'of', 'in', 'on', 'for']);
        
        const words = prompt
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 3)
            .filter(word => !stopWords.has(word));
        
        // Return unique words sorted by frequency
        const frequency = new Map<string, number>();
        words.forEach(word => {
            frequency.set(word, (frequency.get(word) || 0) + 1);
        });
        
        return Array.from(frequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    }
    
    private analyzeSentiment(prompt: string): AnalysisResult['sentiment'] {
        const positive = /sukces|wzrost|zysk|najlepsz|doskonał|świetn|innowac/i;
        const negative = /problem|spadek|strata|kryzys|ryzyko|zagrożenie/i;
        
        if (positive.test(prompt)) return 'positive';
        if (negative.test(prompt)) return 'negative';
        return 'neutral';
    }
    
    private detectDataIntensity(prompt: string): AnalysisResult['dataIntensity'] {
        const dataIndicators = /statystyk|dane|wykres|liczb|procent|analiz|metric|KPI/i;
        const matches = prompt.match(dataIndicators);
        
        if (!matches) return 'low';
        if (matches.length > 3) return 'high';
        return 'medium';
    }
}
```

## LayoutEngine.ts

```typescript
export interface LayoutDecision {
    type: 'grid' | 'split' | 'timeline' | 'standard';
    params: Record<string, any>;
    reasoning: string;
}

export interface SlideContent {
    type: string;
    title: string;
    text: string;
    bulletPoints?: string[];
    data?: any;
    tags?: string[];
}

export class LayoutEngine {
    private readonly layoutRules: LayoutRule[] = [
        {
            name: 'Title Slide',
            condition: (content) => content.type === 'title',
            layout: {
                type: 'grid',
                params: {
                    drag: '100 40',
                    drop: 'center',
                    bg: 'gradient'
                },
                reasoning: 'Title slides need centered, prominent display'
            }
        },
        {
            name: 'Comparison',
            condition: (content) => this.isComparison(content),
            layout: {
                type: 'split',
                params: {
                    even: true,
                    gap: '3'
                },
                reasoning: 'Side-by-side layout for comparing elements'
            }
        },
        {
            name: 'Timeline',
            condition: (content) => this.isTimeline(content),
            layout: {
                type: 'grid',
                params: {
                    flow: 'row',
                    animate: 'fadeIn',
                    frag: 'auto'
                },
                reasoning: 'Sequential reveal for timeline elements'
            }
        },
        {
            name: 'Data Visualization',
            condition: (content) => this.isDataHeavy(content),
            layout: {
                type: 'grid',
                params: {
                    drag: '80 70',
                    drop: 'center',
                    bg: 'white'
                },
                reasoning: 'Maximum space for charts and graphs'
            }
        },
        {
            name: 'List Heavy',
            condition: (content) => this.isListHeavy(content),
            layout: {
                type: 'split',
                params: {
                    wrap: '3',
                    gap: '2'
                },
                reasoning: 'Multi-column layout for long lists'
            }
        }
    ];
    
    selectLayout(content: SlideContent): LayoutDecision {
        for (const rule of this.layoutRules) {
            if (rule.condition(content)) {
                return rule.layout;
            }
        }
        
        return this.getDefaultLayout();
    }
    
    private isComparison(content: SlideContent): boolean {
        const indicators = [
            /vs\.?|versus|porównanie|compared|różnic|podobieńst/i,
            /advantages|disadvantages|pros|cons|zalety|wady/i,
            /before|after|przed|po|stary|nowy/i
        ];
        
        const hasComparisonStructure = 
            content.bulletPoints?.length === 2 ||
            content.tags?.includes('#COMPARISON');
        
        return indicators.some(pattern => 
            pattern.test(content.text + ' ' + content.title)
        ) || hasComparisonStructure;
    }
    
    private isTimeline(content: SlideContent): boolean {
        const indicators = [
            /timeline|chronolog|historia|ewolucja|roadmap/i,
            /\d{4}.*\d{4}/,  // Years
            /krok \d|step \d|faza|etap/i,
            /najpierw|następnie|potem|finally/i
        ];
        
        return indicators.some(pattern => 
            pattern.test(content.text + ' ' + content.title)
        ) || content.tags?.includes('#TIMELINE');
    }
    
    private isDataHeavy(content: SlideContent): boolean {
        const indicators = [
            /wykres|chart|graph|dane|data|statystyk/i,
            /\d+%|\d+ percent/i,
            /metric|KPI|ROI|analiza/i
        ];
        
        return indicators.some(pattern => 
            pattern.test(content.text)
        ) || content.tags?.includes('#DATA');
    }
    
    private isListHeavy(content: SlideContent): boolean {
        return (content.bulletPoints?.length || 0) > 5;
    }
    
    private getDefaultLayout(): LayoutDecision {
        return {
            type: 'standard',
            params: {},
            reasoning: 'Default layout for standard content'
        };
    }
    
    calculateGridPositions(elements: any[]): GridPosition[] {
        const positions: GridPosition[] = [];
        const gridSize = 10; // 10x10 grid
        
        elements.forEach((element, index) => {
            if (elements.length === 1) {
                // Center single element
                positions.push({
                    drag: '80 60',
                    drop: 'center'
                });
            } else if (elements.length === 2) {
                // Side by side
                positions.push(
                    { drag: '45 60', drop: index === 0 ? 'left' : 'right' }
                );
            } else if (elements.length === 3) {
                // Triangle layout
                if (index === 0) {
                    positions.push({ drag: '60 40', drop: 'top' });
                } else {
                    positions.push({ 
                        drag: '40 40', 
                        drop: index === 1 ? 'bottomleft' : 'bottomright' 
                    });
                }
            } else {
                // Grid layout
                const cols = Math.ceil(Math.sqrt(elements.length));
                const row = Math.floor(index / cols);
                const col = index % cols;
                
                positions.push({
                    drag: `${Math.floor(90/cols)} ${Math.floor(90/cols)}`,
                    drop: `${10 + col * (90/cols)} ${10 + row * (90/cols)}`
                });
            }
        });
        
        return positions;
    }
}

interface LayoutRule {
    name: string;
    condition: (content: SlideContent) => boolean;
    layout: LayoutDecision;
}

interface GridPosition {
    drag: string;
    drop: string;
}
```
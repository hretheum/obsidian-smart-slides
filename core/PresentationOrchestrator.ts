import { DependencyContainer } from './DependencyContainer';
import { EventBus, DomainEvents } from './EventBus';
import { AnalyzerService } from '../services/AnalyzerService';
import { LayoutService } from '../services/LayoutService';
import { StyleService } from '../services/StyleService';
import { SlideComposer } from '../generators/SlideComposer';
import { TextGeneratorAdapter } from '../integrations/TextGeneratorAdapter';
import { ImageGeneratorAdapter } from '../integrations/ImageGeneratorAdapter';

export interface PresentationResult {
    title: string;
    markdown: string;
    metadata: {
        slideCount: number;
        imageCount: number;
        generationTime: number;
        theme: string;
    };
}

export interface PresentationSettings {
    defaultSlideCount: number;
    defaultLanguage: 'pl' | 'en';
    imageStyle: 'photorealistic' | 'illustration' | 'diagram';
    outputFolder: string;
    debugMode: boolean;
}

export type ProgressCallback = (status: string) => void;

export class PresentationOrchestrator {
    private eventBus: EventBus;
    private analyzerService: AnalyzerService;
    private layoutService: LayoutService;
    private styleService: StyleService;
    private slideComposer: SlideComposer;
    private textGenerator: TextGeneratorAdapter;
    private imageGenerator: ImageGeneratorAdapter;
    
    constructor(private container: DependencyContainer) {
        this.eventBus = container.resolve('eventBus');
        this.analyzerService = container.resolve('analyzerService');
        this.layoutService = container.resolve('layoutService');
        this.styleService = container.resolve('styleService');
        this.slideComposer = container.resolve('slideComposer');
        this.textGenerator = container.resolve('textGenerator');
        this.imageGenerator = container.resolve('imageGenerator');
    }
    
    async createPresentation(
        prompt: string,
        settings: PresentationSettings,
        onProgress?: ProgressCallback
    ): Promise<PresentationResult> {
        const startTime = Date.now();
        
        try {
            // Step 1: Content Analysis
            onProgress?.('Analizuję temat...');
            const analysis = await this.analyzerService.analyze(prompt);
            
            await this.eventBus.publishTyped(DomainEvents.CONTENT_ANALYSIS_COMPLETED, {
                prompt,
                analysis
            });
            
            // Step 2: Structure Generation
            onProgress?.('Generuję strukturę prezentacji...');
            const structure = await this.generateStructure(prompt, analysis, settings);
            
            // Step 3: Layout Decisions
            onProgress?.('Projektuję layouty...');
            const slidesWithLayouts = await this.applyLayoutDecisions(structure.slides);
            
            // Step 4: Style Decisions
            onProgress?.('Wybieram style...');
            const theme = await this.styleService.selectTheme(analysis);
            
            // Step 5: Image Generation
            onProgress?.('Generuję obrazy AI...');
            const imagePaths = await this.generateImages(slidesWithLayouts, settings);
            
            // Step 6: Compose Final Presentation
            onProgress?.('Komponuję prezentację...');
            const markdown = this.slideComposer.compose({
                slides: slidesWithLayouts,
                images: imagePaths,
                theme: theme || 'night',
                title: structure.title
            });
            
            const generationTime = Date.now() - startTime;
            
            return {
                title: structure.title,
                markdown,
                metadata: {
                    slideCount: slidesWithLayouts.length,
                    imageCount: imagePaths.length,
                    generationTime,
                    theme: theme || 'night'
                }
            };
            
        } catch (error) {
            await this.eventBus.publishTyped(DomainEvents.PRESENTATION_GENERATION_FAILED, {
                prompt,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    
    private async generateStructure(prompt: string, analysis: any, settings: PresentationSettings) {
        // This would use the text generator to create presentation structure
        // For now, return a mock structure
        return {
            title: 'Generated Presentation',
            slides: [
                { title: 'Slide 1', content: 'Content 1', imagePrompt: 'Image prompt 1' },
                { title: 'Slide 2', content: 'Content 2', imagePrompt: 'Image prompt 2' }
            ]
        };
    }
    
    private async applyLayoutDecisions(slides: any[]): Promise<any[]> {
        const slidesWithLayouts = [];
        
        for (const slide of slides) {
            const layout = await this.layoutService.selectLayout(slide);
            
            await this.eventBus.publishTyped(DomainEvents.LAYOUT_DECISION_MADE, {
                slideId: slide.id || slides.indexOf(slide),
                layout
            });
            
            slidesWithLayouts.push({
                ...slide,
                layout
            });
        }
        
        return slidesWithLayouts;
    }
    
    private async generateImages(slides: any[], settings: PresentationSettings): Promise<string[]> {
        const imagePrompts = slides
            .map(slide => slide.imagePrompt)
            .filter(Boolean);
        
        if (imagePrompts.length === 0) return [];
        
        // Generate images with rate limiting (batch size of 3)
        const batchSize = 3;
        const imagePaths: string[] = [];
        
        for (let i = 0; i < imagePrompts.length; i += batchSize) {
            const batch = imagePrompts.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (prompt, index) => {
                try {
                    await this.eventBus.publishTyped(DomainEvents.IMAGE_GENERATION_STARTED, {
                        prompt,
                        index: i + index
                    });
                    
                    const imagePath = await this.imageGenerator.generate({
                        prompt,
                        style: settings.imageStyle,
                        size: '1024x1024',
                        folder: `${settings.outputFolder}/images`
                    });
                    
                    await this.eventBus.publishTyped(DomainEvents.IMAGE_GENERATION_COMPLETED, {
                        prompt,
                        imagePath,
                        index: i + index
                    });
                    
                    return imagePath;
                    
                } catch (error) {
                    await this.eventBus.publishTyped(DomainEvents.IMAGE_GENERATION_FAILED, {
                        prompt,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        index: i + index
                    });
                    
                    console.error(`[PresentationOrchestrator] Image ${i + index} failed:`, error);
                    return null;
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            imagePaths.push(...batchResults.filter(Boolean) as string[]);
        }
        
        return imagePaths;
    }
}
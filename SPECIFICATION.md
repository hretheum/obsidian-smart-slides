# Specyfikacja Smart Slides dla Obsidian
## Plugin automatycznego generowania prezentacji z AI

### Informacje ogólne

**Nazwa projektu:** Smart Slides for Obsidian  
**Wersja:** 1.0.0  
**Typ:** Plugin dla Obsidian  
**Architektura:** Hybrydowa (LLM + lokalna inteligencja)  
**Data:** 2025-01-09  

---

## 1. Opis projektu

### 1.1 Cel
Automatyczne generowanie profesjonalnych prezentacji w formacie Markdown kompatybilnym z wtyczką Obsidian Slides Extended. System przyjmuje prosty prompt tekstowy i bez żadnej dodatkowej konfiguracji generuje kompletną prezentację z obrazami i zaawansowanymi layoutami.

### 1.2 Filozofia "Zero konfiguracji"
- Użytkownik wprowadza TYLKO prompt
- System automatycznie dedukuje wszystkie parametry
- Brak pytań zwrotnych i formularzy konfiguracyjnych
- Inteligentne domyślne ustawienia

### 1.3 Kluczowe cechy
- Pełna automatyzacja procesu generowania
- Inteligentna analiza kontekstu i intencji
- Automatyczny dobór layoutów i stylów
- Generowanie wysokiej jakości obrazów AI
- Wykorzystanie istniejących pluginów Obsidian

---

## 2. Wymagania funkcjonalne

### 2.1 Podstawowe funkcjonalności

#### RF-001: Przyjmowanie promptu
- **Opis:** System przyjmuje prompt w języku naturalnym
- **Warunki:** 
  - Min. 10 znaków, max. 5000 znaków
  - Obsługa języka polskiego i angielskiego
- **Wyjście:** Prompt gotowy do analizy

#### RF-002: Analiza intencji (Lokalna)
- **Opis:** Lokalna analiza semantyczna promptu
- **Proces:**
  - Wykrywanie grupy docelowej
  - Określenie domeny/branży
  - Rozpoznanie celu prezentacji
  - Określenie poziomu formalności
- **Wyjście:** Obiekt kontekstu prezentacji

#### RF-003: Generowanie struktury (LLM)
- **Opis:** Wykorzystanie LLM do wygenerowania struktury prezentacji
- **Proces:**
  - Przygotowanie wzbogaconego promptu
  - Wywołanie Text Generator Plugin
  - Parsowanie odpowiedzi JSON
- **Wyjście:** Struktura 8-12 slajdów z metadanymi

#### RF-004: Inteligentny dobór layoutów (Lokalna)
- **Opis:** Automatyczny wybór layoutu dla każdego slajdu
- **Typy layoutów:**
  - Grid dla slajdów tytułowych
  - Split dla porównań
  - Timeline dla procesów
  - Data grid dla wizualizacji
- **Wyjście:** Parametry layoutu dla każdego slajdu

#### RF-005: Generowanie obrazów (Plugin)
- **Opis:** Tworzenie obrazów przez DALL-E lub podobny plugin
- **Proces:**
  - Generowanie promptów dla obrazów
  - Równoległe wywołania API
  - Zapis w folderze prezentacji
- **Wyjście:** Ścieżki do wygenerowanych obrazów

#### RF-006: Kompozycja Markdown
- **Opis:** Składanie finalnego pliku Markdown
- **Elementy:**
  - Nagłówek YAML z konfiguracją
  - Slajdy ze składnią Slides Extended
  - Osadzone obrazy
  - Animacje i fragmenty
- **Wyjście:** Kompletny plik .md

---

## 3. Wymagania niefunkcjonalne

### 3.1 Wydajność
- Czas generowania: max 60 sekund dla 10 slajdów
- Równoległe przetwarzanie obrazów
- Responsywny UI podczas generowania

### 3.2 Niezawodność
- Graceful degradation przy braku pluginów
- Fallback na prostsze layouty przy błędach
- Automatyczne retry dla API

### 3.3 Użyteczność
- Jeden klik do wygenerowania prezentacji
- Jasne komunikaty o postępie
- Intuicyjne komunikaty błędów

### 3.4 Kompatybilność
- Obsidian v1.0.0+
- Slides Extended Plugin v2.0.0+
- Text Generator Plugin v0.5.0+
- Opcjonalnie: DALL-E Plugin lub alternatywy

---

## 4. Architektura techniczna

### 4.1 Komponenty główne

```
┌─────────────────────────────────────────┐
│          Main Plugin Class              │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │  Intelligence │  │   Generators    │ │
│  │    Engine     │  │                 │ │
│  │              │  │ - SlideComposer │ │
│  │ - Analyzer   │  │ - ImagePrompts  │ │
│  │ - Layout     │  │ - Markdown      │ │
│  │   Selector   │  └─────────────────┘ │
│  └──────────────┘                      │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │      Plugin Integrations         │  │
│  │                                  │  │
│  │ - TextGeneratorAdapter          │  │
│  │ - ImageGeneratorAdapter         │  │
│  │ - TemplaterAdapter (optional)   │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 4.2 Flow danych

1. **Input** → Prompt od użytkownika
2. **Local Analysis** → Kontekst i parametry
3. **LLM Processing** → Struktura i treść
4. **Layout Engine** → Decyzje wizualne
5. **Image Generation** → Obrazy AI
6. **Composition** → Finalne złożenie
7. **Output** → Plik Markdown + obrazy

---

## 5. Integracje z pluginami

### 5.1 Wymagane pluginy

#### Text Generator Plugin
- **Rola:** Generowanie treści przez LLM
- **API:** `textGen.api.generate()`
- **Konfiguracja:** Użytkownik ustawia własne API keys

#### Image Generator (DALL-E lub alternatywa)
- **Rola:** Generowanie obrazów
- **API:** `imageGen.api.generateImage()`
- **Alternatywy:** 
  - DALL-E Plugin
  - Stable Diffusion Plugin
  - AI Image Generator

### 5.2 Opcjonalne pluginy

#### Templater
- **Rola:** Zaawansowane szablony
- **Użycie:** Customowe layouty użytkownika

#### Local Images Plus
- **Rola:** Zarządzanie obrazami
- **Użycie:** Organizacja i optymalizacja

---

## 6. Inteligencja lokalna

### 6.1 Analyzer (ContentAnalyzer.ts)

```typescript
interface AnalysisResult {
    audience: 'students' | 'executives' | 'technical' | 'general';
    formality: number; // 1-10
    domain: 'business' | 'tech' | 'science' | 'education' | 'general';
    purpose: 'inform' | 'persuade' | 'educate' | 'inspire';
    dataIntensity: 'low' | 'medium' | 'high';
}
```

### 6.2 Layout Engine (LayoutEngine.ts)

```typescript
interface LayoutDecision {
    type: 'grid' | 'split' | 'timeline' | 'standard';
    params: {
        // Dla grid
        drag?: string;
        drop?: string;
        bg?: string;
        animate?: string;
        // Dla split
        even?: boolean;
        gap?: string;
        left?: string;
        right?: string;
    };
    reasoning: string;
}
```

### 6.3 Reguły decyzyjne

| Wykryty wzorzec | Layout | Parametry |
|-----------------|--------|-----------|
| Porównanie | Split | even, gap="3" |
| Timeline/Proces | Grid | animacje frag |
| Dane/Wykresy | Grid | drag="70 60" |
| Tytuł | Grid | center, gradient |
| Lista > 5 elem | Split | wrap="3" |

---

## 7. Prompt Engineering

### 7.1 Struktura promptu systemowego

```
Jesteś ekspertem od prezentacji jak Gamma.app.
Kontekst: [WSTRZYKNIĘTY Z ANALIZY LOKALNEJ]
- Audience: {audience}
- Formality: {formality}/10
- Domain: {domain}

Wygeneruj JSON ze strukturą:
{
    "slides": [
        {
            "type": "title|content|comparison|timeline|data",
            "title": "...",
            "content": "...",
            "bulletPoints": [...],
            "imagePrompt": "...",
            "layoutHint": "#TAG"
        }
    ]
}

TAGI do użycia:
#COMPARISON - dla porównań
#TIMELINE - dla procesów
#DATA - dla danych
#SECTION - dla tytułów sekcji
```

### 7.2 Parametry LLM
- Temperature: 0.3 (dla spójności)
- Max tokens: 4000
- Format: JSON
- Model: Preferowany przez użytkownika w Text Generator

---

## 8. Struktura projektu

```
obsidian-smart-slides/
├── src/
│   ├── main.ts
│   ├── intelligence/
│   │   ├── ContentAnalyzer.ts
│   │   ├── LayoutEngine.ts
│   │   ├── StyleDecider.ts
│   │   └── PromptEngineer.ts
│   ├── generators/
│   │   ├── SlideComposer.ts
│   │   ├── ImagePromptGenerator.ts
│   │   ├── MarkdownBuilder.ts
│   │   └── GridCalculator.ts
│   ├── integrations/
│   │   ├── PluginDetector.ts
│   │   ├── TextGeneratorAdapter.ts
│   │   ├── ImageGeneratorAdapter.ts
│   │   └── BaseAdapter.ts
│   ├── ui/
│   │   ├── PromptModal.ts
│   │   ├── ProgressModal.ts
│   │   └── SettingsTab.ts
│   ├── templates/
│   │   ├── layouts.ts
│   │   ├── themes.ts
│   │   └── animations.ts
│   └── types/
│       └── index.ts
├── styles.css
├── manifest.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## 9. User Flow

### 9.1 Podstawowy przepływ

1. **Uruchomienie**
   - Command Palette: "Generate Smart Slides"
   - Lub Ribbon icon

2. **Input**
   - Modal z polem tekstowym
   - Placeholder: "O czym ma być prezentacja?"
   - Przycisk: "Generuj"

3. **Przetwarzanie**
   - Progress bar z etapami:
     - "Analizuję temat..." (2s)
     - "Generuję strukturę..." (10s)
     - "Tworzę obrazy..." (30s)
     - "Komponuję slajdy..." (5s)

4. **Rezultat**
   - Utworzenie folderu: `Presentations/[timestamp]-[title]/`
   - Otwarcie pliku w edytorze
   - Notyfikacja: "Prezentacja gotowa!"

### 9.2 Obsługa błędów

| Błąd | Komunikat | Akcja |
|------|-----------|-------|
| Brak Text Generator | "Zainstaluj Text Generator Plugin" | Link do Community Plugins |
| Błąd API | "Sprawdź konfigurację API keys" | Otwarcie ustawień |
| Timeout | "Generowanie trwa dłużej..." | Opcja anulowania |

---

## 10. Konfiguracja pluginu

### 10.1 Ustawienia podstawowe

```typescript
interface SmartSlidesSettings {
    // Wybór pluginów
    textGeneratorPlugin: string;
    imageGeneratorPlugin: string;
    
    // Parametry generowania
    defaultSlideCount: number; // 8-12
    defaultLanguage: 'pl' | 'en';
    imageStyle: 'photorealistic' | 'illustration' | 'diagram';
    
    // Zaawansowane
    enableDebugMode: boolean;
    customPromptTemplate: string;
    outputFolder: string; // domyślnie "Presentations"
}
```

### 10.2 Ustawienia zaawansowane
- Custom prompt templates
- Własne reguły layoutów
- Mapowanie domen do stylów
- Cache ustawień per vault

---

## 11. MVP - Zakres pierwszej wersji

### ✅ Wersja 1.0 zawiera:
- Podstawowa analiza promptu
- Generowanie 8-10 slajdów
- 3 typy layoutów (grid, split, standard)
- Integracja z Text Generator
- Integracja z jednym Image Generator
- Polski i angielski

### ❌ Wersja 1.0 NIE zawiera:
- Edycja po wygenerowaniu
- Historia generowań
- Eksport do innych formatów
- Współpraca zespołowa
- Custom templates
- Batch processing

---

## 12. Roadmap

### Faza 1: MVP (2 tygodnie)
- [x] Setup projektu
- [ ] Podstawowa analiza lokalna
- [ ] Integracja Text Generator
- [ ] Prosty Layout Engine
- [ ] Podstawowy UI

### Faza 2: Obrazy (1 tydzień)
- [ ] Integracja DALL-E Plugin
- [ ] Fallback na inne generatory
- [ ] Optymalizacja obrazów

### Faza 3: Inteligencja (2 tygodnie)
- [ ] Zaawansowana analiza kontekstu
- [ ] Więcej typów layoutów
- [ ] Animacje i przejścia
- [ ] Style per domena

### Faza 4: Polish (1 tydzień)
- [ ] Testy użytkowników
- [ ] Optymalizacja wydajności
- [ ] Dokumentacja
- [ ] Publikacja w Community Plugins
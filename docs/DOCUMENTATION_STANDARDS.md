# Documentation Templates & Standards

## 🎯 **Objective**
This document establishes comprehensive documentation standards and reusable templates for the Obsidian Smart Slides Plugin, ensuring consistent, accessible, and maintainable documentation across all project artifacts.

## 📋 **Documentation Types & Templates**

### **1. Architecture Decision Records (ADRs)**

#### **Template: ADR Document**
```markdown
# ADR-XXX: [Decision Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-YYY]

## Context
[Describe the architectural issue or decision point]

## Decision
[State the decision clearly and concisely]

## Consequences
[Describe the positive and negative consequences of this decision]

### Positive
- [List positive outcomes]
- [Impact on maintainability, performance, etc.]

### Negative  
- [List trade-offs and limitations]
- [Technical debt or complexity added]

## Implementation Notes
[Technical details about how the decision will be implemented]

## Related Decisions
- [Link to related ADRs]
- [Dependencies and impacts]

---
**Date:** [YYYY-MM-DD]
**Author:** [Name]
**Reviewers:** [List of reviewers]
**Status:** [Current status]
```

#### **Example ADR**
```markdown
# ADR-001: Event-Driven Architecture with EventBus

## Status
Accepted

## Context
The Smart Slides plugin requires loose coupling between services (AnalyzerService, LayoutService, StyleService) to enable independent development, testing, and future extensibility. Direct service-to-service dependencies create tight coupling and make the system difficult to modify.

## Decision
Implement an EventBus pattern using TypeScript interfaces for type-safe domain events. All inter-service communication will use the EventBus with strongly-typed event payloads.

## Consequences

### Positive
- Loose coupling enables independent service development
- Type-safe events prevent runtime errors
- Easy to add new services without modifying existing code
- Improved testability through event mocking
- Clear audit trail of system operations

### Negative
- Additional complexity in event handling
- Potential performance overhead for high-frequency events
- Learning curve for developers unfamiliar with event-driven patterns
- Debugging across event boundaries can be challenging

## Implementation Notes
```typescript
// Event definitions
export const DomainEvents = {
    CONTENT_ANALYSIS_COMPLETED: 'content.analysis.completed',
    LAYOUT_DECISION_MADE: 'layout.decision.made',
    STYLE_DECISION_MADE: 'style.decision.made'
} as const;

// Usage pattern
await eventBus.publishTyped(DomainEvents.CONTENT_ANALYSIS_COMPLETED, {
    analysis, analysisTimeMs: duration
});
```

## Related Decisions
- ADR-002: Dependency Injection Container (enables EventBus registration)
- ADR-003: Result<T> Pattern (standardizes event error handling)

---
**Date:** 2025-08-14
**Author:** Tech Lead
**Reviewers:** Architecture Team
**Status:** Accepted
```

---

---

### **2. Changelog Template**

#### **Template: CHANGELOG.md**
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- [New features]

### Changed
- [Changes to existing functionality]

### Deprecated
- [Soon-to-be removed features]

### Removed
- [Now removed features]

### Fixed
- [Bug fixes]

### Security
- [Vulnerability fixes]

## [1.2.0] - 2025-08-14

### Added
- Smart presentation generation with AI analysis
- Theme selection based on audience detection
- Batch slide generation with progress tracking

### Changed
- Improved error handling for API timeouts
- Enhanced UI accessibility with screen reader support

### Fixed
- Memory leak in presentation orchestrator
- XSS vulnerability in prompt input validation

### Security
- Added input sanitization for all user-provided content
- Implemented API key encryption in settings storage

## [1.1.0] - 2025-07-15

### Added
- Basic slide generation functionality
- Integration with Text Generator plugin
- Settings panel for configuration

## [1.0.0] - 2025-06-01

### Added
- Initial release
- Core plugin infrastructure
- Basic UI components
```

#### **Template: Migration Guide**
```markdown
# Migration Guide: v[X.Y.Z] to v[A.B.C]

## Overview
[Brief summary of breaking changes and migration scope]

## Breaking Changes

### [Change Category 1]
**What Changed:** [Description of the change]
**Why:** [Rationale for the breaking change]
**Impact:** [Who is affected and how]

#### Before (v[X.Y.Z])
```typescript
// Old API usage
const result = await oldService.method(param);
```

#### After (v[A.B.C])
```typescript
// New API usage
const result = await newService.method({ param, options });
```

#### Migration Steps
1. [Specific step-by-step instructions]
2. [Include any data migration needed]
3. [Testing recommendations]

### [Change Category 2]
[Repeat pattern for each breaking change]

## Deprecated Features

| Feature | Deprecated In | Removed In | Replacement |
|---------|---------------|------------|-------------|
| `oldMethod()` | v1.2.0 | v2.0.0 | `newMethod()` |

## Automated Migration Tools

```bash
# Run migration script
npm run migrate:v1-to-v2

# Validate migration
npm run validate:migration
```

## Support
- [GitHub Issues](link) for migration problems
- [Migration FAQ](link) for common questions
- [Community Discussion](link) for help from other users
```

---

### **3. API Documentation Templates**

#### **Template: Service Class Documentation**
```typescript
/**
 * [Brief description of the service's primary responsibility]
 * 
 * @example
 * ```typescript
 * const analyzer = new ContentAnalyzer(eventBus);
 * const result = await analyzer.analyze('Create a tech presentation');
 * 
 * if (result.success) {
 *     console.log(result.data.audience); // 'technical'
 * }
 * ```
 * 
 * @see {@link [Related Documentation URL]}
 * @since 1.0.0
 */
export class ServiceName {
    /**
     * [Method description explaining what it does and why]
     * 
     * @param param1 - [Description with constraints and validation rules]
     * @param param2 - [Optional parameter description]
     * @returns Promise resolving to [detailed return type description]
     * 
     * @throws {ValidationError} When input parameters fail validation
     * @throws {ServiceError} When external service calls fail
     * @throws {TimeoutError} When operation exceeds configured timeout
     * 
     * @example
     * ```typescript
     * // Basic usage
     * const result = await service.method('input');
     * 
     * // Error handling
     * if (!result.success) {
     *     console.error(result.error.message);
     *     return;
     * }
     * 
     * // Using the result
     * processData(result.data);
     * ```
     * 
     * @see {@link RelatedMethod} for alternative approaches
     * @since 1.0.0
     * @version 1.2.0 - Added timeout parameter
     */
    async methodName(
        param1: Type1,
        param2?: Type2,
        options: MethodOptions = {}
    ): Promise<Result<ReturnType>> {
        // Implementation
    }
}
```

#### **Template: Interface Documentation**
```typescript
/**
 * [Interface description with usage context]
 * 
 * @example
 * ```typescript
 * const analysis: ContentAnalysis = {
 *     audience: 'technical',
 *     formality: 7,
 *     domain: 'technology'
 * };
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export interface InterfaceName {
    /**
     * [Property description with valid values and constraints]
     * 
     * @remarks
     * [Additional context about usage, validation, or behavior]
     * 
     * @example 'technical' | 'business' | 'academic'
     */
    property: PropertyType;
    
    /**
     * [Optional property description]
     * 
     * @defaultValue [Default value if not provided]
     * @deprecated Use `newProperty` instead
     */
    optionalProperty?: OptionalType;
}
```

---

### **3. User Guide Templates**

#### **Template: Feature Documentation**
```markdown
# [Feature Name]

## Overview
[Brief description of what the feature does and why it's useful]

## Prerequisites
- [Required dependencies or setup]
- [Minimum version requirements]
- [Required permissions or API keys]

## Quick Start

### Basic Usage
1. [Step-by-step instructions for most common use case]
2. [Include screenshots where helpful]
3. [Expected results at each step]

```typescript
// Code example for basic usage
const result = await feature.basicUsage();
```

### Advanced Configuration
[More complex scenarios with detailed explanations]

```typescript
// Advanced usage example
const result = await feature.advancedUsage({
    option1: 'value',
    option2: true
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `option1` | `string` | `'default'` | [Description of what this option controls] |
| `option2` | `boolean` | `false` | [When to enable this option] |

## Examples

### Example 1: [Common Scenario]
[Detailed walkthrough of a real-world use case]

```typescript
// Complete working example
const config = {
    setting: 'value'
};
const result = await feature.execute(config);
```

**Expected Output:**
```json
{
    "success": true,
    "data": {
        "result": "processed data"
    }
}
```

## Troubleshooting

### Common Issues

#### Issue: [Specific error message or problem]
**Cause:** [Why this happens]
**Solution:** [Step-by-step fix]

#### Issue: [Another common problem]
**Cause:** [Root cause explanation]
**Solution:** [How to resolve]

## API Reference
[Links to detailed API documentation]

## Related Features
- [Link to related documentation]
- [Cross-references to dependent features]

---
**Last Updated:** [Date]
**Applies to Version:** [Version range]
```

---

### **4. README Templates**

#### **Template: Project README**
```markdown
# [Project Name]

[Brief project description and value proposition]

![Plugin Demo](docs/assets/demo.gif)

## 🚀 Features

- **[Feature 1]:** [Brief description with benefit]
- **[Feature 2]:** [Brief description with benefit]
- **[Feature 3]:** [Brief description with benefit]

## 📋 Prerequisites

- **Obsidian:** Version 0.15.0 or later
- **[Required Plugin]:** [Version requirement if applicable]
- **[External Service]:** [API key or service requirement]

## ⚡ Quick Start

### Installation

#### From Community Plugins (Recommended)
1. Open Obsidian Settings → Community Plugins
2. Disable Safe Mode
3. Browse community plugins and search for "[Plugin Name]"
4. Install and enable the plugin

#### Manual Installation
1. Download the latest release from [GitHub Releases](link)
2. Extract files to `VaultFolder/.obsidian/plugins/plugin-name/`
3. Reload Obsidian and enable the plugin

### First Use

1. **Configure API Keys** (if required)
   - Go to Settings → [Plugin Name]
   - Add your [Service] API key

2. **Create Your First Presentation**
   ```
   1. Open command palette (Ctrl/Cmd + P)
   2. Run "Create Smart Slides"
   3. Enter your presentation topic
   4. Wait for generation to complete
   ```

3. **Customize Settings** (optional)
   - Adjust theme preferences
   - Set default slide count
   - Configure advanced options

## 📖 Documentation

- **[User Guide](docs/USER_GUIDE.md)** - Complete usage instructions
- **[API Reference](docs/API.md)** - Developer documentation
- **[Configuration](docs/CONFIGURATION.md)** - All settings explained
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## 🔧 Development

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/user/obsidian-smart-slides.git
cd obsidian-smart-slides

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Building

```bash
# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and development process.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following our [Code Standards](docs/CODE_STANDARDS.md)
4. Add tests for your changes
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Obsidian](https://obsidian.md) for the excellent platform
- [Community Plugin Template](link) for the project structure
- [External Service](link) for API integration

## 📞 Support

- **Issues:** [GitHub Issues](link)
- **Discussions:** [GitHub Discussions](link)
- **Documentation:** [Wiki](link)

---

**Made with ❤️ for the Obsidian community**
```

---

### **5. Troubleshooting Guide Template**

#### **Template: Troubleshooting Document**
```markdown
# Troubleshooting Guide

## 🔍 Diagnostic Information

Before reporting issues, please collect the following information:

### System Information
- **Obsidian Version:** [Help → About]
- **Plugin Version:** [Settings → Community Plugins → [Plugin Name]]
- **Operating System:** [Windows/Mac/Linux version]
- **Node.js Version:** (for developers) [node --version]

### Plugin Information
- **Settings Configuration:** [Export from Settings → [Plugin Name]]
- **Console Logs:** [Open Developer Tools → Console tab]
- **Error Messages:** [Copy exact error text]

## 🚨 Common Issues

### Installation Issues

#### Issue: Plugin doesn't appear in Community Plugins
**Symptoms:**
- Cannot find plugin in search
- Installation button disabled

**Diagnosis Steps:**
1. Check Obsidian version (must be 0.15.0+)
2. Verify Safe Mode is disabled
3. Check internet connection
4. Refresh plugin list

**Solutions:**
- **Outdated Obsidian:** Update to latest version
- **Safe Mode:** Go to Settings → Community Plugins → Turn off Safe Mode
- **Network Issues:** Check firewall/proxy settings
- **Plugin Not Approved:** Use manual installation method

---

#### Issue: Plugin installed but not working
**Symptoms:**
- Plugin shows as installed but no features work
- Commands don't appear in command palette
- No UI elements visible

**Diagnosis Steps:**
1. Check if plugin is enabled (should show green toggle)
2. Look for error messages in console (Ctrl/Cmd+Shift+I → Console)
3. Verify plugin files in `.obsidian/plugins/[plugin-name]/`
4. Check for conflicting plugins

**Solutions:**
```bash
# Check plugin files exist
ls -la .obsidian/plugins/smart-slides/
# Should show: main.js, manifest.json, styles.css

# Reset plugin settings
1. Disable plugin
2. Delete plugin folder
3. Reinstall from Community Plugins
```

### Usage Issues

#### Issue: "API Key Invalid" Error
**Symptoms:**
```
Error: Invalid API key provided
Generation failed: Authentication error
```

**Diagnosis Steps:**
1. Verify API key format and length
2. Check API key permissions/scopes
3. Test API key with external tool
4. Check for special characters or spaces

**Solutions:**
- **Invalid Key:** Generate new API key from service provider
- **Expired Key:** Refresh or renew API key
- **Insufficient Permissions:** Ensure API key has required scopes
- **Copy/Paste Issues:** Re-enter key manually, avoid trailing spaces

---

#### Issue: Generation Takes Too Long or Times Out
**Symptoms:**
- Generation never completes
- Timeout errors after 30+ seconds
- Plugin becomes unresponsive

**Diagnosis Steps:**
1. Check internet connection speed
2. Monitor network requests in Developer Tools
3. Check API service status
4. Verify prompt length and complexity

**Solutions:**
```typescript
// Reduce prompt complexity
const simplePrompt = "Create a short presentation about cats";

// Check timeout settings
Settings → Smart Slides → Advanced → Timeout (increase to 60s)

// Monitor performance
1. Open Developer Tools
2. Go to Network tab
3. Start generation
4. Look for failed/slow requests
```

### Performance Issues

#### Issue: Obsidian Becomes Slow When Plugin is Active
**Symptoms:**
- Obsidian UI lag or freezing
- High CPU/memory usage
- Delayed response to user input

**Diagnosis Steps:**
1. Check memory usage in Task Manager
2. Monitor CPU usage during generation
3. Test with plugin disabled
4. Check for memory leaks after multiple generations

**Solutions:**
```bash
# Monitor memory usage
1. Open Task Manager/Activity Monitor
2. Watch Obsidian process during generation
3. Look for memory that doesn't return to baseline

# Reduce memory usage
Settings → Smart Slides → Performance
- Lower concurrent requests
- Enable caching
- Reduce max slide count
```

## 🔧 Advanced Troubleshooting

### Enable Debug Mode

```typescript
// Add to plugin settings or main.ts
const DEBUG_MODE = true;

if (DEBUG_MODE) {
    console.log('Smart Slides Debug:', data);
}
```

### Plugin Log Analysis

```bash
# View plugin logs (Linux/Mac)
tail -f ~/.config/obsidian/logs/plugin.log

# Windows
type "%APPDATA%\\obsidian\\logs\\plugin.log"
```

### Network Request Debugging

```javascript
// Open Developer Tools → Console
// Paste this code to monitor API requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('API Request:', args[0]);
    return originalFetch.apply(this, args)
        .then(response => {
            console.log('API Response:', response.status);
            return response;
        });
};
```

## 🆘 Getting Help

### Before Requesting Support

1. **Search Existing Issues:** [GitHub Issues](link)
2. **Check Documentation:** [User Guide](link)
3. **Try Safe Mode:** Test with all other plugins disabled
4. **Collect Debug Information:** Use diagnostic steps above

### Creating Support Request

Include the following information:

```markdown
## Environment
- Obsidian Version: 
- Plugin Version: 
- Operating System: 
- Other Active Plugins: 

## Issue Description
[Detailed description of the problem]

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Error Messages
```
[Copy exact error text or console logs]
```

## Screenshots
[If applicable]
```

### Support Channels

- **Bug Reports:** [GitHub Issues](link)
- **Feature Requests:** [GitHub Discussions](link)
- **General Questions:** [Community Forum](link)
- **Security Issues:** [Email](security@example.com)

---

## 📋 Diagnostic Checklist

Before reporting issues, verify:

- [ ] Obsidian version 0.15.0 or later
- [ ] Plugin is latest version
- [ ] Safe Mode is disabled  
- [ ] Plugin is enabled (green toggle)
- [ ] API keys configured correctly
- [ ] No console errors
- [ ] Other plugins disabled (isolation test)
- [ ] Issue persists after restart
- [ ] Searched existing issues
- [ ] Followed troubleshooting steps

**Last Updated:** [Date]
**Plugin Version:** [Version]
```

---

## 📏 **Documentation Quality Standards**

### **Writing Guidelines**

#### **1. Clarity and Accessibility**
- **Plain Language:** Use simple, clear language avoiding unnecessary jargon
- **Active Voice:** Prefer active voice over passive voice
- **Consistent Terminology:** Use the same terms throughout all documentation
- **Logical Structure:** Organize information from general to specific

#### **2. Technical Accuracy**
- **Code Examples:** All code examples must be tested and working
- **Version Accuracy:** Specify version requirements and compatibility
- **Link Validation:** All links must be functional and regularly checked
- **Screenshot Currency:** Update screenshots with each UI change

#### **3. User-Focused Content**
- **Task-Oriented:** Structure content around what users want to accomplish
- **Progressive Disclosure:** Start with basics, then provide advanced details
- **Context Awareness:** Explain not just "how" but "when" and "why"
- **Error Prevention:** Anticipate and address common mistakes

### **Formatting Standards**

#### **1. Markdown Conventions**
```markdown
# Document Title (H1 - one per document)
## Major Section (H2)
### Subsection (H3)
#### Details (H4 - maximum depth)

**Bold** for emphasis and UI elements
*Italic* for first mention of concepts
`Code` for inline code, filenames, settings
```

#### **2. Code Block Standards**
```typescript
// ✅ GOOD: Include language identifier and comments
/**
 * Example with clear context and expected output
 */
const example = await service.method('input');
console.log(example); // Expected: { success: true, data: ... }
```

```markdown
<!-- ❌ BAD: No language identifier or context -->
const example = service.method();
```

#### **3. Link Standards**
```markdown
<!-- ✅ GOOD: Descriptive link text -->
See the [API Authentication Guide](docs/authentication.md) for setup instructions.

<!-- ❌ BAD: Generic link text -->
Click [here](docs/authentication.md) for more information.
```

### **Content Validation Checklist**

#### **Pre-Publication Review**
- [ ] **Accuracy:** All information is current and correct
- [ ] **Completeness:** No missing steps or prerequisites
- [ ] **Clarity:** Technical concepts explained clearly
- [ ] **Examples:** Code examples tested and functional
- [ ] **Links:** All internal and external links working
- [ ] **Screenshots:** Images current and properly sized
- [ ] **Accessibility:** Alt text for images, proper heading structure
- [ ] **Consistency:** Formatting and terminology consistent

#### **Automated Validation Tools**
```bash
# Documentation linting
npm run docs:lint

# Link checking  
npm run docs:check-links

# Spell checking
npm run docs:spellcheck

# Code example validation
npm run docs:test-examples
```

---

## 🔄 **Documentation Maintenance**

### **Update Triggers & Automation**

#### **Automated Updates**
```yaml
# .github/workflows/docs-update.yml
triggers:
  code_changes:
    files: ['src/**/*.ts']
    action: 'regenerate-api-docs'
    
  ui_changes:
    files: ['src/ui/**/*']
    action: 'flag-screenshot-review'
    
  version_bump:
    files: ['manifest.json', 'package.json']
    action: 'update-version-metadata'
```

#### **Manual Update Triggers**
- **Feature Releases:** Update user guides and examples
- **Bug Fixes:** Update troubleshooting guides
- **Breaking Changes:** Create migration guides
- **Security Updates:** Update security documentation
- **UI Changes:** Update screenshots and step-by-step guides

#### **Documentation Rollback Strategy**
```bash
# When documentation becomes outdated
git tag docs/v1.2.0-rollback
git checkout docs/last-known-good

# Partial rollback for specific documents
git checkout HEAD~1 -- docs/troubleshooting.md
```

### **Review Schedule**
- **Monthly:** Review troubleshooting guides for new patterns
- **Quarterly:** Comprehensive documentation audit
- **Per Release:** Update version-specific information
- **Annual:** Review and refresh all templates

### **Unified Metadata Standard**
```yaml
---
title: "Document Title"
version: "1.2.0"
last_updated: "2025-08-14"
obsidian_version: "0.15.0+"
review_date: "2025-09-14"
owner: "team-name"
status: "current" # current | outdated | deprecated
tags: ["api", "user-guide", "troubleshooting"]
difficulty: "beginner" # beginner | intermediate | advanced
---
```

### **Documentation Ownership Matrix**

| Document Type | Primary Owner | Secondary Owner | Review Frequency | Auto-Update | Maintenance Effort |
|---------------|---------------|-----------------|------------------|-------------|--------------------|
| ADRs | Architecture Team | Tech Lead | Per major decision | No | Low |
| API Documentation | Developers | Documentation Team | Per code change | Yes (TSDoc) | Medium |
| User Guides | Technical Writers | Product Owner | Monthly | Partial | High |
| Troubleshooting | Support Team | QA Engineers | Weekly | Issue-driven | High |
| README | Project Lead | Marketing | Per release | Partial | Medium |
| Code Standards | Tech Lead | Senior Developers | Quarterly | No | Low |
| Testing Strategy | QA Lead | Developers | Monthly | No | Medium |

### **Template Complexity Levels**

#### **Quick Reference Templates** (< 100 lines)
- API method documentation
- Configuration options
- Error code reference
- Quick start guides

#### **Standard Templates** (100-300 lines)
- Feature documentation
- Integration guides
- Architecture decisions
- User workflows

#### **Comprehensive Guides** (300+ lines)
- Complete troubleshooting guides
- Full API reference
- Migration documentation
- Security documentation

**Usage Guideline:** Start with Quick Reference, expand to Standard as needed, only use Comprehensive for complex topics requiring detailed coverage.

---

## ✅ **Template Validation**

### **Template Completeness Checklist**
- [ ] ADR template covers all architectural decisions
- [ ] API documentation template includes all TSDoc requirements
- [ ] User guide template addresses common user journeys
- [ ] README template includes all necessary sections
- [ ] Troubleshooting template covers diagnostic procedures
- [ ] Changelog template follows Keep a Changelog format
- [ ] Migration guide template covers breaking changes
- [ ] All templates include unified metadata standard
- [ ] Templates are accessible and screen-reader friendly
- [ ] Code examples in templates are tested and functional
- [ ] Visual elements follow accessibility guidelines
- [ ] Templates support different complexity levels (Quick/Standard/Comprehensive)

### **Quality Assurance Process**
1. **Template Creation:** Use established templates for all new documentation
2. **Peer Review:** All documentation reviewed before publication
3. **User Testing:** Validate documentation with actual users
4. **Continuous Improvement:** Regular feedback collection and template updates

### **Accessibility Guidelines**

#### **Visual Accessibility**
```markdown
# Color contrast requirements
- Text contrast ratio: minimum 4.5:1
- Large text contrast ratio: minimum 3:1
- Interactive elements: minimum 3:1

# Image accessibility
- All images must have descriptive alt text
- Complex diagrams need detailed descriptions
- Decorative images: alt="" (empty alt text)

# Example:
![Smart Slides generation workflow showing 4 steps: analyze, layout, style, generate](workflow-diagram.png)
```

#### **Navigation Accessibility**
- **Heading Hierarchy:** Logical H1 → H2 → H3 → H4 structure
- **Skip Links:** Provide skip-to-content links for long documents
- **Keyboard Navigation:** All interactive elements must be keyboard accessible
- **Screen Reader Testing:** Test with screen readers periodically

#### **Content Accessibility**
```markdown
# ✅ GOOD: Clear, descriptive link text
[Configure your API settings](docs/api-setup.md)

# ❌ BAD: Generic link text
[Click here](docs/api-setup.md) for API setup

# ✅ GOOD: Descriptive error message
Error: API key must be 32 characters long and contain only alphanumeric characters

# ❌ BAD: Vague error message
Error: Invalid input
```

---

## 📊 **Quality Metrics & Monitoring**

### **Documentation Health Dashboard**
```bash
# Weekly documentation health check
npm run docs:health-check

# Metrics tracked:
# - Link validation (broken links)
# - Image validation (missing images)
# - Code example testing (outdated examples)
# - Version consistency (outdated version references)
# - Accessibility compliance (missing alt text, heading issues)
```

### **User Feedback Integration**
```markdown
<!-- Add to bottom of each document -->
## 📝 Feedback

Was this documentation helpful?
- 👍 [Yes, this was helpful](link-to-positive-feedback)
- 👎 [No, needs improvement](link-to-improvement-suggestions)
- 💡 [I have suggestions](link-to-suggestions-form)

**Most common feedback:** [Updated monthly based on user input]
```

### **Documentation Analytics**
- **Page Views:** Track most/least accessed documentation
- **User Journey:** Understand common documentation paths
- **Search Queries:** What users are looking for but can't find
- **Exit Points:** Where users leave without finding answers

---

**Last Updated:** 2025-08-14
**Owner:** Documentation Team & Tech Writers  
**Review Frequency:** Quarterly (or when major template changes needed)
**Next Review:** 2025-11-14
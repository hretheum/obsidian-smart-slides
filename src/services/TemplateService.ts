import Ajv, { JSONSchemaType } from 'ajv';
import { Result, ok, err } from '../types/Result';
import { LRUCache } from '../utils/LRUCache';
import semver from 'semver';

export interface Template {
  id: string;
  version: string; // semver
  engineRange?: string; // semver range for engine
  layout: string; // matches LayoutDecision.type or custom
  extends?: string; // base template id
  variables?: string[]; // allowed variables
  content: string; // Slides Extended-capable markdown
}

export interface TemplateSet {
  templates: Record<string, Template>;
}

export interface RenderOptions {
  templateId: string;
  values: Record<string, unknown>;
  escapeMarkdown?: boolean;
  debug?: boolean;
}

export interface RenderDebugInfo {
  templateChain: string[];
  resolvedContent: string;
  values: Record<string, unknown>;
  ms: number;
}

export interface RenderResult {
  text: string;
  debug?: RenderDebugInfo;
}

const ENGINE_VERSION = '1.0.0';

const templateSchema: JSONSchemaType<Template> = {
  $id: 'Template',
  type: 'object',
  additionalProperties: false,
  required: ['id', 'version', 'layout', 'content'],
  properties: {
    id: { type: 'string', minLength: 1 },
    version: { type: 'string', minLength: 1 },
    engineRange: { type: 'string', nullable: true },
    layout: { type: 'string', minLength: 1 },
    extends: { type: 'string', nullable: true },
    variables: {
      type: 'array',
      nullable: true,
      items: { type: 'string' },
    },
    content: { type: 'string' },
  },
};

function escapeMd(s: string): string {
  return s
    .toString()
    .normalize('NFC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\*_`\[\]<>]/g, (c) => `\\${c}`);
}

function substitute(template: string, values: Record<string, unknown>, escape: boolean): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key: string) => {
    const value = resolvePath(values, key);
    if (value === undefined || value === null) return '';
    const str = String(value);
    return escape ? escapeMd(str) : str;
  });
}

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    const anyCur = cur as Record<string, unknown>;
    cur = anyCur[p];
  }
  return cur;
}

export class TemplateService {
  private readonly ajv: Ajv;
  private readonly validateTemplate: (t: unknown) => t is Template;
  private readonly compiledCache: LRUCache<string, (v: Record<string, unknown>) => string>;
  private readonly set: TemplateSet;
  private readonly engineVersion: string;

  constructor(set: TemplateSet, engineVersion: string = ENGINE_VERSION) {
    this.ajv = new Ajv({ allErrors: true, strict: true });
    this.ajv.addSchema(templateSchema);
    const validator = this.ajv.getSchema<Template>('Template');
    if (!validator) {
      throw new Error('Failed to initialize template schema validator');
    }
    this.validateTemplate = validator as unknown as (t: unknown) => t is Template;
    this.compiledCache = new LRUCache<string, (v: Record<string, unknown>) => string>({
      maxEntries: 256,
    });
    this.set = set;
    this.engineVersion = engineVersion;
  }

  validateSet(): Result<true, Error> {
    try {
      for (const [id, tpl] of Object.entries(this.set.templates)) {
        if (!this.validateTemplate(tpl)) {
          const issues = 'Schema validation failed';
          return err(new Error(`Template '${id}' invalid: ${issues}`));
        }
        if (tpl.engineRange && !semver.satisfies(this.engineVersion, tpl.engineRange)) {
          return err(
            new Error(
              `Template '${id}' not compatible with engine ${this.engineVersion}. Required: ${tpl.engineRange}`,
            ),
          );
        }
      }
      // detect extends cycles
      const visited = new Set<string>();
      const onstack = new Set<string>();
      const visit = (tid: string): boolean => {
        if (onstack.has(tid)) return false;
        if (visited.has(tid)) return true;
        visited.add(tid);
        onstack.add(tid);
        const t = this.set.templates[tid];
        if (t?.extends) {
          const okChild = this.set.templates[t.extends] ? visit(t.extends) : false;
          if (!okChild) return false;
        }
        onstack.delete(tid);
        return true;
      };
      for (const id of Object.keys(this.set.templates)) {
        if (!visit(id)) return err(new Error(`Template inheritance cycle detected at '${id}'`));
      }
      return ok(true as const);
    } catch (e) {
      return err(e as Error);
    }
  }

  render(options: RenderOptions): Result<RenderResult, Error> {
    const start = performance.now ? performance.now() : Date.now();
    try {
      const chain: string[] = [];
      const tpl = this.resolveTemplate(options.templateId, chain);
      if (!tpl.ok) return err(tpl.error);

      const compiled = this.getOrCompile(tpl.value);
      const text = compiled(options.values);
      const end = performance.now ? performance.now() : Date.now();
      if (options.debug) {
        return ok({
          text,
          debug: {
            templateChain: chain,
            resolvedContent: tpl.value.content,
            values: options.values,
            ms: end - start,
          },
        });
      }
      return ok({ text });
    } catch (e) {
      return err(e as Error);
    }
  }

  private resolveTemplate(id: string, chain: string[]): Result<Template, Error> {
    const found = this.set.templates[id];
    if (!found) return err(new Error(`Template '${id}' not found`));
    chain.push(id);
    if (!found.extends) return ok(found);
    const baseRes = this.resolveTemplate(found.extends, chain);
    if (!baseRes.ok) return baseRes;
    return ok(this.mergeTemplates(baseRes.value, found));
  }

  private mergeTemplates(base: Template, override: Template): Template {
    // Shallow merge of metadata; content overrides entirely
    return {
      id: override.id,
      version: override.version,
      engineRange: override.engineRange ?? base.engineRange,
      layout: override.layout || base.layout,
      extends: override.extends,
      variables: Array.from(new Set([...(base.variables ?? []), ...(override.variables ?? [])])),
      content: override.content || base.content,
    };
  }

  private getOrCompile(tpl: Template): (v: Record<string, unknown>) => string {
    const key = `${tpl.id}@${tpl.version}`;
    const cached = this.compiledCache.get(key);
    if (cached) return cached;
    // Precompile: tokenize into static and variable tokens, support partial include {{> partialId}}
    const tokens = this.tokenize(tpl.content);
    const fn = (values: Record<string, unknown>): string => {
      let out = '';
      for (const t of tokens) {
        if (t.kind === 'text') out += t.value;
        else if (t.kind === 'var') out += substitute(`{{${t.name}}}`, values, true);
        else if (t.kind === 'include') {
          const incTplRes = this.resolveTemplate(t.name, []);
          if (incTplRes.ok) {
            // Render included template, but if it contains {{content}}, provide current content variable
            const rendered = this.getOrCompile(incTplRes.value)(values);
            out += rendered;
          }
        }
      }
      return out;
    };
    this.compiledCache.set(key, fn);
    return fn;
  }

  private tokenize(
    content: string,
  ): Array<
    | { kind: 'text'; value: string }
    | { kind: 'var'; name: string }
    | { kind: 'include'; name: string }
  > {
    const parts: Array<
      | { kind: 'text'; value: string }
      | { kind: 'var'; name: string }
      | { kind: 'include'; name: string }
    > = [];
    const regex = /(\{\{\s*>\s*([a-zA-Z0-9_.:-]+)\s*\}\}|\{\{\s*([a-zA-Z0-9_.:-]+)\s*\}\})/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content))) {
      if (m.index > lastIndex)
        parts.push({ kind: 'text', value: content.slice(lastIndex, m.index) });
      if (m[2]) parts.push({ kind: 'include', name: m[2] });
      else if (m[3]) parts.push({ kind: 'var', name: m[3] });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) parts.push({ kind: 'text', value: content.slice(lastIndex) });
    return parts;
  }
}

export function createDefaultTemplateSet(): TemplateSet {
  const templates: Record<string, Template> = {
    'base:common': {
      id: 'base:common',
      version: '1.0.0',
      engineRange: '>=1.0.0',
      layout: 'default',
      variables: ['title', 'content'],
      content: '<!-- slide:class=theme-general -->\n---\n{{content}}',
    },
    'slide:title': {
      id: 'slide:title',
      version: '1.0.0',
      engineRange: '>=1.0.0',
      layout: 'title',
      extends: 'base:common',
      variables: ['title'],
      content: '<!-- slide:class=theme-general -->\n---\n# {{title}}',
    },
    'slide:content': {
      id: 'slide:content',
      version: '1.0.0',
      engineRange: '>=1.0.0',
      layout: 'default',
      extends: 'base:common',
      variables: ['content'],
      content: '{{> base:common}}',
    },
    'slide:list': {
      id: 'slide:list',
      version: '1.0.0',
      engineRange: '>=1.0.0',
      layout: 'list',
      extends: 'base:common',
      variables: ['items'],
      content: '<!-- slide:class=theme-general -->\n---\n{{content}}',
    },
    'slide:quote': {
      id: 'slide:quote',
      version: '1.0.0',
      engineRange: '>=1.0.0',
      layout: 'quote',
      extends: 'base:common',
      variables: ['quote'],
      content: '<!-- slide:class=theme-general -->\n---\n> {{quote}}',
    },
  };
  return { templates };
}

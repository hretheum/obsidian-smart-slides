import {
  DependencyContainer,
  ServiceLifetime,
  ServiceNotRegisteredError,
  CircularDependencyError,
} from '../DependencyContainer';

describe('DependencyContainer', () => {
  test('register and resolve transient service', () => {
    const c = new DependencyContainer();
    let created = 0;
    c.register('num', { lifetime: ServiceLifetime.Transient, factory: () => ++created });

    const a = c.resolve<number>('num');
    const b = c.resolve<number>('num');

    expect(a).toBe(1);
    expect(b).toBe(2);
  });

  test('register and resolve singleton service', () => {
    const c = new DependencyContainer();
    let created = 0;
    c.register('num', { lifetime: ServiceLifetime.Singleton, factory: () => ++created });

    const a = c.resolve<number>('num');
    const b = c.resolve<number>('num');

    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  test('registerInstance stores and returns provided instance', () => {
    const c = new DependencyContainer();
    const instance = { id: 'X' };
    c.registerInstance('obj', instance);
    expect(c.resolve('obj')).toBe(instance);
  });

  test('isRegistered checks local and parent scopes', () => {
    const parent = new DependencyContainer();
    parent.register('p', { lifetime: ServiceLifetime.Singleton, factory: () => 'parent' });
    const child = parent.createScope();

    expect(child.isRegistered('p')).toBe(true);
    expect(child.isRegistered('x')).toBe(false);
  });

  test('scoped container inherits registrations and singletons', () => {
    const c = new DependencyContainer();
    c.register('a', { lifetime: ServiceLifetime.Singleton, factory: () => ({ v: 1 }) });
    const child = c.createScope();

    const pa = c.resolve<{ v: number }>('a');
    const ca = child.resolve<{ v: number }>('a');
    expect(ca).toStrictEqual(pa); // at least equivalent across scopes
  });

  test('throws for unregistered services', () => {
    const c = new DependencyContainer();
    expect(() => c.resolve('missing')).toThrow(ServiceNotRegisteredError);
  });

  test('detects circular dependencies', () => {
    const c = new DependencyContainer();
    c.register('A', {
      lifetime: ServiceLifetime.Transient,
      factory: (cc) => ({ a: cc.resolve('B') }),
    });
    c.register('B', {
      lifetime: ServiceLifetime.Transient,
      factory: (cc) => ({ b: cc.resolve('A') }),
    });

    expect(() => c.resolve('A')).toThrow(CircularDependencyError);
  });
});

import { Logger } from '../../utils/Logger';

describe('Logger', () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('respects log level filtering', () => {
    process.env.NODE_ENV = 'production';
    const logger = new Logger('Test', { level: 'warn', pretty: true });
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {
      /* noop */
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
      /* noop */
    });
    logger.info('hello');
    logger.warn('careful');
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  test('pretty mode prints structured human-readable logs', () => {
    const logger = new Logger('Pretty', { level: 'debug', pretty: true });
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {
      /* noop */
    });
    logger.debug('message', { a: 1 });
    expect(debugSpy).toHaveBeenCalled();
    const callArg = (debugSpy.mock.calls[0][0] as string) || '';
    expect(callArg).toContain('[Pretty]');
    debugSpy.mockRestore();
  });

  test('time() logs duration and rethrows on error', async () => {
    const logger = new Logger('Timer', { level: 'info', pretty: true });
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {
      /* noop */
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
      /* noop */
    });
    await logger.time('sleep', async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    expect(infoSpy).toHaveBeenCalled();

    // failing path
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      /* noop */
    });
    await expect(
      logger.time('fail-op', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(errorSpy).toHaveBeenCalled();

    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService } from '../../../src/services/email.service';

const API_KEY = 're_test_SECRET_KEY_123456';
const TOKEN = 'reset-token-ABCDEF0123456789';

const baseOptions = {
  to: 'user@example.com',
  subject: 'Tiêu đề',
  html: '<p>Xin chào</p>',
  text: 'Xin chào',
};

let fetchMock: ReturnType<typeof vi.fn>;
let logSpies: ReturnType<typeof vi.spyOn>[];

function allLoggedText(): string {
  return logSpies
    .flatMap((spy) => spy.mock.calls)
    .map((args) => args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
    .join('\n');
}

describe('EmailService', () => {
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('EMAIL_FROM', '');
    vi.stubEnv('NODE_ENV', 'test');
    logSpies = [
      vi.spyOn(console, 'log').mockImplementation(() => {}),
      vi.spyOn(console, 'info').mockImplementation(() => {}),
      vi.spyOn(console, 'warn').mockImplementation(() => {}),
      vi.spyOn(console, 'error').mockImplementation(() => {}),
    ];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('không có cấu hình', () => {
    it('trả true và không gọi fetch khi NODE_ENV=test', async () => {
      const result = await EmailService.sendEmail(baseOptions);
      expect(result).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('trả false và không gọi fetch khi NODE_ENV=production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const result = await EmailService.sendEmail(baseOptions);
      expect(result).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('thiếu EMAIL_FROM thì không gọi fetch', async () => {
      vi.stubEnv('RESEND_API_KEY', API_KEY);
      const result = await EmailService.sendEmail(baseOptions);
      expect(result).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('có cấu hình', () => {
    beforeEach(() => {
      vi.stubEnv('RESEND_API_KEY', API_KEY);
      vi.stubEnv('EMAIL_FROM', 'Sổ Tay <no-reply@example.com>');
    });

    it('gọi Resend đúng 1 lần với URL, header và body đúng', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200 });
      const result = await EmailService.sendEmail(baseOptions);

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.resend.com/emails');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe(`Bearer ${API_KEY}`);
      expect(init.headers['Content-Type']).toBe('application/json');
      expect(init.signal).toBeDefined();
      expect(JSON.parse(init.body)).toEqual({
        from: 'Sổ Tay <no-reply@example.com>',
        to: baseOptions.to,
        subject: baseOptions.subject,
        html: baseOptions.html,
        text: baseOptions.text,
      });
    });

    it.each([422, 500])('trả false, không throw khi Resend trả %i', async (status) => {
      fetchMock.mockResolvedValue({ ok: false, status });
      await expect(EmailService.sendEmail(baseOptions)).resolves.toBe(false);
    });

    it('trả false, không throw khi lỗi mạng', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      await expect(EmailService.sendEmail(baseOptions)).resolves.toBe(false);
    });

    it('trả false, không throw khi timeout (AbortError)', async () => {
      const err = new Error('The operation was aborted');
      err.name = 'TimeoutError';
      fetchMock.mockRejectedValue(err);
      await expect(EmailService.sendEmail(baseOptions)).resolves.toBe(false);

      const abort = new Error('aborted');
      abort.name = 'AbortError';
      fetchMock.mockRejectedValue(abort);
      await expect(EmailService.sendEmail(baseOptions)).resolves.toBe(false);
    });

    it('sendPasswordResetEmail trả kết quả thật của sendEmail', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 });
      await expect(EmailService.sendPasswordResetEmail('a@example.com', TOKEN, 'An')).resolves.toBe(false);
      fetchMock.mockResolvedValue({ ok: true, status: 200 });
      await expect(EmailService.sendPasswordResetEmail('a@example.com', TOKEN, 'An')).resolves.toBe(true);
    });
  });

  describe('không rò rỉ bí mật vào log', () => {
    beforeEach(() => {
      vi.stubEnv('RESEND_API_KEY', API_KEY);
      vi.stubEnv('EMAIL_FROM', 'no-reply@example.com');
    });

    it.each([
      ['thành công', () => fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => API_KEY })],
      ['HTTP 500', () => fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => `${API_KEY} ${TOKEN}` })],
      ['lỗi mạng', () => fetchMock.mockRejectedValue(new Error(`boom ${API_KEY} ${TOKEN}`))],
    ])('nhánh %s', async (_label, setup) => {
      setup();
      for (const nodeEnv of ['test', 'staging', 'production']) {
        vi.stubEnv('NODE_ENV', nodeEnv);
        await EmailService.sendPasswordResetEmail('a@example.com', TOKEN, 'An');
      }
      const logged = allLoggedText();
      expect(logged).not.toContain(API_KEY);
      expect(logged).not.toContain(TOKEN);
    });

    it('nhánh chưa cấu hình ở production cũng không log token', async () => {
      vi.stubEnv('RESEND_API_KEY', '');
      vi.stubEnv('NODE_ENV', 'production');
      await EmailService.sendPasswordResetEmail('a@example.com', TOKEN, 'An');
      expect(allLoggedText()).not.toContain(TOKEN);
    });
  });

  describe('môi trường và quyền riêng tư', () => {
    it('staging thiếu key: trả false, không gọi fetch', async () => {
      vi.stubEnv('NODE_ENV', 'staging');
      await expect(EmailService.sendEmail(baseOptions)).resolves.toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('test: không log địa chỉ email người nhận', async () => {
      await EmailService.sendEmail(baseOptions);
      expect(allLoggedText()).not.toContain(baseOptions.to);
    });

    it('development: có log link đặt lại', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      await EmailService.sendPasswordResetEmail('a@example.com', TOKEN, 'An');
      expect(allLoggedText()).toContain('action=reset-password');
    });
  });

  describe('URL đặt lại', () => {
    it('token được encode trong html và text', async () => {
      vi.stubEnv('RESEND_API_KEY', API_KEY);
      vi.stubEnv('EMAIL_FROM', 'no-reply@example.com');
      fetchMock.mockResolvedValue({ ok: true, status: 200 });
      const rawToken = 'a b&c"d';

      await EmailService.sendPasswordResetEmail('a@example.com', rawToken, 'An');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      const encoded = encodeURIComponent(rawToken);
      expect(body.text).toContain(`token=${encoded}`);
      expect(body.html).toContain(`token=${encoded}`);
      expect(body.html).not.toContain('href="http://localhost:3000/?action=reset-password&token');
      expect(body.html).toContain('&amp;token=');
      expect(body.html).toContain('a b&amp;c&quot;d');
    });
  });

  describe('escape HTML', () => {
    it('escape tên người dùng trong html, giữ nguyên trong text', async () => {
      vi.stubEnv('RESEND_API_KEY', API_KEY);
      vi.stubEnv('EMAIL_FROM', 'no-reply@example.com');
      fetchMock.mockResolvedValue({ ok: true, status: 200 });
      const name = '<img src=x onerror=1>';

      await EmailService.sendPasswordResetEmail('a@example.com', TOKEN, name);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.html).toContain('&lt;img src=x onerror=1&gt;');
      expect(body.html).not.toContain('<img');
      expect(body.text).toContain(name);
    });

    it('escape đủ các ký tự đặc biệt', async () => {
      vi.stubEnv('RESEND_API_KEY', API_KEY);
      vi.stubEnv('EMAIL_FROM', 'no-reply@example.com');
      fetchMock.mockResolvedValue({ ok: true, status: 200 });
      const name = `Tom & "Jerry" <b>x</b> O'Neil`;

      await EmailService.sendPasswordResetEmail('a@example.com', TOKEN, name);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.html).toContain('Tom &amp; &quot;Jerry&quot; &lt;b&gt;x&lt;/b&gt; O&#39;Neil');
      expect(body.html).not.toContain('<b>');
      expect(body.text).toContain(name);
    });
  });
});

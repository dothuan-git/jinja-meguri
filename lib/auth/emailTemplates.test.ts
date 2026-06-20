import { describe, it, expect } from "vitest";
import { renderMagicLinkEmail, renderOtpEmail } from "./emailTemplates";

const BRAND_MARKS = ["Jinja Meguri", "神社巡り", "神"];

describe("renderMagicLinkEmail", () => {
  const url = "https://example.com/verify?token=abc123";

  for (const linkType of ["email-verification", "sign-in", "forget-password"] as const) {
    it(`${linkType}: returns non-empty subject and HTML containing the URL and brand`, () => {
      const { subject, html } = renderMagicLinkEmail(linkType, url);
      expect(subject.length).toBeGreaterThan(0);
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain(url);
      for (const mark of BRAND_MARKS) {
        expect(html).toContain(mark);
      }
    });
  }

  it("email-verification: subject mentions verify", () => {
    const { subject } = renderMagicLinkEmail("email-verification", url);
    expect(subject.toLowerCase()).toMatch(/verify/);
  });

  it("forget-password: subject mentions password reset", () => {
    const { subject } = renderMagicLinkEmail("forget-password", url);
    expect(subject.toLowerCase()).toMatch(/password/);
  });
});

describe("renderOtpEmail", () => {
  const code = "847291";

  for (const otpType of ["email-verification", "sign-in", "forget-password"] as const) {
    it(`${otpType}: returns non-empty subject and HTML containing the code and brand`, () => {
      const { subject, html } = renderOtpEmail(otpType, code);
      expect(subject.length).toBeGreaterThan(0);
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain(code);
      for (const mark of BRAND_MARKS) {
        expect(html).toContain(mark);
      }
    });
  }

  it("includes security note about not sharing the code", () => {
    const { html } = renderOtpEmail("sign-in", code);
    expect(html.toLowerCase()).toContain("share");
  });
});

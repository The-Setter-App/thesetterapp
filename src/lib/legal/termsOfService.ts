import { SUPPORT_EMAIL } from "./contact";
import { type LegalDocument, list, paragraph } from "./types";

export const termsOfService: LegalDocument = {
  title: "Terms of Service",
  intro: [
    paragraph(
      "These Terms of Service (“Terms”) govern your access to and use of the services provided by Setter Holdings LLC (“Setter,” “we,” “our,” or “us”), a limited liability company organized under the laws of the State of Wyoming, United States. By accessing or using Setter’s services, you agree to be bound by these Terms.",
    ),
  ],
  sections: [
    {
      heading: "Eligibility",
      blocks: [
        paragraph(
          "You must be at least 18 years old to use the Services. You may use Setter as an individual or on behalf of a business or team. By using Setter, you represent and warrant that you have the full legal authority to enter into these Terms on your own behalf or on behalf of the entity you represent.",
        ),
      ],
    },
    {
      heading: "Services",
      blocks: [
        paragraph(
          "Setter provides a customer relationship management (CRM) and AI platform designed to help coaches, consultants, agency owners, and teams:",
        ),
        list(
          "Manage direct messages across supported platforms, including integrations with Slack, Calendly, Facebook, and Instagram.",
          "Track leads, conversations, and bookings.",
          "Integrate with third-party services (such as payment processors and analytics providers).",
        ),
        paragraph(
          "Setter continuously evolves and may introduce, modify, or discontinue features, integrations, or services at any time.",
        ),
      ],
    },
    {
      heading: "Subscriptions, Payments & Refunds",
      blocks: [
        list(
          "Setter is provided on a subscription basis, billed through Stripe or other approved payment providers.",
          "Fees are due in advance of each subscription period.",
          "All payments are final and non-refundable. Setter does not offer refunds, credits, or prorated refunds for any reason, including partial use, dissatisfaction, or cancellation of the subscription.",
          "You are responsible for ensuring all payments are valid, authorized, and free from fraudulent activity.",
        ),
      ],
    },
    {
      heading: "Acceptable Use",
      blocks: [
        paragraph(
          "You agree not to use Setter in any way that violates applicable laws, platform policies (including those of Slack, Calendly, Facebook, and Instagram), or these Terms. This includes, but is not limited to:",
        ),
        list(
          "No spam, unsolicited communications, or bulk messaging in violation of platform rules.",
          "No abusive, threatening, harassing, defamatory, or discriminatory content.",
          "No sexually explicit, hateful, violent, or illegal material.",
          "No deceptive, misleading, or fraudulent offers or practices.",
          "No misuse of integrations or APIs for unauthorized purposes.",
          "No impersonation without proper authorization. If using voice cloning, content reproduction, or AI-generated features, you must have all necessary rights, consents, and permissions from the relevant individuals.",
        ),
        paragraph(
          "Setter reserves the right to suspend or terminate any account found in violation of these obligations, without refund.",
        ),
      ],
    },
    {
      heading: "User Responsibilities",
      blocks: [
        paragraph(
          "You are solely responsible for ensuring your use of Setter complies with all applicable laws and third-party platform policies. You bear full responsibility for the outcomes of your business activities, including (but not limited to) conversion rates, revenue generation, lead quality, or any other results. Setter provides tools only and makes no guarantees or warranties regarding specific business outcomes.",
        ),
      ],
    },
    {
      heading: "Third-Party Services",
      blocks: [
        paragraph(
          "Setter may integrate with third-party platforms and services, including Slack, Calendly, Facebook, Instagram, Stripe, and others. We are not responsible or liable for any interruptions, errors, failures, data issues, or changes in third-party services. Your use of any third-party services is governed by their own terms, policies, and conditions.",
        ),
      ],
    },
    {
      heading: "Availability & Service Interruptions",
      blocks: [
        paragraph(
          "We strive to provide reliable and continuous access to Setter but do not guarantee 100% uptime or error-free performance. Setter is not liable for any downtime, data loss, delays, or errors resulting from internet connectivity issues, hosting providers, third-party services, or force majeure events.",
        ),
      ],
    },
    {
      heading: "Termination & Suspension",
      blocks: [
        paragraph(
          "We reserve the right to suspend or terminate your access to Setter at our sole discretion, without notice or refund, if:",
        ),
        list(
          "You violate these Terms or any applicable laws/policies.",
          "You engage in unlawful, harmful, abusive, or fraudulent conduct.",
          "You fail to pay subscription fees when due.",
        ),
        paragraph(
          "Upon termination, your access will cease immediately, and we may delete or retain your data in accordance with our data retention practices.",
        ),
      ],
    },
    {
      heading: "Limitation of Liability",
      blocks: [
        paragraph(
          "Setter is provided on an “as is” and “as available” basis, without warranties of any kind. To the fullest extent permitted by law, Setter disclaims all liability for indirect, incidental, special, consequential, or punitive damages, including (but not limited to) lost profits, business interruption, loss of data, or loss of goodwill. In no event shall Setter’s total aggregate liability under these Terms exceed the total fees paid by you to Setter in the twelve (12) months immediately preceding the claim.",
        ),
      ],
    },
    {
      heading: "Governing Law & Dispute Resolution",
      blocks: [
        paragraph(
          "These Terms are governed by and construed in accordance with the laws of the State of Wyoming, United States, without regard to its conflict of laws principles. Any disputes arising out of or relating to these Terms shall be resolved exclusively in the state or federal courts located in Wyoming. You hereby submit to the personal jurisdiction of such courts and waive any objection to venue or inconvenience of forum.",
        ),
      ],
    },
    {
      heading: "Changes to Terms",
      blocks: [
        paragraph(
          "We may update these Terms from time to time. If changes are material, we will provide notice through the Services or by email. Your continued use of Setter after such changes constitutes acceptance of the updated Terms.",
        ),
      ],
    },
    {
      heading: "Contact",
      blocks: [
        paragraph(
          "For any questions regarding these Terms, contact us at: ",
          { email: SUPPORT_EMAIL },
          ".",
        ),
      ],
    },
  ],
  footer: [
    "Setter Holdings LLC",
    "© 2026 Setter Holdings LLC. All rights reserved.",
  ],
};

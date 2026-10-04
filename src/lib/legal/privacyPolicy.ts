import { SUPPORT_EMAIL } from "./contact";
import { type LegalDocument, list, paragraph, subheading } from "./types";

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  intro: [],
  sections: [
    {
      heading: "Information We Collect",
      blocks: [
        paragraph(
          "We collect information to provide a better experience and improve our Services. The types of data we collect include:",
        ),
        subheading("a. Information You Provide"),
        list(
          {
            label: "Account Information",
            text: "Name, email address, company name, password, and other details provided during sign-up.",
          },
          {
            label: "Billing Information",
            text: "Payment details such as credit card numbers and billing addresses, processed securely via our payment partners.",
          },
          {
            label: "Communications",
            text: "When you contact us or use chat/support, we may collect your message content and contact details.",
          },
          {
            label: "Uploaded Content",
            text: "Files, documents, or other data you upload while using Setter.",
          },
        ),
        subheading("b. Information We Automatically Collect"),
        list(
          {
            label: "Usage Data",
            text: "How you use our app — features accessed, time spent, and pages visited.",
          },
          {
            label: "Device Information",
            text: "Browser type, IP address, operating system, and device identifiers.",
          },
          {
            label: "Cookies & Tracking",
            text: "We use cookies, web beacons, and analytics tools (like Google Analytics) to understand user behavior and improve our platform.",
          },
        ),
        subheading("c. Information From Third Parties"),
        paragraph(
          "We may receive limited data from integrations (e.g., Slack, Notion, or Trello) that you connect to Setter, as well as from payment processors and analytics providers.",
        ),
      ],
    },
    {
      heading: "How We Use Your Information",
      blocks: [
        paragraph("We use collected information to:"),
        list(
          "Provide, operate, and maintain our Services.",
          "Improve performance, reliability, and user experience.",
          "Process payments and send invoices.",
          "Respond to support requests and inquiries.",
          "Send product updates, promotional offers, and security alerts.",
          "Analyze usage trends and product performance.",
          "Comply with legal obligations and enforce our Terms of Service.",
        ),
      ],
    },
    {
      heading: "How We Share Your Information",
      blocks: [
        paragraph("We do not sell or rent your personal information."),
        paragraph("We may share information only in these limited cases:"),
        list(
          {
            label: "Service Providers",
            text: "With trusted vendors who help us operate (e.g., hosting, analytics, payment processing).",
          },
          {
            label: "Legal Compliance",
            text: "When required by law, regulation, or government request.",
          },
          {
            label: "Business Transfers",
            text: "In case of a merger, acquisition, or sale of assets, user data may be part of the transaction.",
          },
          {
            label: "Your Consent",
            text: "When you explicitly authorize us to share your information.",
          },
        ),
        paragraph(
          "All third parties are required to protect your data and use it only for the intended purpose.",
        ),
      ],
    },
    {
      heading: "Data Retention",
      blocks: [
        paragraph(
          "We retain your information for as long as your account is active or as needed to provide our Services.",
        ),
        paragraph(
          "You may request deletion of your account or data at any time by contacting ",
          { email: SUPPORT_EMAIL },
          ".",
        ),
        paragraph(
          "We may retain limited information to comply with legal obligations, resolve disputes, and enforce agreements.",
        ),
      ],
    },
    {
      heading: "Data Security",
      blocks: [
        paragraph(
          "We implement industry-standard security measures to protect your data, including:",
        ),
        list(
          "Encryption (HTTPS/TLS) for all transmitted data.",
          "Secure data centers and backup systems.",
          "Access controls and authentication mechanisms.",
        ),
        paragraph(
          "While we work hard to safeguard your data, no online system is completely secure. You share information at your own risk.",
        ),
      ],
    },
    {
      heading: "Your Rights and Choices",
      blocks: [
        paragraph(
          "Depending on your location, you may have the following rights:",
        ),
        list(
          "Access and obtain a copy of your data.",
          "Request correction or deletion of your personal information.",
          "Object to or restrict processing of your data.",
          "Withdraw consent to marketing communications.",
        ),
        paragraph(
          "To exercise these rights, contact us at ",
          { email: SUPPORT_EMAIL },
          ".",
        ),
        paragraph("We’ll respond within a reasonable timeframe."),
      ],
    },
    {
      heading: "Cookies and Tracking Technologies",
      blocks: [
        paragraph("We use cookies and similar technologies to:"),
        list(
          "Keep you signed in.",
          "Analyze platform usage and performance.",
          "Remember preferences and improve personalization.",
        ),
        paragraph(
          "You can manage or disable cookies through your browser settings, but some features may not function properly.",
        ),
      ],
    },
    {
      heading: "Third-Party Services",
      blocks: [
        paragraph(
          "Setter may link to or integrate with third-party apps or websites.",
        ),
        paragraph(
          "We are not responsible for the privacy practices or content of those third parties.",
        ),
        paragraph(
          "Please review their privacy policies before using their services.",
        ),
      ],
    },
    {
      heading: "Children’s Privacy",
      blocks: [
        paragraph(
          "Our Services are not directed to children under 13 (or under 16 in some jurisdictions).",
        ),
        paragraph(
          "We do not knowingly collect personal data from minors. If we learn that we have, we’ll promptly delete it.",
        ),
      ],
    },
    {
      heading: "International Data Transfers",
      blocks: [
        paragraph(
          "If you access Setter from outside your country, your information may be transferred to and processed in other jurisdictions where our servers or service providers are located.",
        ),
        paragraph(
          "We ensure all transfers comply with applicable data protection laws.",
        ),
      ],
    },
    {
      heading: "Updates to This Policy",
      blocks: [
        paragraph(
          "We may update this Privacy Policy periodically to reflect new features, laws, or security updates.",
        ),
        paragraph(
          "The latest version will always be available on this page with the effective date updated above.",
        ),
      ],
    },
    {
      heading: "Contact Us",
      blocks: [
        paragraph(
          "If you have any questions or concerns about this Privacy Policy or how we handle your data, contact us at: ",
          { email: SUPPORT_EMAIL },
        ),
      ],
    },
  ],
  footer: [],
};
